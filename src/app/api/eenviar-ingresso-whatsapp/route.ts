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

/* =========================================================
   FORMATAR DATA DA VISITA
========================================================= */

function formatarDataVisita(
    valor?: string
) {
    if (!valor) {
        return "";
    }

    /*
     * Caso venha no formato:
     *
     * 2026-08-27
     */

    const dataSomente =
        String(valor)
            .trim()
            .match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

    if (dataSomente) {
        return `${dataSomente[3]}/${dataSomente[2]}/${dataSomente[1]}`;
    }

    /*
     * Caso venha como ISO completo
     */

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
     * Remove zero inicial
     *
     * Ex:
     *
     * 049999999999
     */

    numero =
        numero.replace(
            /^0+/,
            ""
        );

    /*
     * Se não possui código do Brasil,
     * adicionamos 55.
     *
     * Ex:
     *
     * 49999999999
     *
     * vira
     *
     * 5549999999999
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
    try {
        /* =================================================
           BODY
        ================================================= */

        const body =
            await req.json();

        const pedidoId =
            String(
                body?.pedidoId ||
                ""
            ).trim();

        /*
         * NOVO:
         *
         * O painel pode mandar um telefone diferente
         * apenas para este envio.
         *
         * Isso NÃO altera o telefone salvo no pedido.
         */

        const telefoneDestinoInformado =
            String(
                body?.telefoneDestino ||
                ""
            ).trim();

        /* =================================================
           VALIDAR PEDIDO ID
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

                    diagnostico: {
                        pedidoId,
                    },
                },
                {
                    status:
                        404,
                }
            );
        }

        /* =================================================
           LOG
        ================================================= */

        console.log(
            "DIAGNOSTICO REENVIO WHATSAPP:",
            {
                pedidoId:
                    pedido.id,

                codigoIngresso:
                    pedido.codigoIngresso ||
                    null,

                nome:
                    pedido.nome ||
                    null,

                telefonePedido:
                    pedido.telefone ||
                    null,

                telefoneDestinoInformado:
                    telefoneDestinoInformado ||
                    null,

                produto:
                    pedido.produto ||
                    null,

                quantidade:
                    pedido.quantidade ||
                    null,

                dataVisita:
                    pedido.dataVisita ||
                    pedido.dataEntrada ||
                    null,

                statusPagamento:
                    pedido.statusPagamento ||
                    null,

                statusOperacional:
                    pedido.statusOperacional ||
                    null,
            }
        );

        /* =================================================
           VALIDAR PAGAMENTO
        ================================================= */

        if (
            pedido.statusPagamento !==
            "pago"
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "O ingresso só pode ser enviado pelo WhatsApp após pagamento confirmado.",

                    diagnostico: {
                        pedidoId:
                            pedido.id,

                        codigoIngresso:
                            pedido.codigoIngresso ||
                            null,

                        statusPagamento:
                            pedido.statusPagamento ||
                            null,

                        statusOperacional:
                            pedido.statusOperacional ||
                            null,
                    },
                },
                {
                    status:
                        400,
                }
            );
        }

        /* =================================================
           TELEFONE ORIGINAL DO PEDIDO
        ================================================= */

        const telefonePedido =
            String(
                pedido.telefone ||
                ""
            ).trim();

        /* =================================================
           TELEFONE QUE RECEBERÁ O WHATSAPP
        ================================================= */

        /*
         * Se telefoneDestino foi informado pelo painel,
         * usamos ele.
         *
         * Caso contrário, usamos normalmente o telefone
         * original cadastrado no pedido.
         *
         * IMPORTANTE:
         *
         * Em nenhum momento atualizamos pedido.telefone.
         */

        const telefoneOriginal =
            telefoneDestinoInformado ||
            telefonePedido;

        if (
            !telefoneOriginal
        ) {
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
                        "Não foi possível identificar um telefone válido para o envio.",
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
                `PMN-${pedido.id}`
            );

        /* =================================================
           NOME
        ================================================= */

        const nome =
            String(
                pedido.nome ||
                "Cliente"
            ).trim();

        /* =================================================
           DATA VISITA
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
           URL DO PDF
        ================================================= */

        /*
         * Essa rota já existe:
         *
         * /api/pdf-ingresso
         *
         * O respond.io precisa conseguir acessar
         * o documento através de uma URL HTTPS pública.
         */

        const origem =
            process.env
                .NEXT_PUBLIC_SITE_URL ||
            "https://www.parquemundonovooficial.com.br";

        const pdfUrl =
            `${origem}/api/pdf-ingresso?pedidoId=${encodeURIComponent(
                pedido.id
            )}`;

        /* =================================================
           LOG ANTES DO ENVIO
        ================================================= */

        console.log(
            "ENVIANDO INGRESSO WHATSAPP:",
            {
                pedidoId:
                    pedido.id,

                telefonePedido,

                telefoneDestinoInformado:
                    telefoneDestinoInformado ||
                    null,

                telefoneUsadoAntesNormalizacao:
                    telefoneOriginal,

                telefone,

                nome,

                codigoIngresso,

                dataVisita,

                pdfUrl,
            }
        );

        /* =================================================
           ENVIAR PELO RESPOND.IO
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
           REGISTRAR ENVIO
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

                /*
                 * Aqui registramos para qual número
                 * o ingresso foi realmente enviado.
                 *
                 * NÃO alteramos pedido.telefone.
                 */

                whatsappIngressoEnviadoPara:
                    telefone,

                whatsappIngressoErro:
                    "",

                whatsappIngressoErroEm:
                    "",
            }
        );

        /* =================================================
           SUCESSO
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

                    /*
                     * Telefone que recebeu
                     */

                    telefone,

                    /*
                     * Telefone cadastrado originalmente
                     */

                    telefonePedido,

                    /*
                     * Mostra se foi utilizado número
                     * informado manualmente.
                     */

                    telefoneDestinoInformado:
                        telefoneDestinoInformado ||
                        null,

                    dataVisita,

                    produto:
                        pedido.produto ||
                        "",

                    quantidade:
                        Number(
                            pedido.quantidade ||
                            1
                        ),

                    statusPagamento:
                        pedido.statusPagamento,

                    statusOperacional:
                        pedido.statusOperacional,
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
        /* =================================================
           ERRO
        ================================================= */

        const mensagemErro =
            error?.message ||
            error?.response ||
            (
                typeof error ===
                    "string"
                    ? error
                    : ""
            ) ||
            "Erro desconhecido ao enviar ingresso pelo WhatsApp.";

        console.error(
            "ERRO REENVIO WHATSAPP:",
            error
        );

        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    String(
                        mensagemErro
                    ),
            },
            {
                status:
                    500,
            }
        );
    }
}