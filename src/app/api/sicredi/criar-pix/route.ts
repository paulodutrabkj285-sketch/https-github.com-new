import { NextRequest, NextResponse } from "next/server";
import https from "https";
import axios from "axios";
import {
    atualizarPedido,
    buscarPedidoPorId,
} from "@/lib/pedidos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   UTILITÁRIOS
========================================================= */

function somenteDigitos(valor: any) {
    return String(valor || "").replace(/\D/g, "");
}

/* =========================================================
   CERTIFICADO SICREDI
========================================================= */

function criarHttpsAgent() {
    const certBase64 =
        process.env.SICREDI_CERT_BASE64;

    const keyBase64 =
        process.env.SICREDI_KEY_BASE64;

    if (!certBase64 || !keyBase64) {
        throw new Error(
            "Certificado Sicredi não configurado."
        );
    }

    return new https.Agent({
        cert: Buffer.from(
            certBase64,
            "base64"
        ).toString("utf8"),

        key: Buffer.from(
            keyBase64,
            "base64"
        ).toString("utf8"),

        rejectUnauthorized: true,
    });
}

/* =========================================================
   TOKEN SICREDI
========================================================= */

async function obterToken() {
    const baseUrl =
        process.env.SICREDI_BASE_URL;

    const clientId =
        process.env.SICREDI_CLIENT_ID;

    const clientSecret =
        process.env.SICREDI_CLIENT_SECRET;

    if (
        !baseUrl ||
        !clientId ||
        !clientSecret
    ) {
        throw new Error(
            "Credenciais Sicredi não configuradas."
        );
    }

    const response = await axios.post(
        `${baseUrl}/oauth/token`,

        new URLSearchParams({
            grant_type:
                "client_credentials",
        }).toString(),

        {
            httpsAgent:
                criarHttpsAgent(),

            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        `${clientId}:${clientSecret}`
                    ).toString(
                        "base64"
                    ),

                "Content-Type":
                    "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data
        .access_token as string;
}

/* =========================================================
   VALIDAR CPF
========================================================= */

function cpfValido(
    cpf: string
) {
    const numeros =
        somenteDigitos(cpf);

    if (
        numeros.length !== 11
    ) {
        return false;
    }

    if (
        /^(\d)\1{10}$/.test(
            numeros
        )
    ) {
        return false;
    }

    let soma = 0;

    for (
        let i = 0;
        i < 9;
        i++
    ) {
        soma +=
            Number(numeros[i]) *
            (10 - i);
    }

    let digito1 =
        11 - (soma % 11);

    if (
        digito1 >= 10
    ) {
        digito1 = 0;
    }

    if (
        digito1 !==
        Number(numeros[9])
    ) {
        return false;
    }

    soma = 0;

    for (
        let i = 0;
        i < 10;
        i++
    ) {
        soma +=
            Number(numeros[i]) *
            (11 - i);
    }

    let digito2 =
        11 - (soma % 11);

    if (
        digito2 >= 10
    ) {
        digito2 = 0;
    }

    return (
        digito2 ===
        Number(numeros[10])
    );
}

/* =========================================================
   NORMALIZAR CHAVE PIX
========================================================= */

function normalizarChavePix(
    chave: string
) {
    const chaveLimpa =
        String(
            chave || ""
        ).trim();

    if (
        chaveLimpa.includes("@")
    ) {
        return chaveLimpa
            .toLowerCase();
    }

    return chaveLimpa.replace(
        /\s/g,
        ""
    );
}

/* =========================================================
   CONSULTAR COBRANÇA EXISTENTE
========================================================= */

async function consultarCobranca(
    txid: string,
    token: string
) {
    const baseUrl =
        process.env
            .SICREDI_BASE_URL!;

    const response =
        await axios.get(
            `${baseUrl}/api/v2/cob/${txid}`,
            {
                httpsAgent:
                    criarHttpsAgent(),

                headers: {
                    Authorization:
                        `Bearer ${token}`,
                },
            }
        );

    return response.data;
}

/* =========================================================
   VERIFICAR VALIDADE DA COBRANÇA
========================================================= */

function cobrancaAindaValida(
    cobranca: any
) {
    const criacao =
        cobranca?.calendario
            ?.criacao;

    const expiracao =
        Number(
            cobranca
                ?.calendario
                ?.expiracao ||
            3600
        );

    if (!criacao) {
        return false;
    }

    const criadaEm =
        new Date(
            criacao
        ).getTime();

    if (
        !Number.isFinite(
            criadaEm
        )
    ) {
        return false;
    }

    const expiraEm =
        criadaEm +
        expiracao * 1000;

    return (
        Date.now() <
        expiraEm
    );
}

/* =========================================================
   CRIAR PIX
========================================================= */

export async function POST(
    req: NextRequest
) {
    try {
        console.log(
            "CRIAR PIX: início"
        );

        /* =================================================
           LER DADOS ENVIADOS PELO NAVEGADOR

           IMPORTANTE:
           o navegador NÃO define o valor da cobrança.
        ================================================= */

        const body =
            await req.json();

        const {
            pedidoId,
            nome,
            cpf,
            produto,
        } = body;

        /* =================================================
           VALIDAR ID DO PEDIDO
        ================================================= */

        if (!pedidoId) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Pedido não informado.",
                },
                {
                    status: 400,

                    headers: {
                        "Cache-Control":
                            "no-store",
                    },
                }
            );
        }

        /* =================================================
           BUSCAR PEDIDO DIRETAMENTE NO FIRESTORE

           O Firestore é a fonte oficial dos dados
           financeiros.
        ================================================= */

        const pedidoSalvo:
            any =
            await buscarPedidoPorId(
                pedidoId
            );

        if (!pedidoSalvo) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Pedido não encontrado.",
                },
                {
                    status: 404,

                    headers: {
                        "Cache-Control":
                            "no-store",
                    },
                }
            );
        }

        /* =================================================
           IMPEDIR COBRANÇA DUPLA

           Pedido pago nunca gera outro Pix.
        ================================================= */

        if (
            pedidoSalvo
                .statusPagamento ===
            "pago"
        ) {
            return NextResponse.json(
                {
                    ok: true,

                    pago: true,

                    status:
                        "CONCLUIDA",

                    mensagem:
                        "Este pedido já está pago.",

                    txid:
                        pedidoSalvo
                            .sicrediTxid ||
                        "",

                    pixCopiaCola:
                        pedidoSalvo
                            .sicrediPixCopiaCola ||
                        "",

                    location:
                        pedidoSalvo
                            .sicrediLocation ||
                        "",
                },
                {
                    headers: {
                        "Cache-Control":
                            "no-store",
                    },
                }
            );
        }

        /* =================================================
           TIPO DE DOCUMENTO

           O tipo é obtido do pedido salvo no Firestore.

           Brasileiro:
           tipoDocumento = "cpf"

           Estrangeiro:
           tipoDocumento = "estrangeiro"

           Pedidos antigos que ainda não possuem
           tipoDocumento continuam sendo tratados
           como pedidos brasileiros.
        ================================================= */

        const tipoDocumentoSalvo =
            String(
                pedidoSalvo
                    .tipoDocumento ||
                "cpf"
            )
                .trim()
                .toLowerCase();

        const ehEstrangeiro =
            tipoDocumentoSalvo ===
            "estrangeiro";

        const documentoSalvo =
            String(
                pedidoSalvo
                    .documento ||
                ""
            ).trim();

        /* =================================================
           NOME DO PAGADOR
        ================================================= */

        const nomeFinal =
            String(
                pedidoSalvo.nome ||
                nome ||
                "Cliente"
            ).trim();

        /* =================================================
           CPF DO PAGADOR

           Para brasileiros:
           usa o CPF salvo no pedido.

           cpf recebido do navegador fica apenas
           como compatibilidade para pedidos antigos.

           Para estrangeiro o CPF pode ficar vazio.
        ================================================= */

        const cpfFinal =
            somenteDigitos(
                pedidoSalvo.cpf ||
                cpf ||
                ""
            );

        /* =================================================
           VALOR DO PIX — PROTEÇÃO PRINCIPAL

           O valor vem EXCLUSIVAMENTE do pedido salvo
           no Firestore.

           NÃO existe fallback para valor enviado
           pela URL ou navegador.

           Portanto:

           ?valorTotal=1

           ou qualquer alteração no navegador
           NÃO modifica o valor da cobrança.
        ================================================= */

        const valorNumerico =
            Number(
                pedidoSalvo
                    .valorTotal ??
                0
            );

        /* =================================================
           VALIDAR VALOR DO FIRESTORE
        ================================================= */

        if (
            !Number.isFinite(
                valorNumerico
            ) ||
            valorNumerico <= 0
        ) {
            console.error(
                "PIX BLOQUEADO: valor inválido no pedido.",
                {
                    pedidoId,

                    valorPedido:
                        pedidoSalvo
                            .valorTotal ??
                        null,
                }
            );

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Valor do pedido inválido.",
                },
                {
                    status: 400,

                    headers: {
                        "Cache-Control":
                            "no-store",
                    },
                }
            );
        }

        /* =================================================
           FORMATAR VALOR PARA SICREDI
        ================================================= */

        const valorFinal =
            valorNumerico
                .toFixed(2);

        /* =================================================
           VALIDAR DOCUMENTO DO COMPRADOR

           BRASILEIRO:
           CPF obrigatório e validado.

           ESTRANGEIRO:
           CPF não é obrigatório.
           Passaporte/documento estrangeiro precisa
           estar salvo no pedido.
        ================================================= */

        if (
            ehEstrangeiro
        ) {
            if (
                !documentoSalvo
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "Documento estrangeiro não encontrado no pedido.",
                    },
                    {
                        status: 400,

                        headers: {
                            "Cache-Control":
                                "no-store",
                        },
                    }
                );
            }
        } else {
            if (
                !cpfValido(
                    cpfFinal
                )
            ) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "CPF inválido ou não encontrado no pedido.",
                    },
                    {
                        status: 400,

                        headers: {
                            "Cache-Control":
                                "no-store",
                        },
                    }
                );
            }
        }

        /* =================================================
           CONFIGURAÇÕES SICREDI
        ================================================= */

        const baseUrl =
            process.env
                .SICREDI_BASE_URL;

        const chavePix =
            normalizarChavePix(
                process.env
                    .SICREDI_PIX_KEY ||
                ""
            );

        if (
            !baseUrl ||
            !chavePix
        ) {
            throw new Error(
                "Variáveis Sicredi não configuradas."
            );
        }

        /* =================================================
           LOG SEGURO

           Não mostra:
           - certificado
           - chave privada
           - client secret
           - documento
        ================================================= */

        console.log(
            "PIX PEDIDO VALIDADO:",
            {
                pedidoId,

                valor:
                    valorFinal,

                statusPagamento:
                    pedidoSalvo
                        .statusPagamento ||
                    "pendente",

                tipoDocumento:
                    ehEstrangeiro
                        ? "estrangeiro"
                        : "cpf",
            }
        );

        /* =================================================
           OBTER TOKEN
        ================================================= */

        const token =
            await obterToken();

        /* =================================================
           REUTILIZAR PIX EXISTENTE

           Se já existe TXID, consultar primeiro.
        ================================================= */

        const txidExistente =
            String(
                pedidoSalvo
                    .sicrediTxid ||
                ""
            ).trim();

        if (
            txidExistente
        ) {
            try {
                const cobrancaExistente =
                    await consultarCobranca(
                        txidExistente,
                        token
                    );

                console.log(
                    "PIX EXISTENTE CONSULTADO:",
                    {
                        pedidoId,

                        txid:
                            txidExistente,

                        status:
                            cobrancaExistente
                                ?.status ||
                            "",
                    }
                );

                const pixCopiaCola =
                    cobrancaExistente
                        ?.pixCopiaECola ||
                    pedidoSalvo
                        .sicrediPixCopiaCola ||
                    "";

                const location =
                    cobrancaExistente
                        ?.location ||
                    pedidoSalvo
                        .sicrediLocation ||
                    "";

                /* =========================================
                   PIX JÁ CONCLUÍDO
                ========================================= */

                if (
                    cobrancaExistente
                        ?.status ===
                    "CONCLUIDA"
                ) {
                    return NextResponse.json(
                        {
                            ok: true,

                            pago: true,

                            txid:
                                txidExistente,

                            status:
                                "CONCLUIDA",

                            pixCopiaCola,

                            location,

                            mensagem:
                                "Pagamento já confirmado pelo Sicredi.",
                        },
                        {
                            headers: {
                                "Cache-Control":
                                    "no-store",
                            },
                        }
                    );
                }

                /* =========================================
                   PIX AINDA ATIVO

                   Reutiliza o mesmo Pix.
                ========================================= */

                if (
                    cobrancaExistente
                        ?.status ===
                    "ATIVA" &&
                    cobrancaAindaValida(
                        cobrancaExistente
                    )
                ) {
                    console.log(
                        "REUTILIZANDO PIX EXISTENTE:",
                        {
                            pedidoId,

                            txid:
                                txidExistente,
                        }
                    );

                    return NextResponse.json(
                        {
                            ok: true,

                            reutilizado:
                                true,

                            txid:
                                txidExistente,

                            status:
                                "ATIVA",

                            pixCopiaCola,

                            location,
                        },
                        {
                            headers: {
                                "Cache-Control":
                                    "no-store",
                            },
                        }
                    );
                }

                console.log(
                    "PIX ANTERIOR EXPIRADO OU NÃO REUTILIZÁVEL:",
                    {
                        pedidoId,

                        txid:
                            txidExistente,

                        status:
                            cobrancaExistente
                                ?.status ||
                            "",
                    }
                );
            } catch (
            erroConsulta: any
            ) {
                /*
                 * Se não foi possível consultar
                 * a cobrança anterior,
                 * registramos o erro.
                 */

                console.error(
                    "ERRO AO CONSULTAR PIX EXISTENTE:",
                    {
                        pedidoId,

                        txid:
                            txidExistente,

                        status:
                            erroConsulta
                                ?.response
                                ?.status ||
                            null,

                        erro:
                            erroConsulta
                                ?.response
                                ?.data ||
                            erroConsulta
                                ?.message,
                    }
                );
            }
        }

        /* =================================================
           CRIAR NOVA COBRANÇA

           VALOR:
           exclusivamente pedidoSalvo.valorTotal
        ================================================= */

        /*
         * BRASILEIRO:
         * envia devedor.cpf e devedor.nome.
         *
         * ESTRANGEIRO:
         * não envia o objeto devedor.
         *
         * Passaporte/documento estrangeiro
         * nunca é colocado no campo CPF.
         */

        const payload: any = {
            calendario: {
                expiracao: 3600,
            },

            valor: {
                original:
                    valorFinal,
            },

            chave:
                chavePix,

            solicitacaoPagador:
                String(
                    produto ||
                    pedidoSalvo
                        .produto ||
                    "Ingresso Parque Mundo Novo"
                ),
        };

        if (
            !ehEstrangeiro
        ) {
            payload.devedor = {
                cpf:
                    cpfFinal,

                nome:
                    nomeFinal,
            };
        }

        /* =================================================
           ENVIAR PARA SICREDI
        ================================================= */

        const response =
            await axios.post(
                `${baseUrl}/api/v2/cob`,

                payload,

                {
                    httpsAgent:
                        criarHttpsAgent(),

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json",
                    },
                }
            );

        const data =
            response.data;

        /* =================================================
           LOG SEGURO
        ================================================= */

        console.log(
            "NOVO PIX CRIADO:",
            {
                pedidoId,

                txid:
                    data?.txid ||
                    "",

                status:
                    data?.status ||
                    "",

                valor:
                    valorFinal,
            }
        );

        /* =================================================
           PIX COPIA E COLA
        ================================================= */

        const pixCopiaCola =
            data?.pixCopiaECola ||
            data?.brcode ||
            data?.pixCopiaCola ||
            data?.emv ||
            "";

        /* =================================================
           SALVAR DADOS DO PIX NO FIRESTORE
        ================================================= */

        await atualizarPedido(
            pedidoId,
            {
                statusPagamento:
                    "pendente",

                sicrediTxid:
                    data?.txid ||
                    "",

                sicrediStatus:
                    data?.status ||
                    "ATIVA",

                sicrediPixCopiaCola:
                    pixCopiaCola,

                sicrediLocation:
                    data?.location ||
                    "",

                sicrediPixCriadoEm:
                    new Date()
                        .toISOString(),
            }
        );

        /* =================================================
           RESPOSTA PARA CHECKOUT
        ================================================= */

        return NextResponse.json(
            {
                ok: true,

                reutilizado:
                    false,

                txid:
                    data?.txid ||
                    "",

                status:
                    data?.status ||
                    "",

                pixCopiaCola,

                location:
                    data?.location ||
                    "",
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (
    error: any
    ) {
        console.error(
            "ERRO SICREDI CRIAR PIX:",
            error?.response
                ?.data ||
            error?.message
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    "Erro ao criar Pix Sicredi.",

                details:
                    error?.response
                        ?.data ||
                    error?.message,
            },
            {
                status:
                    error?.response
                        ?.status ||
                    500,

                headers: {
                    "Cache-Control":
                        "no-store",
                },
            }
        );
    }
}