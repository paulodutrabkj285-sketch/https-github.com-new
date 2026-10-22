export const PROMOCAO_ELEVADOR = "combo-elevador-site-v1";
export const VALOR_UNITARIO_ELEVADOR = 75;

export function calcularPrecoElevador(quantidade: number) {
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error("Quantidade de ingressos inválida.");
  }
  const desconto = Math.floor(quantidade / 2) * 30;
  return {
    valorUnitario: VALOR_UNITARIO_ELEVADOR,
    valorSubtotal: quantidade * VALOR_UNITARIO_ELEVADOR,
    desconto,
    valorTotal: quantidade * VALOR_UNITARIO_ELEVADOR - desconto,
    promocao: PROMOCAO_ELEVADOR,
  };
}

// Pedidos anteriores à promoção e de parceiros mantêm seus valores contratados.
export function valorPromocionalValido(pedido: {
  tipo?: string; origem?: string; promocao?: string;
  quantidade: number; valorTotal: number;
}) {
  if (pedido.promocao !== PROMOCAO_ELEVADOR) return true;
  return pedido.tipo === "elevador" && pedido.origem === "site" &&
    Number.isSafeInteger(pedido.quantidade) && pedido.quantidade > 0 &&
    pedido.valorTotal === calcularPrecoElevador(pedido.quantidade).valorTotal;
}
