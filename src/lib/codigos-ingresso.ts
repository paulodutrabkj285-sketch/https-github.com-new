/** Código estável por pedido, compatível com os leitores de ingresso. */
export function gerarCodigoIngresso(pedidoId: string): string {
  return `PMN-${pedidoId}`;
}

/** No carrinho, cada atração recebe um código independente. */
export function gerarCodigosCarrinho(pedidoId: string) {
  return {
    codigoParque: gerarCodigoIngresso(pedidoId),
    codigoElevador: `PMN-ELEV-${pedidoId}`,
  };
}
