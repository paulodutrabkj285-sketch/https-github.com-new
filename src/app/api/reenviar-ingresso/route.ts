import { NextRequest, NextResponse } from "next/server";
import { atualizarPedido, buscarPedidoPorId } from "@/lib/pedidos";
import { enviarIngressoPorEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const pedidoId = String(body?.pedidoId || "");

        if (!pedidoId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "pedidoId não informado.",
                },
                { status: 400 }
            );
        }

        const pedido: any = await buscarPedidoPorId(pedidoId);

        if (!pedido) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido não encontrado.",
                },
                { status: 404 }
            );
        }

        if (!pedido.email) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido sem e-mail cadastrado.",
                },
                { status: 400 }
            );
        }

        if (pedido.statusPagamento !== "pago") {
            return NextResponse.json(
                {
                    ok: false,
                    error: "O ingresso só pode ser reenviado após pagamento confirmado.",
                },
                { status: 400 }
            );
        }

        const codigoIngresso = pedido.codigoIngresso || `PMN-${pedido.id}`;

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
            emailIngressoReenviado: true,
            emailIngressoReenviadoEm: new Date().toISOString(),
        });

        return NextResponse.json({
            ok: true,
            mensagem: "Ingresso reenviado com sucesso.",
        });
    } catch (error: any) {
        const mensagemErro =
            error?.message ||
            error?.response ||
            JSON.stringify(error) ||
            "Erro desconhecido";

        console.error("ERRO AO REENVIAR INGRESSO:", mensagemErro);

        return NextResponse.json(
            {
                ok: false,
                error: mensagemErro,
            },
            { status: 500 }
        );
    }
}