import { NextResponse } from "next/server";
import { atualizarPedido, listarPedidos } from "@/lib/pedidos";
import { enviarLembreteCompraPendente } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
    try {
        const pedidos: any[] = await listarPedidos();
        const agora = Date.now();

        let enviados24h = 0;
        let enviados7d = 0;
        let ignorados = 0;

        for (const pedido of pedidos) {
            if (pedido.statusPagamento === "pago") {
                ignorados++;
                continue;
            }

            if (!pedido.email) {
                ignorados++;
                continue;
            }

            if (!pedido.createdAt) {
                ignorados++;
                continue;
            }

            const criadoEm = new Date(pedido.createdAt).getTime();

            if (Number.isNaN(criadoEm)) {
                ignorados++;
                continue;
            }

            const horasPassadas = (agora - criadoEm) / (1000 * 60 * 60);

            if (horasPassadas >= 24 && !pedido.lembrete24hEnviado) {
                await enviarLembreteCompraPendente({
                    para: pedido.email,
                    nome: pedido.nome || "Visitante",
                    produto: pedido.produto || "Ingresso Parque Mundo Novo",
                    pedidoId: pedido.id,
                    valorTotal: Number(pedido.valorTotal || 0),
                });

                await atualizarPedido(pedido.id, {
                    lembrete24hEnviado: true,
                    lembrete24hEnviadoEm: new Date().toISOString(),
                });

                enviados24h++;
                continue;
            }

            if (horasPassadas >= 168 && !pedido.lembrete7dEnviado) {
                await enviarLembreteCompraPendente({
                    para: pedido.email,
                    nome: pedido.nome || "Visitante",
                    produto: pedido.produto || "Ingresso Parque Mundo Novo",
                    pedidoId: pedido.id,
                    valorTotal: Number(pedido.valorTotal || 0),
                });

                await atualizarPedido(pedido.id, {
                    lembrete7dEnviado: true,
                    lembrete7dEnviadoEm: new Date().toISOString(),
                });

                enviados7d++;
                continue;
            }

            ignorados++;
        }

        return NextResponse.json({
            ok: true,
            mensagem: "Verificação de lembretes concluída.",
            totalPedidos: pedidos.length,
            enviados24h,
            enviados7d,
            ignorados,
        });
    } catch (error: any) {
        console.error("ERRO AO ENVIAR LEMBRETES:", error?.message || error);

        return NextResponse.json(
            {
                ok: false,
                error: "Erro ao enviar lembretes de compra pendente.",
            },
            { status: 500 }
        );
    }
}