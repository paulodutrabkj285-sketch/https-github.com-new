import { gerarPdfIngresso } from "@/lib/pdf";
import { buscarPedidoPorId } from "@/lib/pedidos";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ pedidoId: string }> }
) {
    try {
        const { pedidoId } = await context.params;

        if (!pedidoId) {
            return NextResponse.json(
                { erro: "Pedido não informado." },
                { status: 400 }
            );
        }

        const pedido = await buscarPedidoPorId(pedidoId);

        if (!pedido) {
            return NextResponse.json(
                { erro: "Pedido não encontrado." },
                { status: 404 }
            );
        }

        if (pedido.statusPagamento !== "pago") {
            return NextResponse.json(
                { erro: "O ingresso ainda não foi liberado." },
                { status: 403 }
            );
        }

        const codigoIngresso = pedido.codigoIngresso || pedido.id;

        const pdfBuffer = await gerarPdfIngresso({
            nome: pedido.nome,
            produto: pedido.produto,
            quantidade: pedido.quantidade,
            codigoIngresso,
            pedidoId: pedido.id,
            dataVisita: pedido.dataVisita,
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Ingresso-Parque-Mundo-Novo-${codigoIngresso}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Erro ao gerar PDF do ingresso:", error);

        return NextResponse.json(
            { erro: "Não foi possível gerar o PDF do ingresso." },
            { status: 500 }
        );
    }
}