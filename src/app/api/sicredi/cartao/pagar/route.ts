import { NextRequest, NextResponse } from "next/server";
import {
  criarXmlVendaCartao,
  enviarSoapIpg,
  obterConfiguracaoIpg,
  somenteDigitos,
  validarCvv,
  validarNumeroCartao,
  validarValidadeCartao,
} from "@/lib/sicredi-ipg";
import {
  atualizarPedido,
  buscarPedidoPorId,
} from "@/lib/pedidos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CorpoPagamento = {
  pedidoId?: string;
  numeroCartao?: string;
  mesValidade?: string;
  anoValidade?: string;
  cvv?: string;
  parcelas?: number;
};

function respostaErro(
  mensagem: string,
  status: number,
  detalhes?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      ok: false,
      mensagem,
      ...(detalhes || {}),
    },
    { status }
  );
}

export async function POST(req: NextRequest) {
  const inicio = Date.now();

  try {
    const cartaoAtivo =
      process.env.SICREDI_IPG_CARTAO_ATIVO === "true";

    const modoSimulacao =
      process.env.SICREDI_IPG_MODO_SIMULACAO === "true";

    if (!cartaoAtivo) {
      return respostaErro(
        "Pagamento com cartão está desativado para segurança.",
        503,
        {
          codigo: "CARTAO_DESATIVADO",
        }
      );
    }

    /*
     * Segurança adicional:
     * a simulação só pode funcionar no ambiente local.
     */
    if (
      modoSimulacao &&
      process.env.NODE_ENV === "production"
    ) {
      return respostaErro(
        "O modo de simulação não pode ser usado em produção.",
        403,
        {
          codigo: "SIMULACAO_BLOQUEADA_PRODUCAO",
        }
      );
    }

    const body = (await req.json()) as CorpoPagamento;

    const pedidoId = String(body.pedidoId || "").trim();
    const numeroCartao = somenteDigitos(body.numeroCartao);
    const mesValidade = somenteDigitos(body.mesValidade);
    const anoValidade = somenteDigitos(body.anoValidade);
    const cvv = somenteDigitos(body.cvv);
    const parcelas = Number(body.parcelas || 1);

    if (!pedidoId) {
      return respostaErro(
        "Pedido não informado.",
        400
      );
    }

    if (parcelas !== 1) {
      return respostaErro(
        "No momento, o pagamento com cartão aceita somente 1 parcela.",
        400
      );
    }

    if (!validarNumeroCartao(numeroCartao)) {
      return respostaErro(
        "Número do cartão inválido.",
        400
      );
    }

    if (
      !validarValidadeCartao(
        mesValidade,
        anoValidade
      )
    ) {
      return respostaErro(
        "Validade do cartão inválida.",
        400
      );
    }

    if (!validarCvv(cvv)) {
      return respostaErro(
        "Código de segurança inválido.",
        400
      );
    }

    const pedido = await buscarPedidoPorId(pedidoId);

    if (!pedido) {
      return respostaErro(
        "Pedido não encontrado.",
        404
      );
    }

    if (pedido.statusPagamento === "pago") {
      return NextResponse.json({
        ok: true,
        jaPago: true,
        mensagem: "Este pedido já está pago.",
        pedidoId,
      });
    }

    const valorPedido = Number(pedido.valorTotal || 0);

    if (
      !Number.isFinite(valorPedido) ||
      valorPedido <= 0
    ) {
      return respostaErro(
        "O pedido possui valor inválido.",
        400
      );
    }

    /*
     * SIMULAÇÃO LOCAL
     *
     * Não envia cartão, CVV, XML ou qualquer requisição
     * para o Sicredi/Fiserv.
     */
    if (modoSimulacao) {
      const transactionId =
        `SIM-${Date.now()}-${pedidoId.slice(0, 8)}`;

      await atualizarPedido(pedidoId, {
        formaPagamento: "cartao",
        parcelas: 1,
        cartaoStatus: "aprovado_simulacao",
        cartaoGateway: "sicredi-ipg-simulacao",
        cartaoTransactionId: transactionId,
        statusPagamento: "pago",

        sicrediCartaoApprovalCode: "SIMULADO",
        sicrediCartaoProcessorCode: "00",
        sicrediCartaoProcessorMessage:
          "Pagamento aprovado em simulação local.",

        pagamentoSimulado: true,
        pagamentoSimuladoEm:
          new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        aprovado: true,
        simulado: true,
        mensagem:
          "Pagamento aprovado em simulação local.",
        pedidoId,
        transactionId,
        approvalCode: "SIMULADO",
        tempoMs: Date.now() - inicio,
      });
    }

    /*
     * TRANSAÇÃO REAL
     *
     * Este bloco somente será executado quando:
     *
     * SICREDI_IPG_CARTAO_ATIVO=true
     * SICREDI_IPG_MODO_SIMULACAO=false
     */
    const configuracao = obterConfiguracaoIpg();

    const xmlVenda = criarXmlVendaCartao(
      configuracao,
      {
        numeroCartao,
        mesValidade,
        anoValidade,
        cvv,
        valor: valorPedido,
        pedidoId,
        nomeEstabelecimento:
          "PARQUE MUNDO NOVO",
      }
    );

    /*
     * Não registrar xmlVenda no console.
     * Ele contém cartão e CVV.
     */
    const respostaIpg =
      await enviarSoapIpg(xmlVenda);

    const identificadorTransacao =
      respostaIpg.orderId ||
      respostaIpg.processorReferenceNumber ||
      respostaIpg.processorTraceNumber ||
      "";

    if (respostaIpg.aprovado) {
      await atualizarPedido(pedidoId, {
        formaPagamento: "cartao",
        parcelas: 1,
        cartaoStatus: "aprovado",
        cartaoGateway: "sicredi-ipg",
        cartaoTransactionId:
          identificadorTransacao,
        statusPagamento: "pago",

        sicrediCartaoApprovalCode:
          respostaIpg.approvalCode || "",

        sicrediCartaoProcessorCode:
          respostaIpg.processorResponseCode || "",

        sicrediCartaoProcessorMessage:
          respostaIpg.processorResponseMessage || "",

        sicrediCartaoReceiptNumber:
          respostaIpg.processorReceiptNumber || "",

        sicrediCartaoTraceNumber:
          respostaIpg.processorTraceNumber || "",

        sicrediCartaoReferenceNumber:
          respostaIpg.processorReferenceNumber || "",

        sicrediCartaoTransactionTime:
          respostaIpg.transactionTime || "",
      });

      return NextResponse.json({
        ok: true,
        aprovado: true,
        simulado: false,
        mensagem: "Pagamento aprovado.",
        pedidoId,
        transactionId:
          identificadorTransacao || null,
        approvalCode:
          respostaIpg.approvalCode || null,
        tempoMs: Date.now() - inicio,
      });
    }

    const mensagemRecusa =
      respostaIpg.processorResponseMessage ||
      respostaIpg.errorMessage ||
      respostaIpg.faultString ||
      "Pagamento não aprovado.";

    await atualizarPedido(pedidoId, {
      formaPagamento: "cartao",
      parcelas: 1,

      cartaoStatus: respostaIpg.fraude
        ? "analise_ou_fraude"
        : "recusado",

      cartaoGateway: "sicredi-ipg",

      cartaoTransactionId:
        identificadorTransacao,

      sicrediCartaoProcessorCode:
        respostaIpg.processorResponseCode || "",

      sicrediCartaoProcessorMessage:
        mensagemRecusa,
    });

    return NextResponse.json(
      {
        ok: false,
        aprovado: false,
        simulado: false,
        recusado: respostaIpg.recusado,
        fraude: respostaIpg.fraude,
        mensagem: mensagemRecusa,

        processorResponseCode:
          respostaIpg.processorResponseCode ||
          null,

        tempoMs: Date.now() - inicio,
      },
      { status: 402 }
    );
  } catch (error: unknown) {
    const erro = error as {
      code?: string;
      message?: string;
      cause?: {
        code?: string;
        message?: string;
      };
    };

    const codigo =
      erro?.code ||
      erro?.cause?.code ||
      null;

    const mensagem =
      erro?.message ||
      erro?.cause?.message ||
      "Erro interno ao processar o cartão.";

    console.error(
      "Erro na rota de cartão Sicredi:",
      {
        codigo,
        mensagem,
      }
    );

    return NextResponse.json(
      {
        ok: false,
        aprovado: false,
        mensagem:
          "Não foi possível processar o cartão.",
        codigo,
        tempoMs: Date.now() - inicio,
      },
      { status: 500 }
    );
  }
}