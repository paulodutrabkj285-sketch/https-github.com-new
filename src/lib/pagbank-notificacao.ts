import { createHash, timingSafeEqual } from "crypto";

// https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao
export function lerNotificacaoPagbank(raw: string, assinatura: string) {
    const token = process.env.PAGBANK_TOKEN;
    if (!token) throw new Error("PAGBANK_TOKEN não configurado.");
    if (!/^[a-fA-F0-9]{64}$/.test(assinatura)) throw new Error("Assinatura PagBank inválida.");
    const esperado = createHash("sha256").update(`${token}-${raw}`).digest();
    if (!timingSafeEqual(esperado, Buffer.from(assinatura, "hex"))) throw new Error("Assinatura PagBank inválida.");
    return JSON.parse(raw);
}

export function pagamentoPagbank(body: ReturnType<typeof JSON.parse>, pedidoId: string) {
    if (body?.reference_id !== pedidoId) return null;
    const charges = Array.isArray(body.charges) ? body.charges : [body];
    const pagos = charges.filter((charge: { status?: string }) => charge?.status === "PAID");
    if (pagos.length !== 1) return null;
    const charge = pagos[0];
    const centavos = charge.amount?.summary?.paid;
    const tipo = charge.payment_method?.type;
    if (!Number.isSafeInteger(centavos) || centavos <= 0 || charge.amount?.currency !== "BRL" ||
        Number(charge.amount?.summary?.refunded || 0) !== 0 ||
        !["PIX", "CREDIT_CARD", "DEBIT_CARD"].includes(tipo) || !charge.id) return null;
    return { valor: centavos / 100, forma: tipo === "PIX" ? "pix" as const : "cartao" as const, transacaoId: String(charge.id) };
}
