import { NextRequest, NextResponse } from "next/server";
import { atualizarPedido } from "@/lib/pedidos";

function mapearStatusPagamento(status: string) {
  switch (status) {
    case "PAID":
      return "pago";
    case "IN_ANALYSIS":
      return "em_analise";
    case "DECLINED":
      return "cancelado";
    case "CANCELED":
      return "cancelado";
    case "WAITING":
      return "pendente";
    case "EXPIRED":
      return "expirado";
    default:
      return "pendente";
  }
}

function gerarCodigoIngresso(pedidoId: string) {
  return `PMN-${pedidoId.slice(0, 8).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Webhook PagBank recebido:", body);

    const referenceId = body?.reference_id || "";
    const statusRecebido = body?.status || "";

    if (!referenceId) {
      return NextResponse.json(
        { ok: false, error: "Webhook sem reference_id." },
        { status: 400 }
      );
    }

    const statusPagamento = mapearStatusPagamento(statusRecebido);

    const dadosAtualizacao: Record<string, unknown> = {
      pagbankStatus: statusRecebido,
      statusPagamento,
    };

    if (statusPagamento === "pago") {
      dadosAtualizacao.codigoIngresso = gerarCodigoIngresso(referenceId);
      dadosAtualizacao.qrCodeIngresso = gerarCodigoIngresso(referenceId);
    }

    await atualizarPedido(referenceId, dadosAtualizacao);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}