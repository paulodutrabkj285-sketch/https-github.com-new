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

export async function GET(
    request: NextRequest
) {
    try {
        const pedidoId =
            request.nextUrl.searchParams
                .get("pedidoId")
                ?.trim() || "";

        const codigo =
            request.nextUrl.searchParams
                .get("codigo")
                ?.trim() || "";

        if (!pedidoId || !codigo) {
            return NextResponse.json(
                {
                    ok: false,
                    mensagem:
                        "Pedido e código do ingresso são obrigatórios.",
                },
                {
                    status: 400,
                }
            );
        }

        const pedido: any =
            await buscarPedidoPorId(
                pedidoId
            );

        if (!pedido) {
            return NextResponse.json(
                {
                    ok: false,
                    mensagem:
                        "Pedido não encontrado.",
                },
                {
                    status: 404,
                }
            );
        }

        const codigoIngresso =
            String(
                pedido.codigoIngresso ||
                `PMN-${pedido.id || pedidoId}`
            ).trim();

        if (codigoIngresso !== codigo) {
            console.warn(
                "PDF INGRESSO: CÓDIGO INVÁLIDO",
                {
                    pedidoId,
                    codigoRecebido: codigo,
                    codigoEsperado:
                        codigoIngresso,
                }
            );

            return NextResponse.json(
                {
                    ok: false,
                    mensagem:
                        "Código do ingresso inválido.",
                },
                {
                    status: 403,
                }
            );
        }

        const statusPagamento =
            String(
                pedido.statusPagamento || ""
            )
                .trim()
                .toLowerCase();

        if (statusPagamento !== "pago") {
            console.warn(
                "PDF INGRESSO: PEDIDO NÃO PAGO",
                {
                    pedidoId,
                    statusPagamento,
                }
            );

            return NextResponse.json(
                {
                    ok: false,
                    mensagem:
                        "O ingresso ainda não está liberado.",
                },
                {
                    status: 403,
                }
            );
        }

        const quantidade =
            Number(
                pedido.quantidade ||
                pedido.quantidadePessoas ||
                1
            );

        const dataVisita =
            pedido.dataVisita ||
            pedido.dataEntrada ||
            "";

        const pdfBuffer =
            await gerarPdfIngresso({
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
            });

        if (
            !pdfBuffer ||
            pdfBuffer.length === 0
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
                bytes: pdfBuffer.length,
            }
        );

        return new NextResponse(
            new Uint8Array(pdfBuffer),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/pdf",

                    "Content-Disposition":
                        `inline; filename="Ingresso-${codigoIngresso}.pdf"`,

                    "Cache-Control":
                        "private, no-store, no-cache, must-revalidate, max-age=0",

                    Pragma: "no-cache",

                    Expires: "0",

                    "X-Content-Type-Options":
                        "nosniff",
                },
            }
        );
    } catch (error: any) {
        console.error(
            "PDF INGRESSO: ERRO",
            {
                erro:
                    error?.message ||
                    String(error),
            }
        );

        return NextResponse.json(
            {
                ok: false,

                mensagem:
                    error?.message ||
                    "Erro ao gerar o PDF do ingresso.",
            },
            {
                status: 500,
            }
        );
    }
}