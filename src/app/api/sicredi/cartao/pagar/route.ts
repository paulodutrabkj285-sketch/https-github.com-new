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

import {
  finalizarPagamento,
} from "../../../../../lib/finalizar-pagamento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TIPOS
   ========================================================= */

type CorpoPagamento = {
  pedidoId?: string;
  numeroCartao?: string;
  mesValidade?: string;
  anoValidade?: string;
  cvv?: string;
  parcelas?: number;
};

/* =========================================================
   RESPOSTA DE ERRO
   ========================================================= */

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
    {
      status,
    }
  );
}

/* =========================================================
   ÚLTIMOS 4 DÍGITOS
   ========================================================= */

function obterUltimosDigitos(
  numeroCartao: string
) {
  if (numeroCartao.length < 4) {
    return "";
  }

  return numeroCartao.slice(-4);
}

/* =========================================================
   ROTA POST
   ========================================================= */

export async function POST(
  req: NextRequest
) {
  const inicio = Date.now();

  try {
    /* =====================================================
       CONFIGURAÇÕES DE SEGURANÇA
       ===================================================== */

    const cartaoAtivo =
      process.env.SICREDI_IPG_CARTAO_ATIVO ===
      "true";

    const modoSimulacao =
      process.env.SICREDI_IPG_MODO_SIMULACAO ===
      "true";

    const valorTesteAtivo =
      process.env.SICREDI_IPG_VALOR_TESTE ===
      "true";

    const ambienteProducao =
      process.env.NODE_ENV ===
      "production";

    /* =====================================================
       CARTÃO DESATIVADO
       ===================================================== */

    if (!cartaoAtivo) {
      return respostaErro(
        "Pagamento com cartão está desativado para segurança.",
        503,
        {
          codigo:
            "CARTAO_DESATIVADO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       BLOQUEIO DE SIMULAÇÃO EM PRODUÇÃO
       ===================================================== */

    if (
      modoSimulacao &&
      ambienteProducao
    ) {
      return respostaErro(
        "O modo de simulação não pode ser usado em produção.",
        403,
        {
          codigo:
            "SIMULACAO_BLOQUEADA_PRODUCAO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       BLOQUEIO ABSOLUTO DO TESTE R$ 1 EM PRODUÇÃO

       Esta é a trava principal.

       SICREDI_IPG_VALOR_TESTE=true
       jamais poderá efetuar uma transação
       no site publicado.
       ===================================================== */

    if (
      valorTesteAtivo &&
      ambienteProducao
    ) {
      console.error(
        "BLOQUEIO DE SEGURANÇA: tentativa de usar valor de teste em produção."
      );

      return respostaErro(
        "O modo de teste de R$ 1,00 não pode ser utilizado em produção.",
        403,
        {
          codigo:
            "VALOR_TESTE_BLOQUEADO_PRODUCAO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       LER BODY
       ===================================================== */

    let body: CorpoPagamento;

    try {
      body =
        (await req.json()) as CorpoPagamento;
    } catch {
      return respostaErro(
        "Os dados enviados para o pagamento são inválidos.",
        400,
        {
          codigo:
            "CORPO_INVALIDO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       NORMALIZAR DADOS
       ===================================================== */

    const pedidoId =
      String(
        body.pedidoId ||
        ""
      ).trim();

    const numeroCartao =
      somenteDigitos(
        body.numeroCartao
      );

    const mesValidade =
      somenteDigitos(
        body.mesValidade
      );

    const anoValidade =
      somenteDigitos(
        body.anoValidade
      );

    const cvv =
      somenteDigitos(
        body.cvv
      );

    const parcelas =
      Number(
        body.parcelas ||
        1
      );

    /* =====================================================
       VALIDAR PEDIDO
       ===================================================== */

    if (!pedidoId) {
      return respostaErro(
        "Pedido não informado.",
        400,
        {
          codigo:
            "PEDIDO_NAO_INFORMADO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       PARCELAMENTO

       Por enquanto somente crédito à vista.
       ===================================================== */

    if (
      !Number.isInteger(
        parcelas
      ) ||
      parcelas !== 1
    ) {
      return respostaErro(
        "O pagamento com cartão está disponível somente no crédito à vista.",
        400,
        {
          codigo:
            "PARCELAMENTO_NAO_PERMITIDO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       VALIDAR CARTÃO
       ===================================================== */

    if (
      !validarNumeroCartao(
        numeroCartao
      )
    ) {
      return respostaErro(
        "Número do cartão inválido.",
        400,
        {
          codigo:
            "CARTAO_INVALIDO",

          tempoMs:
            Date.now() -
            inicio,
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
          codigo:
            "VALIDADE_INVALIDA",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    if (
      !validarCvv(
        cvv
      )
    ) {
      return respostaErro(
        "Código de segurança inválido.",
        400,
        {
          codigo:
            "CVV_INVALIDO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       BUSCAR PEDIDO
       ===================================================== */

    const pedido: any =
      await buscarPedidoPorId(
        pedidoId
      );

    if (!pedido) {
      return respostaErro(
        "Pedido não encontrado.",
        404,
        {
          codigo:
            "PEDIDO_NAO_ENCONTRADO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       PEDIDO JÁ PAGO
       ===================================================== */

    if (
      pedido.statusPagamento ===
      "pago"
    ) {
      return NextResponse.json({
        ok: true,
        aprovado: true,
        jaPago: true,

        mensagem:
          "Este pedido já está pago.",

        pedidoId,

        codigoIngresso:
          pedido.codigoIngresso ||
          null,

        tempoMs:
          Date.now() -
          inicio,
      });
    }

    /* =====================================================
       VALOR REAL DO PEDIDO
       ===================================================== */

    const valorPedido =
      Number(
        pedido.valorTotal ||
        0
      );

    if (
      !Number.isFinite(
        valorPedido
      ) ||
      valorPedido <= 0
    ) {
      return respostaErro(
        "O pedido possui valor inválido.",
        400,
        {
          codigo:
            "VALOR_PEDIDO_INVALIDO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       VALOR ENVIADO AO SICREDI

       TESTE LOCAL:
       R$ 1,00

       PRODUÇÃO:
       valor verdadeiro do pedido
       ===================================================== */

    const valorCobranca =
      valorTesteAtivo
        ? 1
        : valorPedido;

    const ultimosDigitos =
      obterUltimosDigitos(
        numeroCartao
      );

    /* =====================================================
       LOG SEGURO DO MODO DE TESTE

       Não imprime cartão ou CVV.
       ===================================================== */

    if (valorTesteAtivo) {
      console.log(
        "=========================================="
      );

      console.log(
        "TESTE REAL SICREDI IPG - R$ 1,00"
      );

      console.log({
        pedidoId,

        valorPedidoReal:
          valorPedido,

        valorEnviadoSicredi:
          valorCobranca,

        pedidoSeraFinalizado:
          false,

        ambiente:
          process.env.NODE_ENV,
      });

      console.log(
        "=========================================="
      );
    }

    /* =====================================================
       SIMULAÇÃO LOCAL

       Não envia nenhuma cobrança.
       ===================================================== */

    if (modoSimulacao) {
      const transactionId =
        `SIM-${Date.now()}-${pedidoId.slice(
          0,
          8
        )}`;

      const resultadoFinalizacao =
        await finalizarPagamento({
          pedidoId,

          formaPagamento:
            "cartao",

          valorPago:
            valorPedido,

          cartaoTransacaoId:
            transactionId,

          cartaoAutorizacao:
            "SIMULADO",

          cartaoStatus:
            "aprovado_simulacao",

          cartaoUltimosDigitos:
            ultimosDigitos,

          cartaoParcelas:
            1,
        });

      await atualizarPedido(
        pedidoId,
        {
          formaPagamento:
            "cartao",

          parcelas:
            1,

          cartaoGateway:
            "sicredi-ipg-simulacao",

          sicrediCartaoApprovalCode:
            "SIMULADO",

          sicrediCartaoProcessorCode:
            "00",

          sicrediCartaoProcessorMessage:
            "Pagamento aprovado em simulação local.",

          pagamentoSimulado:
            true,

          pagamentoSimuladoEm:
            new Date()
              .toISOString(),
        }
      );

      return NextResponse.json({
        ok: true,
        aprovado: true,
        simulado: true,

        mensagem:
          "Pagamento aprovado em simulação local.",

        pedidoId,

        transactionId,

        approvalCode:
          "SIMULADO",

        codigoIngresso:
          resultadoFinalizacao
            .codigoIngresso ||
          null,

        emailEnviado:
          resultadoFinalizacao
            .emailEnviado ||
          false,

        statusFinalizacao:
          resultadoFinalizacao
            .status,

        tempoMs:
          Date.now() -
          inicio,
      });
    }

    /* =====================================================
       TRANSAÇÃO REAL IPG
       ===================================================== */

    const configuracao =
      obterConfiguracaoIpg();

    const xmlVenda =
      criarXmlVendaCartao(
        configuracao,
        {
          numeroCartao,

          mesValidade,

          anoValidade,

          cvv,

          valor:
            valorCobranca,

          pedidoId,

          nomeEstabelecimento:
            "PARQUE MUNDO NOVO",
        }
      );

    /*
     * IMPORTANTE:
     *
     * Nunca imprimir xmlVenda.
     *
     * Ele contém cartão e CVV.
     */

    const respostaIpg =
      await enviarSoapIpg(
        xmlVenda
      );

    /* =====================================================
       LOG SEGURO DA RESPOSTA
       ===================================================== */

    console.log(
      "RESPOSTA CARTAO IPG:",
      {
        httpStatus:
          respostaIpg.httpStatus,

        transactionResult:
          respostaIpg
            .transactionResult,

        processorResponseCode:
          respostaIpg
            .processorResponseCode,

        processorResponseMessage:
          respostaIpg
            .processorResponseMessage,

        approvalCode:
          respostaIpg
            .approvalCode,

        errorMessage:
          respostaIpg
            .errorMessage,

        faultCode:
          respostaIpg
            .faultCode,

        faultString:
          respostaIpg
            .faultString,

        valorTesteAtivo,

        valorEnviado:
          valorCobranca,
      }
    );

    /* =====================================================
       IDENTIFICADOR DA TRANSAÇÃO
       ===================================================== */

    const identificadorTransacao =
      respostaIpg.orderId ||
      respostaIpg
        .processorReferenceNumber ||
      respostaIpg
        .processorTraceNumber ||
      "";

    /* =====================================================
       APROVADO PELO SICREDI
       ===================================================== */

    if (
      respostaIpg.aprovado
    ) {
      /* ===================================================
         MODO TESTE R$ 1

         MUITO IMPORTANTE:

         NÃO chama finalizarPagamento.

         Portanto:
         - pedido continua pendente
         - ingresso não é liberado
         - QR não é liberado como pago
         - e-mail de ingresso não é enviado
         =================================================== */

      if (valorTesteAtivo) {
        await atualizarPedido(
          pedidoId,
          {
            formaPagamento:
              "cartao",

            parcelas:
              1,

            cartaoGateway:
              "sicredi-ipg",

            cartaoStatus:
              "aprovado_teste_1_real",

            cartaoTransacaoId:
              identificadorTransacao,

            cartaoUltimosDigitos:
              ultimosDigitos,

            sicrediCartaoApprovalCode:
              respostaIpg
                .approvalCode ||
              "",

            sicrediCartaoProcessorCode:
              respostaIpg
                .processorResponseCode ||
              "",

            sicrediCartaoProcessorMessage:
              respostaIpg
                .processorResponseMessage ||
              "",

            sicrediCartaoReceiptNumber:
              respostaIpg
                .processorReceiptNumber ||
              "",

            sicrediCartaoTraceNumber:
              respostaIpg
                .processorTraceNumber ||
              "",

            sicrediCartaoReferenceNumber:
              respostaIpg
                .processorReferenceNumber ||
              "",

            sicrediCartaoTransactionTime:
              respostaIpg
                .transactionTime ||
              "",

            /* =============================
               MARCAÇÕES EXCLUSIVAS DO TESTE
               ============================= */

            pagamentoTesteReal:
              true,

            pagamentoTesteValor:
              1,

            pagamentoTesteValorPedido:
              valorPedido,

            pagamentoTesteAprovado:
              true,

            pagamentoTesteFinalizouPedido:
              false,

            pagamentoTesteEm:
              new Date()
                .toISOString(),

            pagamentoSimulado:
              false,

            /*
             * NÃO ALTERAMOS:
             *
             * statusPagamento
             * statusOperacional
             * codigoIngresso
             * qrCodeIngresso
             */
          }
        );

        console.log(
          "TESTE R$ 1 APROVADO - PEDIDO NÃO FINALIZADO:",
          {
            pedidoId,

            valorCobrado:
              1,

            valorRealPedido:
              valorPedido,

            transactionId:
              identificadorTransacao ||
              null,

            pedidoFinalizado:
              false,
          }
        );

        return NextResponse.json({
          ok: true,

          aprovado:
            true,

          testeValor:
            true,

          testeReal:
            true,

          pedidoFinalizado:
            false,

          ingressoLiberado:
            false,

          emailEnviado:
            false,

          valorCobrado:
            1,

          valorRealPedido:
            valorPedido,

          mensagem:
            "Teste real de R$ 1,00 aprovado pelo Sicredi. O pedido NÃO foi marcado como pago e nenhum ingresso foi liberado.",

          pedidoId,

          transactionId:
            identificadorTransacao ||
            null,

          approvalCode:
            respostaIpg
              .approvalCode ||
            null,

          processorResponseCode:
            respostaIpg
              .processorResponseCode ||
            null,

          tempoMs:
            Date.now() -
            inicio,
        });
      }

      /* ===================================================
         PAGAMENTO REAL NORMAL

         Só chega aqui se:
         SICREDI_IPG_VALOR_TESTE=false
         =================================================== */

      const resultadoFinalizacao =
        await finalizarPagamento({
          pedidoId,

          formaPagamento:
            "cartao",

          valorPago:
            valorPedido,

          cartaoTransacaoId:
            identificadorTransacao,

          cartaoAutorizacao:
            respostaIpg
              .approvalCode ||
            "",

          cartaoStatus:
            "aprovado",

          cartaoUltimosDigitos:
            ultimosDigitos,

          cartaoParcelas:
            1,
        });

      await atualizarPedido(
        pedidoId,
        {
          formaPagamento:
            "cartao",

          parcelas:
            1,

          cartaoGateway:
            "sicredi-ipg",

          cartaoStatus:
            "aprovado",

          cartaoTransacaoId:
            identificadorTransacao,

          cartaoUltimosDigitos:
            ultimosDigitos,

          sicrediCartaoApprovalCode:
            respostaIpg
              .approvalCode ||
            "",

          sicrediCartaoProcessorCode:
            respostaIpg
              .processorResponseCode ||
            "",

          sicrediCartaoProcessorMessage:
            respostaIpg
              .processorResponseMessage ||
            "",

          sicrediCartaoReceiptNumber:
            respostaIpg
              .processorReceiptNumber ||
            "",

          sicrediCartaoTraceNumber:
            respostaIpg
              .processorTraceNumber ||
            "",

          sicrediCartaoReferenceNumber:
            respostaIpg
              .processorReferenceNumber ||
            "",

          sicrediCartaoTransactionTime:
            respostaIpg
              .transactionTime ||
            "",

          pagamentoSimulado:
            false,

          pagamentoTesteReal:
            false,
        }
      );

      return NextResponse.json({
        ok: true,

        aprovado:
          true,

        simulado:
          false,

        testeValor:
          false,

        mensagem:
          "Pagamento aprovado e ingresso liberado.",

        pedidoId,

        transactionId:
          identificadorTransacao ||
          null,

        approvalCode:
          respostaIpg
            .approvalCode ||
          null,

        codigoIngresso:
          resultadoFinalizacao
            .codigoIngresso ||
          null,

        emailEnviado:
          resultadoFinalizacao
            .emailEnviado ||
          false,

        statusFinalizacao:
          resultadoFinalizacao
            .status,

        tempoMs:
          Date.now() -
          inicio,
      });
    }

    /* =====================================================
       PAGAMENTO RECUSADO / NÃO APROVADO
       ===================================================== */

    const mensagemRecusa =
      respostaIpg
        .processorResponseMessage ||
      respostaIpg
        .errorMessage ||
      respostaIpg
        .faultString ||
      "Pagamento não aprovado.";

    const statusCartao =
      respostaIpg.fraude
        ? "analise_ou_fraude"
        : valorTesteAtivo
          ? "teste_recusado"
          : "recusado";

    await atualizarPedido(
      pedidoId,
      {
        formaPagamento:
          "cartao",

        parcelas:
          1,

        cartaoStatus:
          statusCartao,

        cartaoGateway:
          "sicredi-ipg",

        cartaoTransacaoId:
          identificadorTransacao,

        cartaoUltimosDigitos:
          ultimosDigitos,

        sicrediCartaoProcessorCode:
          respostaIpg
            .processorResponseCode ||
          "",

        sicrediCartaoProcessorMessage:
          mensagemRecusa,

        sicrediCartaoReceiptNumber:
          respostaIpg
            .processorReceiptNumber ||
          "",

        sicrediCartaoTraceNumber:
          respostaIpg
            .processorTraceNumber ||
          "",

        sicrediCartaoReferenceNumber:
          respostaIpg
            .processorReferenceNumber ||
          "",

        sicrediCartaoTransactionTime:
          respostaIpg
            .transactionTime ||
          "",

        cartaoUltimaTentativaEm:
          new Date()
            .toISOString(),

        pagamentoSimulado:
          false,

        pagamentoTesteReal:
          valorTesteAtivo,

        pagamentoTesteValor:
          valorTesteAtivo
            ? 1
            : null,

        pagamentoTesteAprovado:
          valorTesteAtivo
            ? false
            : null,

        pagamentoTesteEm:
          valorTesteAtivo
            ? new Date()
              .toISOString()
            : null,
      }
    );

    return NextResponse.json(
      {
        ok:
          false,

        aprovado:
          false,

        simulado:
          false,

        testeValor:
          valorTesteAtivo,

        recusado:
          Boolean(
            respostaIpg.recusado
          ),

        fraude:
          Boolean(
            respostaIpg.fraude
          ),

        mensagem:
          mensagemRecusa,

        processorResponseCode:
          respostaIpg
            .processorResponseCode ||
          null,

        transactionId:
          identificadorTransacao ||
          null,

        valorEnviado:
          valorCobranca,

        tempoMs:
          Date.now() -
          inicio,
      },
      {
        status:
          402,
      }
    );
  } catch (
  error: unknown
  ) {
    const erro =
      error as {
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
     * Nunca imprimir o objeto completo.
     *
     * Algumas bibliotecas podem carregar
     * dados sensíveis da requisição.
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
        ok:
          false,

        aprovado:
          false,

        mensagem:
          "Não foi possível processar o cartão. Verifique os dados e tente novamente.",

        codigo,

        tempoMs:
          Date.now() -
          inicio,
      },
      {
        status:
          500,
      }
    );
  }
}