import { NextRequest, NextResponse } from "next/server";
import { atualizarPedido, buscarPedidoPorTxid } from "@/lib/pedidos";
import { enviarIngressoPorEmail } from "@/lib/email";

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

            const pedido: any = await buscarPedidoPorTxid(txid);

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

            if (!pedido.emailIngressoEnviado && pedido.email) {
                try {
                    await enviarIngressoPorEmail({
                        para: pedido.email,
                        nome: pedido.nome || "Cliente",
                        produto: pedido.produto || "Ingresso Parque Mundo Novo",
                        quantidade: Number(pedido.quantidade || 1),
                        codigoIngresso,
                        pedidoId: pedido.id,
                        dataVisita: pedido.dataVisita || pedido.dataEntrada || "",
                    });

                    await atualizarPedido(pedido.id, {
                        emailIngressoEnviado: true,
                        emailIngressoEnviadoEm: new Date().toISOString(),
                    });

                    console.log("EMAIL DO INGRESSO ENVIADO:", {
                        pedidoId: pedido.id,
                        email: pedido.email,
                    });
                } catch (emailError: any) {
                    console.error(
                        "ERRO AO ENVIAR EMAIL DO INGRESSO:",
                        emailError?.message || emailError
                    );

                    await atualizarPedido(pedido.id, {
                        emailIngressoErro: String(emailError?.message || emailError),
                        emailIngressoErroEm: new Date().toISOString(),
                    });
                }
            }
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