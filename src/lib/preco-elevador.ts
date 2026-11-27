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

export const PROMOCAO_PARQUE_ELEVADOR = "combo-parque-elevador-site-v1";

// Só identifica o novo produto. Autorização e assinatura são verificadas no servidor.
export function comboParqueElevadorAtivo(pedido: {
  promocao?: string; origem?: string; cortesia?: boolean; tipo?: string;
  quantidadeParque?: number; quantidadeElevador?: number;
}) {
  return pedido.promocao === PROMOCAO_PARQUE_ELEVADOR &&
    pedido.origem === "site" && !pedido.cortesia && pedido.tipo === "carrinho" &&
    Number.isSafeInteger(pedido.quantidadeParque) &&
    Number(pedido.quantidadeParque) > 0 &&
    pedido.quantidadeParque === pedido.quantidadeElevador;
}


// Manutenção programada: não há data de reabertura confirmada.
// Para reabrir, atualizar esta política somente após confirmação operacional.
export const INICIO_BLOQUEIO_ELEVADOR = "2026-12-12";
export const DATA_LIMITE_ELEVADOR = "2026-12-11";
export const AVISO_MANUTENCAO_ELEVADOR = "O Elevador Panorâmico passará por manutenção programada, com previsão de início a partir de 19/12/2026, sujeita à chegada dos materiais. Por precaução, a venda de ingressos para visitas a partir de 12/12/2026 está temporariamente suspensa, até nova confirmação. Ainda não há previsão de reabertura.";

export function dataElevadorBloqueada(data: unknown) {
  return typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data) && data >= INICIO_BLOQUEIO_ELEVADOR;
}

export function hojeNoParque(agora = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(agora);
}

export type DadosElevadorManutencao = {
  tipo?: unknown; produto?: unknown; quantidade?: unknown;
  quantidadeElevador?: unknown; qtdElevador?: unknown; elevador?: unknown;
  codigoIngressoElevador?: unknown; qrCodeIngressoElevador?: unknown;
  itensCarrinho?: unknown; dataVisita?: unknown; dataEntrada?: unknown;
  reservaAgenciaId?: unknown;
};

export function quantidadeElevadorNoPedido(pedido: DadosElevadorManutencao): number | null {
  const quantidadeValida = (v: unknown) => {
    const n = Number(v);
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
  };
  const itens = Array.isArray(pedido.itensCarrinho) ? pedido.itensCarrinho : [];
  const itensElevador = itens.filter((item) => item && (item.tipo === "elevador" || String(item.produto || "").toLowerCase().includes("elevador")));
  const avulso = String(pedido.tipo || "").toLowerCase() === "elevador" ||
    String(pedido.produto || "").toLowerCase().includes("elevador panorâmico");
  const quantidade = Math.max(quantidadeValida(pedido.quantidadeElevador), quantidadeValida(pedido.qtdElevador),
    itensElevador.reduce((soma, item) => soma + quantidadeValida(item.quantidade), 0),
    avulso && String(pedido.tipo || "").toLowerCase() !== "carrinho" ? quantidadeValida(pedido.quantidade) : 0);
  if (quantidade > 0) return quantidade;
  // null significa que há elevador, mas a quantidade do registro é desconhecida.
  return avulso || pedido.elevador === true || pedido.codigoIngressoElevador || pedido.qrCodeIngressoElevador || itensElevador.length ? null : 0;
}

export function pedidoElevadorBloqueado(pedido: DadosElevadorManutencao, agora = new Date()) {
  if (quantidadeElevadorNoPedido(pedido) === 0) return false;
  const data = String(pedido.dataVisita || pedido.dataEntrada || "");
  return !/^\d{4}-\d{2}-\d{2}$/.test(data) || dataElevadorBloqueada(data) || dataElevadorBloqueada(hojeNoParque(agora));
}
