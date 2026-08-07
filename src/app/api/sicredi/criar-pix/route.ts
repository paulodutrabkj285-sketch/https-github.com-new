import { NextRequest, NextResponse } from "next/server";
import https from "https";
import axios from "axios";
import { atualizarPedido, buscarPedidoPorId } from "@/lib/pedidos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function somenteDigitos(valor: any) {
    return String(valor || "").replace(/\D/g, "");
}

function criarHttpsAgent() {
    const certBase64 = process.env.SICREDI_CERT_BASE64;
    const keyBase64 = process.env.SICREDI_KEY_BASE64;

    if (!certBase64 || !keyBase64) {
        throw new Error("Certificado Sicredi não configurado.");
    }

    return new https.Agent({
        cert: Buffer.from(certBase64, "base64").toString("utf8"),
        key: Buffer.from(keyBase64, "base64").toString("utf8"),
        rejectUnauthorized: true,
    });
}

async function obterToken() {
    const baseUrl = process.env.SICREDI_BASE_URL;
    const clientId = process.env.SICREDI_CLIENT_ID;
    const clientSecret = process.env.SICREDI_CLIENT_SECRET;

    if (!baseUrl || !clientId || !clientSecret) {
        throw new Error("Credenciais Sicredi não configuradas.");
    }

    const response = await axios.post(
        `${baseUrl}/oauth/token`,
        new URLSearchParams({
            grant_type: "client_credentials",
        }).toString(),
        {
            httpsAgent: criarHttpsAgent(),
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data.access_token as string;
}

function cpfValido(cpf: string) {
    const numeros = somenteDigitos(cpf);

    if (numeros.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numeros)) return false;

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(numeros[i]) * (10 - i);
    }

    let digito1 = 11 - (soma % 11);
    if (digito1 >= 10) digito1 = 0;

    if (digito1 !== Number(numeros[9])) return false;

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(numeros[i]) * (11 - i);
    }

    let digito2 = 11 - (soma % 11);
    if (digito2 >= 10) digito2 = 0;

    return digito2 === Number(numeros[10]);
}

function normalizarChavePix(chave: string) {
    const chaveLimpa = String(chave || "").trim();

    if (chaveLimpa.includes("@")) {
        return chaveLimpa.toLowerCase();
    }

    return chaveLimpa.replace(/\s/g, "");
}

async function consultarCobranca(txid: string, token: string) {
    const baseUrl = process.env.SICREDI_BASE_URL!;

    const response = await axios.get(
        `${baseUrl}/api/v2/cob/${txid}`,
        {
            httpsAgent: criarHttpsAgent(),
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
}

function cobrancaAindaValida(cobranca: any) {
    const criacao = cobranca?.calendario?.criacao;
    const expiracao = Number(
        cobranca?.calendario?.expiracao || 3600
    );

    if (!criacao) return false;

    const criadaEm = new Date(criacao).getTime();

    if (!Number.isFinite(criadaEm)) {
        return false;
    }

    const expiraEm = criadaEm + expiracao * 1000;

    return Date.now() < expiraEm;
}

export async function POST(req: NextRequest) {
    try {
        console.log("CRIAR PIX: início");

        const body = await req.json();

        const {
            pedidoId,
            nome,
            cpf,
            produto,
            valorTotal,
        } = body;

        if (!pedidoId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido não informado.",
                },
                { status: 400 }
            );
        }

        const pedidoSalvo: any =
            await buscarPedidoPorId(pedidoId);

        if (!pedidoSalvo) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido não encontrado.",
                },
                { status: 404 }
            );
        }

        /*
         * Se o pedido já estiver pago,
         * nunca criar uma nova cobrança.
         */
        if (pedidoSalvo.statusPagamento === "pago") {
            return NextResponse.json({
                ok: true,
                pago: true,
                status: "CONCLUIDA",
                mensagem: "Este pedido já está pago.",
                txid: pedidoSalvo.sicrediTxid || "",
                pixCopiaCola:
                    pedidoSalvo.sicrediPixCopiaCola || "",
                location:
                    pedidoSalvo.sicrediLocation || "",
            });
        }

        const nomeFinal = String(
            nome ||
            pedidoSalvo.nome ||
            "Cliente"
        ).trim();

        const cpfFinal = somenteDigitos(
            cpf ||
            pedidoSalvo.cpf ||
            ""
        );

        /*
         * IMPORTANTE:
         * usa preferencialmente o valor salvo
         * no Firestore, não o valor enviado
         * pelo navegador.
         */
        const valorNumerico = Number(
            pedidoSalvo.valorTotal ??
            valorTotal ??
            0
        );

        if (
            !Number.isFinite(valorNumerico) ||
            valorNumerico <= 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Valor do pedido inválido.",
                },
                { status: 400 }
            );
        }

        const valorFinal =
            valorNumerico.toFixed(2);

        if (!cpfValido(cpfFinal)) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "CPF inválido ou não encontrado no pedido.",
                },
                { status: 400 }
            );
        }

        const baseUrl =
            process.env.SICREDI_BASE_URL;

        const chavePix = normalizarChavePix(
            process.env.SICREDI_PIX_KEY || ""
        );

        if (!baseUrl || !chavePix) {
            throw new Error(
                "Variáveis Sicredi não configuradas."
            );
        }

        const token = await obterToken();

        /*
         * ====================================================
         * REUTILIZAR PIX EXISTENTE
         * ====================================================
         *
         * Esta é a correção principal.
         *
         * Se já existe TXID para esse pedido,
         * consultamos a cobrança antes de criar outra.
         */
        const txidExistente = String(
            pedidoSalvo.sicrediTxid || ""
        ).trim();

        if (txidExistente) {
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
                        txid: txidExistente,
                        status:
                            cobrancaExistente?.status ||
                            "",
                    }
                );

                const pixCopiaCola =
                    cobrancaExistente?.pixCopiaECola ||
                    pedidoSalvo.sicrediPixCopiaCola ||
                    "";

                const location =
                    cobrancaExistente?.location ||
                    pedidoSalvo.sicrediLocation ||
                    "";

                /*
                 * Se o Sicredi já marcou como concluída,
                 * não cria novo Pix.
                 */
                if (
                    cobrancaExistente?.status ===
                    "CONCLUIDA"
                ) {
                    return NextResponse.json({
                        ok: true,
                        pago: true,
                        txid: txidExistente,
                        status: "CONCLUIDA",
                        pixCopiaCola,
                        location,
                        mensagem:
                            "Pagamento já confirmado pelo Sicredi.",
                    });
                }

                /*
                 * Se a cobrança continua ATIVA
                 * e ainda não expirou, devolvemos
                 * EXATAMENTE o mesmo QR Code.
                 */
                if (
                    cobrancaExistente?.status ===
                    "ATIVA" &&
                    cobrancaAindaValida(
                        cobrancaExistente
                    )
                ) {
                    console.log(
                        "REUTILIZANDO PIX EXISTENTE:",
                        {
                            pedidoId,
                            txid: txidExistente,
                        }
                    );

                    return NextResponse.json({
                        ok: true,
                        reutilizado: true,
                        txid: txidExistente,
                        status: "ATIVA",
                        pixCopiaCola,
                        location,
                    });
                }

                console.log(
                    "PIX ANTERIOR EXPIRADO OU NÃO REUTILIZÁVEL:",
                    {
                        pedidoId,
                        txid: txidExistente,
                        status:
                            cobrancaExistente?.status ||
                            "",
                    }
                );
            } catch (erroConsulta: any) {
                /*
                 * Se a cobrança não existir mais,
                 * podemos criar uma nova.
                 *
                 * Porém deixamos isso registrado
                 * para diagnóstico.
                 */
                console.error(
                    "ERRO AO CONSULTAR PIX EXISTENTE:",
                    {
                        pedidoId,
                        txid: txidExistente,
                        status:
                            erroConsulta?.response?.status ||
                            null,
                        erro:
                            erroConsulta?.response?.data ||
                            erroConsulta?.message,
                    }
                );
            }
        }

        /*
         * ====================================================
         * CRIAR NOVA COBRANÇA
         * ====================================================
         *
         * Só chega aqui quando:
         * - não havia TXID;
         * - ou cobrança anterior expirou;
         * - ou cobrança anterior não existe mais.
         */

        const payload = {
            calendario: {
                expiracao: 3600,
            },

            devedor: {
                cpf: cpfFinal,
                nome: nomeFinal,
            },

            valor: {
                original: valorFinal,
            },

            chave: chavePix,

            solicitacaoPagador:
                String(
                    produto ||
                    pedidoSalvo.produto ||
                    "Ingresso Parque Mundo Novo"
                ),
        };

        const response = await axios.post(
            `${baseUrl}/api/v2/cob`,
            payload,
            {
                httpsAgent: criarHttpsAgent(),

                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                        "application/json",
                },
            }
        );

        const data = response.data;

        console.log("NOVO PIX CRIADO:", {
            pedidoId,
            txid: data?.txid || "",
            status: data?.status || "",
            valor: valorFinal,
        });

        const pixCopiaCola =
            data?.pixCopiaECola ||
            data?.brcode ||
            data?.pixCopiaCola ||
            data?.emv ||
            "";

        await atualizarPedido(pedidoId, {
            statusPagamento: "pendente",

            sicrediTxid:
                data?.txid || "",

            sicrediStatus:
                data?.status || "ATIVA",

            sicrediPixCopiaCola:
                pixCopiaCola,

            sicrediLocation:
                data?.location || "",

            sicrediPixCriadoEm:
                new Date().toISOString(),
        });

        return NextResponse.json({
            ok: true,
            reutilizado: false,
            txid: data?.txid || "",
            status: data?.status || "",
            pixCopiaCola,
            location:
                data?.location || "",
        });
    } catch (error: any) {
        console.error(
            "ERRO SICREDI CRIAR PIX:",
            error?.response?.data ||
            error?.message
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "Erro ao criar Pix Sicredi.",
                details:
                    error?.response?.data ||
                    error?.message,
            },
            {
                status:
                    error?.response?.status ||
                    500,
            }
        );
    }
}