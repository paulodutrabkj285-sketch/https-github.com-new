import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    atualizarPedido,
    buscarPedidoPorId,
} from "@/lib/pedidos";

import {
    enviarIngressoPorEmail,
} from "@/lib/email";

export const runtime = "nodejs";

/* =========================================================
   DESCOBRIR QUANTIDADE CORRETA
========================================================= */

function obterQuantidadePedido(
    pedido: any
) {
    const produto =
        String(
            pedido?.produto ||
            ""
        )
            .trim()
            .toLowerCase();

    /*
     * CAMPING:
     *
     * quantidade geralmente representa
     * 1 reserva.
     *
     * quantidadePessoas representa
     * o número real de hóspedes.
     */

    if (
        produto.includes(
            "camping"
        )
    ) {
        const quantidadePessoas =
            Number(
                pedido?.quantidadePessoas ||
                0
            );

        if (
            Number.isFinite(
                quantidadePessoas
            ) &&
            quantidadePessoas > 0
        ) {
            return quantidadePessoas;
        }
    }

    /*
     * DEMAIS PRODUTOS
     */

    const quantidade =
        Number(
            pedido?.quantidade ||
            0
        );

    if (
        Number.isFinite(
            quantidade
        ) &&
        quantidade > 0
    ) {
        return quantidade;
    }

    /*
     * FALLBACK
     */

    const quantidadePessoas =
        Number(
            pedido?.quantidadePessoas ||
            0
        );

    if (
        Number.isFinite(
            quantidadePessoas
        ) &&
        quantidadePessoas > 0
    ) {
        return quantidadePessoas;
    }

    return 1;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
    req: NextRequest
) {
    try {
        const body =
            await req.json();

        const pedidoId =
            String(
                body?.pedidoId ||
                ""
            ).trim();

        /* ==========================================
           VALIDAR PEDIDO ID
        ========================================== */

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

        /* ==========================================
           BUSCAR PEDIDO
        ========================================== */

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
                        pedidoIdInformado:
                            pedidoId,
                    },
                },
                {
                    status:
                        404,
                }
            );
        }

        /* ==========================================
           QUANTIDADE CORRETA
        ========================================== */

        const quantidade =
            obterQuantidadePedido(
                pedido
            );

        /* ==========================================
           LOG PARA VERCEL
        ========================================== */

        console.log(
            "DIAGNOSTICO REENVIO INGRESSO:",
            {
                pedidoId:
                    pedido.id,

                codigoIngresso:
                    pedido.codigoIngresso ||
                    null,

                nome:
                    pedido.nome ||
                    null,

                email:
                    pedido.email ||
                    null,

                statusPagamento:
                    pedido.statusPagamento ||
                    null,

                statusOperacional:
                    pedido.statusOperacional ||
                    null,

                sicrediTxid:
                    pedido.sicrediTxid ||
                    null,

                produto:
                    pedido.produto ||
                    null,

                quantidadeFirestore:
                    pedido.quantidade ??
                    null,

                quantidadePessoasFirestore:
                    pedido.quantidadePessoas ??
                    null,

                quantidadeUtilizada:
                    quantidade,

                valorTotal:
                    pedido.valorTotal ||
                    null,
            }
        );

        /* ==========================================
           VALIDAR EMAIL
        ========================================== */

        const email =
            String(
                pedido.email ||
                ""
            ).trim();

        if (!email) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Pedido sem e-mail cadastrado.",

                    diagnostico: {
                        pedidoId:
                            pedido.id,

                        codigoIngresso:
                            pedido.codigoIngresso ||
                            null,

                        nome:
                            pedido.nome ||
                            null,

                        email:
                            pedido.email ||
                            null,
                    },
                },
                {
                    status:
                        400,
                }
            );
        }

        /* ==========================================
           VALIDAR PAGAMENTO
        ========================================== */

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
                        "O ingresso só pode ser reenviado após pagamento confirmado.",

                    diagnostico: {
                        pedidoId:
                            pedido.id,

                        codigoIngresso:
                            pedido.codigoIngresso ||
                            null,

                        nome:
                            pedido.nome ||
                            null,

                        email:
                            pedido.email ||
                            null,

                        statusPagamento:
                            pedido.statusPagamento ||
                            null,

                        statusOperacional:
                            pedido.statusOperacional ||
                            null,

                        sicrediTxid:
                            pedido.sicrediTxid ||
                            null,

                        sicrediStatus:
                            pedido.sicrediStatus ||
                            null,

                        produto:
                            pedido.produto ||
                            null,

                        quantidadeFirestore:
                            pedido.quantidade ??
                            null,

                        quantidadePessoasFirestore:
                            pedido.quantidadePessoas ??
                            null,

                        quantidadeUtilizada:
                            quantidade,

                        valorTotal:
                            pedido.valorTotal ||
                            null,

                        createdAt:
                            pedido.createdAt ||
                            null,

                        updatedAt:
                            pedido.updatedAt ||
                            null,

                        pixExpiradoEm:
                            pedido.pixExpiradoEm ||
                            null,
                    },
                },
                {
                    status:
                        400,
                }
            );
        }

        /* ==========================================
           CÓDIGO DO INGRESSO
        ========================================== */

        const codigoIngresso =
            String(
                pedido.codigoIngresso ||
                pedido.qrCodeIngresso ||
                `PMN-${pedido.id}`
            ).trim();

        /* ==========================================
           ENVIAR EMAIL
        ========================================== */

        console.log(
            "REENVIANDO INGRESSO:",
            {
                pedidoId:
                    pedido.id,

                codigoIngresso,

                para:
                    email,

                nome:
                    pedido.nome,

                produto:
                    pedido.produto,

                quantidade,

                quantidadeFirestore:
                    pedido.quantidade ??
                    null,

                quantidadePessoasFirestore:
                    pedido.quantidadePessoas ??
                    null,

                statusPagamento:
                    pedido.statusPagamento,
            }
        );

        const resultado =
            await enviarIngressoPorEmail({
                para:
                    email,

                nome:
                    pedido.nome ||
                    "Cliente",

                produto:
                    pedido.produto ||
                    "Ingresso Parque Mundo Novo",

                quantidade,

                codigoIngresso,

                pedidoId:
                    pedido.id,

                dataVisita:
                    pedido.dataVisita ||
                    pedido.dataEntrada ||
                    "",
            });

        /* ==========================================
           REGISTRAR REENVIO
        ========================================== */

        const agora =
            new Date()
                .toISOString();

        await atualizarPedido(
            pedido.id,
            {
                emailIngressoReenviado:
                    true,

                emailIngressoReenviadoEm:
                    agora,

                emailIngressoReenviadoPara:
                    email,
            }
        );

        /* ==========================================
           SUCESSO
        ========================================== */

        return NextResponse.json({
            ok:
                true,

            mensagem:
                "Ingresso reenviado com sucesso.",

            pedido: {
                pedidoId:
                    pedido.id,

                codigoIngresso,

                nome:
                    pedido.nome ||
                    "",

                email,

                produto:
                    pedido.produto ||
                    "",

                quantidade,

                statusPagamento:
                    pedido.statusPagamento,

                statusOperacional:
                    pedido.statusOperacional,
            },

            resultadoEmail:
                resultado ||
                null,
        });
    } catch (
    error: any
    ) {
        const mensagemErro =
            error?.message ||
            error?.response ||
            JSON.stringify(
                error
            ) ||
            "Erro desconhecido";

        console.error(
            "ERRO AO REENVIAR INGRESSO:",
            mensagemErro
        );

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