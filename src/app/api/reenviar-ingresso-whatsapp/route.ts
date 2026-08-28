import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    atualizarPedido,
    buscarPedidoPorId,
} from "@/lib/pedidos";

import {
    enviarIngressoPorWhatsapp,
} from "@/lib/email";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

/* =========================================================
   FORMATAR DATA
========================================================= */

function formatarDataVisita(
    valor?: string
) {
    if (!valor) {
        return "";
    }

    const dataSomente =
        String(
            valor
        )
            .trim()
            .match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

    if (dataSomente) {
        return `${dataSomente[3]}/${dataSomente[2]}/${dataSomente[1]}`;
    }

    try {
        return new Date(
            valor
        ).toLocaleDateString(
            "pt-BR",
            {
                timeZone:
                    "America/Sao_Paulo",
            }
        );
    } catch {
        return valor;
    }
}

/* =========================================================
   NORMALIZAR TELEFONE
========================================================= */

function normalizarTelefone(
    telefone?: string
) {
    let numero =
        String(
            telefone || ""
        ).replace(
            /\D/g,
            ""
        );

    if (!numero) {
        return "";
    }

    /*
     * Remove zeros iniciais.
     */

    numero =
        numero.replace(
            /^0+/,
            ""
        );

    /*
     * Se já veio com 55,
     * mantém.
     *
     * Caso contrário,
     * adiciona Brasil 55.
     */

    if (
        !numero.startsWith(
            "55"
        )
    ) {
        numero =
            `55${numero}`;
    }

    return numero;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
    req: NextRequest
) {
    let pedidoId =
        "";

    try {
        /* =================================================
           BODY
        ================================================= */

        const body =
            await req.json();

        pedidoId =
            String(
                body?.pedidoId ||
                ""
            ).trim();

        const telefoneDestinoInformado =
            String(
                body?.telefoneDestino ||
                ""
            ).trim();

        /* =================================================
           PEDIDO ID
        ================================================= */

        if (!pedidoId) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "pedidoId não informado.",
                },
                {
                    status:
                        400,
                }
            );
        }

        /* =================================================
           BUSCAR PEDIDO
        ================================================= */

        const pedido: any =
            await buscarPedidoPorId(
                pedidoId
            );

        if (!pedido) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Pedido não encontrado.",
                },
                {
                    status:
                        404,
                }
            );
        }

        /* =================================================
           PAGAMENTO
        ================================================= */

        const statusPagamento =
            String(
                pedido.statusPagamento ||
                ""
            )
                .trim()
                .toLowerCase();

        if (
            statusPagamento !==
            "pago"
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "O ingresso só pode ser enviado pelo WhatsApp após pagamento confirmado.",
                },
                {
                    status:
                        400,
                }
            );
        }

        /* =================================================
           TELEFONE DO PEDIDO
        ================================================= */

        const telefonePedido =
            String(
                pedido.telefone ||
                ""
            ).trim();

        /* =================================================
           TELEFONE DESTINO
        ================================================= */

        const telefoneOriginal =
            telefoneDestinoInformado ||
            telefonePedido;

        if (!telefoneOriginal) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Nenhum telefone foi informado para o envio.",
                },
                {
                    status:
                        400,
                }
            );
        }

        const telefone =
            normalizarTelefone(
                telefoneOriginal
            );

        if (!telefone) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Não foi possível identificar um telefone válido.",
                },
                {
                    status:
                        400,
                }
            );
        }

        /* =================================================
           CÓDIGO
        ================================================= */

        const codigoIngresso =
            String(
                pedido.codigoIngresso ||
                pedido.qrCodeIngresso ||
                `PMN-${pedido.id}`
            ).trim();

        /* =================================================
           NOME
        ================================================= */

        const nome =
            String(
                pedido.nome ||
                "Cliente"
            ).trim();

        /* =================================================
           DATA
        ================================================= */

        const dataOriginal =
            pedido.dataVisita ||
            pedido.dataEntrada ||
            "";

        const dataVisita =
            formatarDataVisita(
                dataOriginal
            );

        /* =================================================
           URL DO SITE
        ================================================= */

        const origem =
            String(
                process.env
                    .NEXT_PUBLIC_SITE_URL ||
                "https://www.parquemundonovooficial.com.br"
            ).replace(
                /\/+$/,
                ""
            );

        /* =================================================
           URL PÚBLICA DO PDF

           IMPORTANTE:

           pdf-ingresso exige:
           pedidoId
           +
           codigo
        ================================================= */

        const pdfUrl =
            `${origem}/api/pdf-ingresso` +
            `?pedidoId=${encodeURIComponent(
                pedido.id
            )}` +
            `&codigo=${encodeURIComponent(
                codigoIngresso
            )}`;

        /* =================================================
           LOG
        ================================================= */

        console.log(
            "REENVIO WHATSAPP - PREPARANDO:",
            {
                pedidoId:
                    pedido.id,

                nome,

                codigoIngresso,

                telefonePedido,

                telefoneDestinoInformado:
                    telefoneDestinoInformado ||
                    null,

                telefoneFinal:
                    telefone,

                dataVisita,

                pdfUrl,
            }
        );

        /* =================================================
           ENVIAR RESPOND.IO
        ================================================= */

        const resultado =
            await enviarIngressoPorWhatsapp(
                {
                    telefone,

                    nome,

                    dataVisita,

                    codigoIngresso,

                    pdfUrl,

                    pedidoId:
                        pedido.id,
                }
            );

        /* =================================================
           SALVAR SUCESSO
        ================================================= */

        const agora =
            new Date()
                .toISOString();

        await atualizarPedido(
            pedido.id,
            {
                whatsappIngressoEnviado:
                    true,

                whatsappIngressoEnviadoEm:
                    agora,

                whatsappIngressoReenviado:
                    true,

                whatsappIngressoReenviadoEm:
                    agora,

                whatsappIngressoEnviadoPara:
                    telefone,

                whatsappIngressoErro:
                    "",

                whatsappIngressoErroEm:
                    "",
            }
        );

        /* =================================================
           RETORNO
        ================================================= */

        return NextResponse.json(
            {
                ok:
                    true,

                mensagem:
                    "Ingresso enviado pelo WhatsApp com sucesso.",

                pedido: {
                    pedidoId:
                        pedido.id,

                    codigoIngresso,

                    nome,

                    telefone,

                    telefonePedido,

                    telefoneDestinoInformado:
                        telefoneDestinoInformado ||
                        null,

                    dataVisita,

                    produto:
                        pedido.produto ||
                        "",

                    statusPagamento,

                    statusOperacional:
                        pedido.statusOperacional ||
                        "",
                },

                whatsapp: {
                    enviado:
                        true,

                    enviadoEm:
                        agora,

                    telefone,

                    pdfUrl,
                },

                resultado:
                    resultado ||
                    null,
            }
        );
    } catch (
    error: any
    ) {
        const mensagemErro =
            String(
                error?.message ||
                error?.response ||
                error ||
                "Erro desconhecido ao enviar ingresso pelo WhatsApp."
            );

        console.error(
            "ERRO REENVIO WHATSAPP:",
            {
                pedidoId,

                erro:
                    mensagemErro,

                detalhe:
                    error,
            }
        );

        /*
         * Se sabemos qual pedido apresentou erro,
         * tentamos registrar o erro.
         */

        if (pedidoId) {
            try {
                await atualizarPedido(
                    pedidoId,
                    {
                        whatsappIngressoEnviado:
                            false,

                        whatsappIngressoErro:
                            mensagemErro,

                        whatsappIngressoErroEm:
                            new Date()
                                .toISOString(),
                    }
                );
            } catch (
            erroFirestore
            ) {
                console.error(
                    "ERRO AO REGISTRAR FALHA DO WHATSAPP:",
                    erroFirestore
                );
            }
        }

        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    mensagemErro,
            },
            {
                status:
                    500,
            }
        );
    }
}