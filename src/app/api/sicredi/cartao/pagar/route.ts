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
import { finalizarPagamento } from "@/lib/finalizar-pagamento";

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
      aprovado: false,
      mensagem,
      ...(detalhes || {}),
    },
    { status }
  );
}

function obterUltimosDigitos(numeroCartao: string) {
  if (numeroCartao.length < 4) {
    return "";
  }

  return numeroCartao.slice(-4);
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
          tempoMs: Date.now() - inicio,
        }
      );
    }

    /*
     * O modo de simulação é permitido somente no ambiente local.
     * Isso impede que uma compra falsa seja aprovada em produção.
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
          tempoMs: Date.now() - inicio,
        }
      );
    }

    let body: CorpoPagamento;

    try {
      body = (await req.json()) as CorpoPagamento;
    } catch {
      return respostaErro(
        "Os dados enviados para o pagamento são inválidos.",
        400,
        {
          codigo: "CORPO_INVALIDO",
          tempoMs: Date.now() - inicio,
        }
      );
    }

    const pedidoId = String(body.pedidoId || "").trim();
    const numeroCartao = somenteDigitos(body.numeroCartao);
    const mesValidade = somenteDigitos(body.mesValidade);
    const anoValidade = somenteDigitos(body.anoValidade);
    const cvv = somenteDigitos(body.cvv);
    const parcelas = Number(body.parcelas || 1);

    if (!pedidoId) {
      return respostaErro(
        "Pedido não informado.",
        400,
        {
          codigo: "PEDIDO_NAO_INFORMADO",
          tempoMs: Date.now() - inicio,
        }
      );
    }

    if (
      !Number.isInteger(parcelas) ||
      parcelas !== 1
    ) {
      return respostaErro(
        "No momento, o pagamento com cartão aceita somente 1 parcela.",
        400,
        {
          codigo: "PARCELAMENTO_NAO_PERMITIDO",
          tempoMs: Date.now() - inicio,
        }
      );
    }

    if (!validarNumeroCartao(numeroCartao)) {
      return respostaErro(
        "Número do cartão inválido.",
        400,
        {
          codigo: "CARTAO_INVALIDO",
          tempoMs: Date.now() - inicio,
        }
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
        400,
        {
          codigo: "VALIDADE_INVALIDA",
          tempoMs: Date.now() - inicio,
        }
      );
    }

    if (!validarCvv(cvv)) {
      return respostaErro(
        "Código de segurança inválido.",
        400,
        {
          codigo: "CVV_INVALIDO",
          tempoMs: Date.now() - inicio,
        }
      );
    }

    const pedido: any = await buscarPedidoPorId(pedidoId);

    if (!pedido) {
      return respostaErro(
        "Pedido não encontrado.",
        404,
        {
          codigo: "PEDIDO_NAO_ENCONTRADO",
          tempoMs: Date.now() - inicio,
        }
      );
    }

    if (pedido.statusPagamento === "pago") {
      return NextResponse.json({
        ok: true,
        aprovado: true,
        jaPago: true,
        mensagem: "Este pedido já está pago.",
        pedidoId,
        codigoIngresso:
          pedido.codigoIngresso || null,
        tempoMs: Date.now() - inicio,
      });
    }

    const valorPedido = Number(pedido.valorTotal || 0);

    if (
      !Number.isFinite(valorPedido) ||
      valorPedido <= 0
    ) {
      return respostaErro(
        "O pedido possui valor inválido.",
        400,
        {
          codigo: "VALOR_PEDIDO_INVALIDO",
          tempoMs: Date.now() - inicio,
        }
      );
    }

    const ultimosDigitos =
      obterUltimosDigitos(numeroCartao);

    /*
     * SIMULAÇÃO LOCAL
     *
     * Nenhum dado do cartão é enviado ao Sicredi/Fiserv.
     * A função central finaliza o pagamento, libera o ingresso
     * e tenta enviar o e-mail com o PDF.
     */
    if (modoSimulacao) {
      const transactionId =
        `SIM-${Date.now()}-${pedidoId.slice(0, 8)}`;

      const resultadoFinalizacao =
        await finalizarPagamento({
          pedidoId,
          formaPagamento: "cartao",
          valorPago: valorPedido,
          cartaoTransacaoId: transactionId,
          cartaoAutorizacao: "SIMULADO",
          cartaoStatus: "aprovado_simulacao",
          cartaoUltimosDigitos: ultimosDigitos,
          cartaoParcelas: parcelas,
        });

      await atualizarPedido(pedidoId, {
        cartaoGateway: "sicredi-ipg-simulacao",

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

        codigoIngresso:
          resultadoFinalizacao.codigoIngresso ||
          null,

        emailEnviado:
          resultadoFinalizacao.emailEnviado ||
          false,

        statusFinalizacao:
          resultadoFinalizacao.status,

        tempoMs: Date.now() - inicio,
      });
    }

    /*
     * TRANSAÇÃO REAL
     *
     * Este bloco será executado somente quando:
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
     * Nunca registrar xmlVenda no console.
     * Ele contém número do cartão e CVV.
     */
    const respostaIpg =
      await enviarSoapIpg(xmlVenda);

    const identificadorTransacao =
      respostaIpg.orderId ||
      respostaIpg.processorReferenceNumber ||
      respostaIpg.processorTraceNumber ||
      "";

    /*
     * PAGAMENTO APROVADO
     */
    if (respostaIpg.aprovado) {
      const resultadoFinalizacao =
        await finalizarPagamento({
          pedidoId,
          formaPagamento: "cartao",
          valorPago: valorPedido,

          cartaoTransacaoId:
            identificadorTransacao,

          cartaoAutorizacao:
            respostaIpg.approvalCode || "",

          cartaoStatus: "aprovado",

          cartaoUltimosDigitos:
            ultimosDigitos,

          cartaoParcelas:
            parcelas,
        });

      /*
       * Guarda os dados específicos da resposta IPG.
       * A lib finalizar-pagamento cuida do estado geral,
       * ingresso, QR Code e e-mail.
       */
      await atualizarPedido(pedidoId, {
        cartaoGateway: "sicredi-ipg",

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

        pagamentoSimulado: false,
      });

      return NextResponse.json({
        ok: true,
        aprovado: true,
        simulado: false,

        mensagem:
          "Pagamento aprovado e ingresso liberado.",

        pedidoId,

        transactionId:
          identificadorTransacao || null,

        approvalCode:
          respostaIpg.approvalCode || null,

        codigoIngresso:
          resultadoFinalizacao.codigoIngresso ||
          null,

        emailEnviado:
          resultadoFinalizacao.emailEnviado ||
          false,

        statusFinalizacao:
          resultadoFinalizacao.status,

        tempoMs: Date.now() - inicio,
      });
    }

    /*
     * PAGAMENTO NÃO APROVADO
     */
    const mensagemRecusa =
      respostaIpg.processorResponseMessage ||
      respostaIpg.errorMessage ||
      respostaIpg.faultString ||
      "Pagamento não aprovado.";

    const statusCartao =
      respostaIpg.fraude
        ? "analise_ou_fraude"
        : "recusado";

    await atualizarPedido(pedidoId, {
      formaPagamento: "cartao",
      parcelas,

      cartaoStatus: statusCartao,
      cartaoGateway: "sicredi-ipg",

      cartaoTransacaoId:
        identificadorTransacao,

      cartaoUltimosDigitos:
        ultimosDigitos,

      sicrediCartaoProcessorCode:
        respostaIpg.processorResponseCode || "",

      sicrediCartaoProcessorMessage:
        mensagemRecusa,

      sicrediCartaoReceiptNumber:
        respostaIpg.processorReceiptNumber || "",

      sicrediCartaoTraceNumber:
        respostaIpg.processorTraceNumber || "",

      sicrediCartaoReferenceNumber:
        respostaIpg.processorReferenceNumber || "",

      sicrediCartaoTransactionTime:
        respostaIpg.transactionTime || "",

      cartaoUltimaTentativaEm:
        new Date().toISOString(),

      pagamentoSimulado: false,
    });

    return NextResponse.json(
      {
        ok: false,
        aprovado: false,
        simulado: false,

        recusado:
          Boolean(respostaIpg.recusado),

        fraude:
          Boolean(respostaIpg.fraude),

        mensagem:
          mensagemRecusa,

        processorResponseCode:
          respostaIpg.processorResponseCode ||
          null,

        transactionId:
          identificadorTransacao || null,

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

    /*
     * Não imprimir objeto completo do erro.
     * Algumas bibliotecas podem incluir dados da requisição.
     */
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
          "Não foi possível processar o cartão. Verifique os dados e tente novamente.",

        codigo,
        tempoMs: Date.now() - inicio,
      },
      { status: 500 }
    );
  }
}