import type { PedidoInput } from "./pedidos";
import { calcularPrecoElevador } from "./preco-elevador";

function gerarCodigoIngresso() {

  const numero =

    Math.floor(

      10000 +

      Math.random() *

      90000

    );

  return `PMN-${numero}`;

}

/* ==========================================

   EXPIRAÇÃO DO PIX

\\========================================== */

function gerarExpiracaoPix() {

  const agora =

    new Date();

  agora.setHours(

    agora.getHours() + 1

  );

  return agora.toISOString();

}

export function prepararPedido(dados: PedidoInput) {
  const quantidadeParque = Number(
    dados.quantidadeParque ??
    (dados.produto === "Ingresso Parque"
      ? dados.quantidade
      : 0)
  );

  const quantidadeElevador = Number(
    dados.quantidadeElevador ??
    dados.qtdElevador ??
    (dados.tipo === "elevador"
      ? dados.quantidade
      : 0)
  );

  const valorUnitarioParque = dados.cortesia ? 0 : 60;

  const valorUnitarioElevador =
    !dados.cortesia && quantidadeElevador > 0
      ? calcularPrecoElevador(
        quantidadeElevador
      ).valorUnitario
      : dados.cortesia ? 0 : 75;

  const valorParque =
    quantidadeParque > 0
      ? Number(
        dados.valorParque ??
        quantidadeParque *
        valorUnitarioParque
      )
      : 0;

  const valorElevador =
    quantidadeElevador > 0
      ? Number(
        dados.valorElevador ??
        quantidadeElevador *
        valorUnitarioElevador
      )
      : 0;

  const ehCarrinhoParqueElevador =
    quantidadeParque > 0 &&
    quantidadeElevador > 0;

  const itensCarrinho =
    ehCarrinhoParqueElevador
      ? [
        {
          tipo: "parque" as const,
          produto: "Ingresso Parque",
          quantidade:
            quantidadeParque,
          valorUnitario:
            valorUnitarioParque,
          valorTotal:
            valorParque,
        },
        {
          tipo: "elevador" as const,
          produto:
            "Elevador Panorâmico",
          quantidade:
            quantidadeElevador,
          valorUnitario:
            valorUnitarioElevador,
          valorTotal:
            valorElevador,
        },
      ]
      : dados.itensCarrinho;

  const codigoIngresso =
    dados.codigoIngresso ||
    gerarCodigoIngresso();

  const codigoIngressoParque =
    quantidadeParque > 0
      ? dados.codigoIngressoParque ||
      codigoIngresso
      : "";

  const codigoIngressoElevador =
    quantidadeElevador > 0
      ? dados.codigoIngressoElevador ||
      gerarCodigoIngresso()
      : "";

  const valorTotalCarrinho =
    ehCarrinhoParqueElevador
      ? valorParque + valorElevador
      : dados.valorTotal;

  return {
        /*
         * Mantém compatibilidade com os pedidos antigos.
         * Quando houver Parque + Elevador no mesmo pedido,
         * o pagamento continua único, mas cada atração recebe
         * seu próprio código/QR e seus próprios campos de uso.
         */
        ...dados,

        ...(dados.tipo === "elevador" &&
          !dados.cortesia &&
          (!dados.origem ||
            dados.origem === "site") &&
          !ehCarrinhoParqueElevador
          ? {
            origem: "site",
            ...calcularPrecoElevador(
              dados.quantidade
            ),
          }
          : {}),

        ...(ehCarrinhoParqueElevador
          ? {
            produto:
              "Carrinho Parque + Elevador",
            tipo: "carrinho",
            quantidade:
              quantidadeParque,
            quantidadeParque,
            valorParque,
            quantidadeElevador,
            qtdElevador:
              quantidadeElevador,
            valorUnitarioElevador,
            valorElevador,
            valorTotal:
              valorTotalCarrinho,
            itensCarrinho,
            elevador: true,
            elevadorValidado: false,
            elevadorQuantidadeValidada: 0,
          }
          : {}),

        codigoIngresso,

        codigoIngressoParque,

        codigoIngressoElevador,

        ...(dados.cortesia ? {
          qrCodeIngresso: codigoIngresso,
          qrCodeIngressoParque: codigoIngressoParque,
          qrCodeIngressoElevador: codigoIngressoElevador,
        } : { expiracaoPix: gerarExpiracaoPix() }),

        createdAt:

          new Date()

            .toISOString(),

  };
}
