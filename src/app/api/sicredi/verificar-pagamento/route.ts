import { NextRequest, NextResponse } from "next/server";
import { finalizarPagamento } from "@/lib/finalizar-pagamento";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const { pedidoId } = await req.json();
        if (typeof pedidoId !== "string" || !pedidoId.trim()) {
            return NextResponse.json({ ok: false, error: "Pedido não informado." }, { status: 400 });
        }
        const resultado = await finalizarPagamento({ pedidoId, formaPagamento: "pix" });
        return NextResponse.json({
            ...resultado,
            pago: resultado.ok && ["pago", "ja_pago"].includes(resultado.status),
            status: resultado.status === "banco_nao_confirmado" ? "pendente" : resultado.status,
        }, { status: resultado.status === "pedido_nao_encontrado" ? 404 : 200 });
    } catch (error) {
        console.error("ERRO VERIFICAR PIX:", error instanceof Error ? error.message : "Erro desconhecido");
        return NextResponse.json({ ok: false, pago: false, error: "Erro ao verificar pagamento Sicredi." }, { status: 502 });
    }
}
