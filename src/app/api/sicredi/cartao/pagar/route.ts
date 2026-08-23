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
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/* =========================================================
   ÚLTIMOS DÍGITOS
========================================================= */

function obterUltimosDigitos(
  numeroCartao: string
) {
  if (
    numeroCartao.length < 4
  ) {
    return "";
  }

  return numeroCartao.slice(
    -4
  );
}

/* =========================================================
   IDENTIFICAR AMBIENTE LOCAL

   IMPORTANTE:

   Valor de teste e simulação somente podem ser utilizados
   no computador local.

   Mesmo que alguém configure acidentalmente:

   SICREDI_IPG_VALOR_TESTE=true

   ou

   SICREDI_IPG_MODO_SIMULACAO=true

   na Vercel, a rota irá BLOQUEAR o pagamento.

========================================================= */

function verificarAmbienteLocal(
  req: NextRequest
) {
  const hostname =
    String(
      req.nextUrl.hostname || ""
    )
      .trim()
      .toLowerCase();

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

/* =========================================================
   ROTA DE PAGAMENTO
========================================================= */

export async function POST(
  req: NextRequest
) {
  const inicio =
    Date.now();

  try {
    /* =====================================================
       CONFIGURAÇÕES DE SEGURANÇA
    ===================================================== */

    const cartaoAtivo =
      process.env
        .SICREDI_IPG_CARTAO_ATIVO ===
      "true";

    const modoSimulacao =
      process.env
        .SICREDI_IPG_MODO_SIMULACAO ===
      "true";

    const valorTesteAtivo =
      process.env
        .SICREDI_IPG_VALOR_TESTE ===
      "true";

    const ambienteLocal =
      verificarAmbienteLocal(
        req
      );

    const ambientePublicado =
      !ambienteLocal;

    /* =====================================================
       CARTÃO DESATIVADO
    ===================================================== */

    if (
      !cartaoAtivo
    ) {
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
       TRAVA PRINCIPAL DE PRODUÇÃO

       Nenhum site publicado pode utilizar:

       - simulação;
       - valor teste.

       Isso inclui:
       - domínio oficial;
       - Vercel;
       - Preview da Vercel;
       - qualquer servidor externo.

       Somente localhost pode utilizar testes.
    ===================================================== */

    if (
      ambientePublicado &&
      (
        modoSimulacao ||
        valorTesteAtivo
      )
    ) {
      console.error(
        "SEGURANÇA IPG: configuração de teste bloqueada em ambiente publicado.",
        {
          ambienteLocal:
            false,

          modoSimulacao,

          valorTesteAtivo,
        }
      );

      return respostaErro(
        "O pagamento foi bloqueado por uma configuração de segurança do servidor.",
        503,
        {
          codigo:
            "CONFIGURACAO_TESTE_BLOQUEADA",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       LER CORPO DA REQUISIÇÃO
    ===================================================== */

    let body:
      CorpoPagamento;

    try {
      body =
        (
          await req.json()
        ) as CorpoPagamento;
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

    /*
     * O Parque trabalha
     * somente com crédito à vista.
     */

    const parcelas =
      Number(
        body.parcelas ||
        1
      );

    /* =====================================================
       VALIDAR PEDIDO
    ===================================================== */

    if (
      !pedidoId
    ) {
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
       PROTEÇÃO CONTRA PARCELAMENTO

       Mesmo que alguém modifique
       JavaScript ou requisição,
       somente 1 parcela será aceita.
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

    /* =====================================================
       VALIDAR VALIDADE
    ===================================================== */

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

    /* =====================================================
       VALIDAR CVV
    ===================================================== */

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
       BUSCAR PEDIDO NO FIRESTORE

       Esta é a fonte oficial do valor.

       NÃO utilizamos valor enviado
       pelo navegador.
    ===================================================== */

    const pedido:
      any =
      await buscarPedidoPorId(
        pedidoId
      );

    if (
      !pedido
    ) {
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
       IMPEDIR COBRANÇA DUPLA
    ===================================================== */

    if (
      pedido.statusPagamento ===
      "pago"
    ) {
      return NextResponse.json(
        {
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
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /* =====================================================
       VALOR REAL DO PEDIDO

       ÚNICA fonte válida:
       Firestore → pedido.valorTotal
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
       DEFINIR VALOR DA COBRANÇA

       PRODUÇÃO:
       sempre valorPedido.

       LOCALHOST:
       permite R$ 1 somente se
       SICREDI_IPG_VALOR_TESTE=true.

       Uma agência não consegue controlar
       este valor pela URL ou navegador.
    ===================================================== */

    let valorCobranca =
      valorPedido;

    if (
      ambienteLocal &&
      valorTesteAtivo
    ) {
      valorCobranca =
        1;
    }

    /*
     * Proteção adicional.
     *
     * Em ambiente publicado,
     * garantimos novamente que
     * valorCobranca é exatamente
     * o valor salvo no pedido.
     */

    if (
      ambientePublicado
    ) {
      valorCobranca =
        valorPedido;
    }

    /* =====================================================
       VALIDAÇÃO FINAL DO VALOR
    ===================================================== */

    if (
      !Number.isFinite(
        valorCobranca
      ) ||
      valorCobranca <= 0
    ) {
      return respostaErro(
        "Não foi possível determinar o valor da cobrança.",
        500,
        {
          codigo:
            "VALOR_COBRANCA_INVALIDO",

          tempoMs:
            Date.now() -
            inicio,
        }
      );
    }

    /* =====================================================
       LOG SEGURO

       Não mostra cartão nem CVV.
    ===================================================== */

    console.log(
      "PAGAMENTO CARTÃO IPG:",
      {
        pedidoId,

        ambiente:
          ambienteLocal
            ? "local"
            : "publicado",

        valorPedido,

        valorCobranca,

        modoSimulacao,

        valorTesteAtivo:
          ambienteLocal
            ? valorTesteAtivo
            : false,

        parcelas:
          1,
      }
    );

    const ultimosDigitos =
      obterUltimosDigitos(
        numeroCartao
      );

    /* =====================================================
       SIMULAÇÃO LOCAL

       NÃO envia:
       - cartão;
       - CVV;
       - cobrança;

       ao Sicredi.

       Serve somente para testar:
       - pedido;
       - reserva;
       - QR Code;
       - PDF;
       - e-mail;
       - portaria.

    ===================================================== */

    if (
      modoSimulacao
    ) {
      /*
       * Essa verificação é redundante
       * de propósito.
       *
       * Mesmo se futuramente alguém
       * alterar a primeira proteção,
       * a simulação continua impedida
       * fora do localhost.
       */

      if (
        !ambienteLocal
      ) {
        return respostaErro(
          "Simulação não autorizada neste ambiente.",
          403,
          {
            codigo:
              "SIMULACAO_FORA_LOCALHOST",

            tempoMs:
              Date.now() -
              inicio,
          }
        );
      }

      const transactionId =
        `SIM-${Date.now()}-${pedidoId.slice(
          0,
          8
        )}`;

      const resultadoFinalizacao =
        await finalizarPagamento(
          {
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
          }
        );

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

      return NextResponse.json(
        {
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
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /* =====================================================
       TRANSAÇÃO REAL

       Somente chega aqui quando:

       - cartão ativo;
       - pedido válido;
       - valor válido;
       - cartão válido;
       - não está em simulação.

       Em ambiente publicado:
       valorCobranca === valorPedido.

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
     * NUNCA imprimir xmlVenda.
     *
     * Esse XML contém:
     * - número do cartão;
     * - CVV.
     */

    const respostaIpg =
      await enviarSoapIpg(
        xmlVenda
      );

    /* =====================================================
       LOG SEGURO DO IPG

       Não mostra:
       - cartão;
       - CVV;
       - XML.
    ===================================================== */

    console.log(
      "RESPOSTA CARTAO IPG:",
      {
        httpStatus:
          respostaIpg
            .httpStatus,

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
      }
    );

    const identificadorTransacao =
      respostaIpg.orderId ||
      respostaIpg
        .processorReferenceNumber ||
      respostaIpg
        .processorTraceNumber ||
      "";

    /* =====================================================
       PAGAMENTO APROVADO
    ===================================================== */

    if (
      respostaIpg.aprovado
    ) {
      /*
       * Proteção adicional:
       *
       * Em ambiente publicado o valor
       * considerado pago é SEMPRE o
       * valor real do pedido.
       */

      const valorPagoConfirmado =
        valorPedido;

      const resultadoFinalizacao =
        await finalizarPagamento(
          {
            pedidoId,

            formaPagamento:
              "cartao",

            valorPago:
              valorPagoConfirmado,

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
          }
        );

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
        }
      );

      return NextResponse.json(
        {
          ok: true,

          aprovado:
            true,

          simulado:
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
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
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
      }
    );

    return NextResponse.json(
      {
        ok: false,

        aprovado:
          false,

        simulado:
          false,

        recusado:
          Boolean(
            respostaIpg
              .recusado
          ),

        fraude:
          Boolean(
            respostaIpg
              .fraude
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

        tempoMs:
          Date.now() -
          inicio,
      },
      {
        status:
          402,

        headers: {
          "Cache-Control":
            "no-store",
        },
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
     * Não imprimir o erro completo.
     *
     * Algumas bibliotecas podem
     * incluir dados sensíveis
     * da requisição.
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

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}