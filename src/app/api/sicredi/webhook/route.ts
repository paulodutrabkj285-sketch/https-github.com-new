import { NextRequest, NextResponse } from "next/server";
import { buscarPedidoPorTxid } from "@/lib/pedidos";
import { finalizarPagamento } from "@/lib/finalizar-pagamento";

export const runtime = "nodejs";
export const maxDuration = 60;

// Compatível com a URL cadastrada e com o sufixo /pix do protocolo Pix.
export async function POST(req: NextRequest) {
    let body;
    try { body = await req.json(); }
    catch { return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 }); }
    if (!Array.isArray(body?.pix)) return NextResponse.json({ ok: false, error: "Lista pix inválida." }, { status: 400 });
    const pixLista = body.pix;
    const resultados = [];
    let falha = false;
    for (const txid of new Set<string>(pixLista.map((pix: { txid?: unknown }) =>
        typeof pix?.txid === "string" ? pix.txid.trim() : ""))) {
        if (!txid) { falha = true; resultados.push({ ok: false, motivo: "pix_sem_txid" }); continue; }
        try {
            const pedido = await buscarPedidoPorTxid(txid);
            if (!pedido) {
                falha = true; // Pode haver corrida entre criação do Pix e gravação do TXID.
                resultados.push({ ok: false, txid, motivo: "pedido_nao_encontrado" });
                continue;
            }
            const resultado = await finalizarPagamento({ pedidoId: pedido.id, formaPagamento: "pix", sicrediTxid: txid });
            if (resultado.status === "banco_nao_confirmado") falha = true;
            resultados.push({ txid, ...resultado });
        } catch {
            falha = true;
            resultados.push({ ok: false, txid, motivo: "erro_confirmacao_bancaria" });
        }
    }
    // Repetição do lote é segura; falha transitória precisa de nova entrega.
    return NextResponse.json({ ok: !falha, quantidade: resultados.length, resultados }, { status: falha ? 503 : 200 });
}
