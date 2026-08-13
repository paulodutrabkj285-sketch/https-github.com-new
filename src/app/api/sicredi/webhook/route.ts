import { NextRequest, NextResponse } from "next/server";
import { buscarPedidoPorTxid } from "@/lib/pedidos";
import { finalizarPagamento } from "@/lib/finalizar-pagamento";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log(
            "WEBHOOK SICREDI RECEBIDO:",
            JSON.stringify(body, null, 2)
        );

        const pixLista = Array.isArray(body?.pix)
            ? body.pix
            : [];

        if (pixLista.length === 0) {
            return NextResponse.json({
                ok: true,
                mensagem: "Webhook recebido sem Pix.",
            });
        }

        const resultados: any[] = [];

        for (const pix of pixLista) {
            const txid = String(
                pix?.txid || ""
            ).trim();

            const valorPago = Number(
                pix?.valor || 0
            );

            const endToEndId = String(
                pix?.endToEndId || ""
            );

            const horario = String(
                pix?.horario || ""
            );

            /* ======================================
               VALIDAR TXID
            ====================================== */

            if (!txid) {
                console.log(
                    "WEBHOOK: PIX SEM TXID",
                    pix
                );

                resultados.push({
                    ok: false,
                    motivo: "pix_sem_txid",
                });

                continue;
            }

            /* ======================================
               BUSCAR PEDIDO
            ====================================== */

            const pedido: any =
                await buscarPedidoPorTxid(
                    txid
                );

            if (!pedido) {
                console.error(
                    "WEBHOOK: PEDIDO NÃO ENCONTRADO",
                    {
                        txid,
                        valorPago,
                        endToEndId,
                    }
                );

                resultados.push({
                    ok: false,
                    motivo: "pedido_nao_encontrado",
                    txid,
                });

                /*
                 * Não devolvemos erro geral
                 * porque pode haver outros Pix
                 * no mesmo webhook.
                 */
                continue;
            }

            console.log(
                "WEBHOOK: PEDIDO ENCONTRADO",
                {
                    pedidoId: pedido.id,
                    codigoIngresso:
                        pedido.codigoIngresso || null,
                    statusPagamento:
                        pedido.statusPagamento || null,
                    statusOperacional:
                        pedido.statusOperacional || null,
                    valorPedido:
                        pedido.valorTotal || 0,
                    valorPago,
                    txid,
                }
            );

            /* ======================================
               FINALIZAÇÃO CENTRALIZADA
            ====================================== */

            const resultado =
                await finalizarPagamento({
                    pedidoId: pedido.id,
                    formaPagamento: "pix",
                    valorPago,
                    pixEndToEndId: endToEndId,
                    pixHorario: horario,
                    sicrediTxid: txid,
                });

            /*
             * resultado já contém pedidoId.
             * Não repetimos pedidoId aqui.
             */
            resultados.push({
                txid,
                ...resultado,
            });

            console.log(
                "WEBHOOK: RESULTADO FINALIZAÇÃO",
                {
                    txid,
                    ...resultado,
                }
            );
        }

        /* ======================================
           RESPOSTA
        ====================================== */

        return NextResponse.json({
            ok: true,
            mensagem: "Webhook Sicredi processado.",
            quantidade: resultados.length,
            resultados,
        });
    } catch (error: any) {
        const mensagem = String(
            error?.message ||
            error ||
            "Erro desconhecido"
        );

        console.error(
            "ERRO WEBHOOK SICREDI:",
            mensagem
        );

        return NextResponse.json(
            {
                ok: false,
                error:
                    "Erro ao processar webhook Sicredi.",
                details: mensagem,
            },
            {
                status: 500,
            }
        );
    }
}