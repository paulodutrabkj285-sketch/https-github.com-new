import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buscarPedidoPorTxid } from "@/lib/pedidos";
import { finalizarPagamento } from "@/lib/finalizar-pagamento";
import { recuperarPix } from "@/lib/pix-recuperacao";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const prazo = Date.now() + maxDuration * 1000;
    const segredo = process.env.EFI_WEBHOOK_HMAC?.trim();
    if (!segredo) return NextResponse.json({ ok: false }, { status: 503 });

    const [hmac, duplicado] = req.nextUrl.searchParams.getAll("hmac");
    if (!hmac || duplicado !== undefined ||
        !timingSafeEqual(createHash("sha256").update(hmac).digest(), createHash("sha256").update(segredo).digest())) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    let body;
    try {
        const raw = await req.text();
        body = raw.trim() ? JSON.parse(raw) : {};
    } catch {
        return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
    }
    // A notificação de teste do cadastro pode chegar sem uma lista de pagamentos.
    if (body && typeof body === "object" && !Array.isArray(body) && !Object.hasOwn(body, "pix")) {
        return NextResponse.json({ ok: true });
    }
    if (!Array.isArray(body?.pix)) {
        return NextResponse.json({ ok: false, error: "Lista pix inválida." }, { status: 400 });
    }

    const processados = new Set<string>();
    let falha = false;
    for (const pix of body.pix) {
        const txid = pix?.txid;
        const endToEndId = pix?.endToEndId;
        if (typeof txid !== "string" || !/^[a-zA-Z0-9]{26,35}$/.test(txid) ||
            typeof endToEndId !== "string" || !/^E[a-zA-Z0-9]{31}$/.test(endToEndId)) continue;
        const id = `${txid}:${endToEndId}`;
        if (processados.has(id)) continue;
        processados.add(id);
        let pedidoId: string | undefined;
        try {
            const pedido = await buscarPedidoPorTxid(txid, "efiTxid");
            if (!pedido) {
                // Entregas de cobranças anteriores à reserva do TXID podem precisar de reentrega.
                falha = true;
                console.warn("Webhook Efí sem pedido correspondente.", {
                    provider: "efi", etapa: "localizar-pedido", txidParcial: txid.slice(-6),
                });
                continue;
            }
            if (pedido.statusPagamento === "pago" && pedido.emailIngressoEnviado) continue;
            pedidoId = pedido.id;
            const resultado = await finalizarPagamento({ pedidoId: pedido.id, formaPagamento: "pix",
                efiTxid: txid, efiEndToEndId: endToEndId });
            if (resultado.status === "banco_nao_confirmado") {
                falha = true;
                await recuperarPix({ pedidoId, provider: "efi", txid, efiEndToEndId: endToEndId }, prazo);
            }
        } catch {
            falha = true;
            if (pedidoId) await recuperarPix({ pedidoId, provider: "efi", txid, efiEndToEndId: endToEndId }, prazo);
        }
    }
    return NextResponse.json({ ok: !falha }, { status: falha ? 503 : 200 });
}
