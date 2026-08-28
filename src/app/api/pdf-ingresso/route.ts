import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    buscarPedidoPorId,
} from "@/lib/pedidos";

import {
    gerarPdfIngresso,
} from "@/lib/pdf";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

/* =========================================================
   NORMALIZAR PRODUTO
========================================================= */

function normalizarProduto(
    produto?: string
) {
    return String(
        produto || ""
    )
        .trim()
        .toLowerCase();
}

/* =========================================================
   DESCOBRIR QUANTIDADE CORRETA
========================================================= */

function obterQuantidade(
    pedido: any
) {
    const produto =
        normalizarProduto(
            pedido?.produto
        );

    /*
     * CAMPING
     *
     * quantidade normalmente representa:
     * 1 reserva
     *
     * quantidadePessoas representa:
     * número real de hóspedes.
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
   GET
========================================================= */

export async function GET(
    request: NextRequest
) {
    try {
        /* =================================================
           QUERY STRING
        ================================================= */

        const pedidoId =
            request.nextUrl
                .searchParams
                .get(
                    "pedidoId"
                )
                ?.trim() ||
            "";

        const codigo =
            request.nextUrl
                .searchParams
                .get(
                    "codigo"
                )
                ?.trim() ||
            "";

        /* =================================================
           VALIDAR PARÂMETROS
        ================================================= */

        if (
            !pedidoId ||
            !codigo
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    mensagem:
                        "Pedido e código do ingresso são obrigatórios.",
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

                    mensagem:
                        "Pedido não encontrado.",
                },
                {
                    status:
                        404,
                }
            );
        }

        /* =================================================
           CÓDIGO DO INGRESSO
        ================================================= */

        const codigoIngresso =
            String(
                pedido.codigoIngresso ||
                pedido.qrCodeIngresso ||
                `PMN-${pedido.id || pedidoId}`
            ).trim();

        /* =================================================
           VALIDAR CÓDIGO
        ================================================= */

        if (
            codigoIngresso !==
            codigo
        ) {
            console.warn(
                "PDF INGRESSO: CÓDIGO INVÁLIDO",
                {
                    pedidoId,

                    codigoRecebido:
                        codigo,

                    codigoEsperado:
                        codigoIngresso,
                }
            );

            return NextResponse.json(
                {
                    ok:
                        false,

                    mensagem:
                        "Código do ingresso inválido.",
                },
                {
                    status:
                        403,
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
            console.warn(
                "PDF INGRESSO: PEDIDO NÃO PAGO",
                {
                    pedidoId,

                    statusPagamento,
                }
            );

            return NextResponse.json(
                {
                    ok:
                        false,

                    mensagem:
                        "O ingresso ainda não está liberado.",
                },
                {
                    status:
                        403,
                }
            );
        }

        /* =================================================
           QUANTIDADE CORRETA
        ================================================= */

        const quantidade =
            obterQuantidade(
                pedido
            );

        /* =================================================
           DATA
        ================================================= */

        const dataVisita =
            pedido.dataVisita ||
            pedido.dataEntrada ||
            "";

        /* =================================================
           LOG
        ================================================= */

        console.log(
            "PDF INGRESSO: DADOS",
            {
                pedidoId,

                codigoIngresso,

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

                dataVisita,
            }
        );

        /* =================================================
           GERAR PDF
        ================================================= */

        const pdfBuffer =
            await gerarPdfIngresso(
                {
                    nome:
                        pedido.nome ||
                        "Cliente",

                    produto:
                        pedido.produto ||
                        "Ingresso Parque Mundo Novo",

                    quantidade,

                    codigoIngresso,

                    pedidoId,

                    dataVisita,
                }
            );

        /* =================================================
           VALIDAR PDF
        ================================================= */

        if (
            !pdfBuffer ||
            pdfBuffer.length ===
            0
        ) {
            throw new Error(
                "O PDF do ingresso foi gerado vazio."
            );
        }

        console.log(
            "PDF INGRESSO: PDF GERADO",
            {
                pedidoId,

                codigoIngresso,

                produto:
                    pedido.produto ||
                    null,

                quantidade,

                bytes:
                    pdfBuffer.length,
            }
        );

        /* =================================================
           RETORNAR PDF
        ================================================= */

        return new NextResponse(
            new Uint8Array(
                pdfBuffer
            ),
            {
                status:
                    200,

                headers: {
                    "Content-Type":
                        "application/pdf",

                    "Content-Disposition":
                        `inline; filename="Ingresso-${codigoIngresso}.pdf"`,

                    "Cache-Control":
                        "private, no-store, no-cache, must-revalidate, max-age=0",

                    Pragma:
                        "no-cache",

                    Expires:
                        "0",

                    "X-Content-Type-Options":
                        "nosniff",
                },
            }
        );
    } catch (
    error: any
    ) {
        console.error(
            "PDF INGRESSO: ERRO",
            {
                erro:
                    error?.message ||
                    String(
                        error
                    ),
            }
        );

        return NextResponse.json(
            {
                ok:
                    false,

                mensagem:
                    error?.message ||
                    "Erro ao gerar o PDF do ingresso.",
            },
            {
                status:
                    500,
            }
        );
    }
}