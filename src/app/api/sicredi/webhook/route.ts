import { NextRequest, NextResponse } from "next/server";
import { atualizarPedido, buscarPedidoPorTxid } from "@/lib/pedidos";

export const runtime = "nodejs";

function centavos(valor: any) {
    return Math.round(Number(valor || 0) * 100);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log("WEBHOOK SICREDI RECEBIDO:", JSON.stringify(body, null, 2));

        const pixLista = Array.isArray(body?.pix) ? body.pix : [];

        if (pixLista.length === 0) {
            return NextResponse.json({
                ok: true,
                mensagem: "Webhook recebido sem Pix.",
            });
        }

        for (const pix of pixLista) {
            const txid = pix?.txid;
            const valorPago = Number(pix?.valor || 0);

            if (!txid) {
                console.log("PIX SEM TXID:", pix);
                continue;
            }

            const pedido = await buscarPedidoPorTxid(txid);

            if (!pedido) {
                console.log("PEDIDO NÃO ENCONTRADO PARA TXID:", txid);
                continue;
            }

            const valorPedidoCentavos = centavos(pedido.valorTotal);
            const valorPagoCentavos = centavos(valorPago);

            if (valorPagoCentavos !== valorPedidoCentavos) {
                await atualizarPedido(pedido.id, {
                    statusPagamento: "valor_divergente",
                    statusOperacional: "bloqueado",
                    sicrediStatus: "CONCLUIDA",
                    valorPago,
                    pixEndToEndId: pix?.endToEndId || "",
                    pixHorario: pix?.horario || "",
                });

                console.log("VALOR DIVERGENTE:", {
                    pedidoId: pedido.id,
                    txid,
                    valorPedido: pedido.valorTotal,
                    valorPago,
                });

                continue;
            }

            const codigoIngresso = pedido.codigoIngresso || `PMN-${pedido.id}`;

            await atualizarPedido(pedido.id, {
                statusPagamento: "pago",
                statusOperacional: "ativo",
                sicrediStatus: "CONCLUIDA",
                valorPago,
                codigoIngresso,
                qrCodeIngresso: codigoIngresso,
                pixEndToEndId: pix?.endToEndId || "",
                pixHorario: pix?.horario || "",
            });

            console.log("PAGAMENTO CONFIRMADO:", {
                pedidoId: pedido.id,
                txid,
                valorPago,
            });
        }

        return NextResponse.json({
            ok: true,
            mensagem: "Webhook processado.",
        });
    } catch (error: any) {
        console.error("ERRO WEBHOOK SICREDI:", error?.message || error);

        return NextResponse.json(
            {
                ok: false,
                error: "Erro ao processar webhook Sicredi.",
            },
            { status: 500 }
        );
    }
}