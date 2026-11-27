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
    String(pedido.produto || "").trim().toLowerCase() === "elevador panorâmico";
  const produtoComElevador = String(pedido.produto || "").toLowerCase().includes("elevador");
  const quantidade = Math.max(quantidadeValida(pedido.quantidadeElevador), quantidadeValida(pedido.qtdElevador),
    itensElevador.reduce((soma, item) => soma + quantidadeValida(item.quantidade), 0),
    avulso && String(pedido.tipo || "").toLowerCase() !== "carrinho" ? quantidadeValida(pedido.quantidade) : 0);
  if (quantidade > 0) return quantidade;
  // null significa que há elevador, mas a quantidade do registro é desconhecida.
  return produtoComElevador || avulso || pedido.elevador === true || pedido.codigoIngressoElevador || pedido.qrCodeIngressoElevador || itensElevador.length ? null : 0;
}

export function pedidoElevadorBloqueado(pedido: DadosElevadorManutencao, agora = new Date()) {
  if (quantidadeElevadorNoPedido(pedido) === 0) return false;
  const data = String(pedido.dataVisita || pedido.dataEntrada || "");
  return !/^\d{4}-\d{2}-\d{2}$/.test(data) || dataElevadorBloqueada(data) || dataElevadorBloqueada(hojeNoParque(agora));
}


export type DadosConsultaElevador = DadosElevadorManutencao & {
  createdAt?: unknown; statusOperacional?: unknown; statusPagamento?: unknown;
  quantidadeParque?: unknown; elevadorValidado?: unknown; elevadorQuantidadeValidada?: unknown;
};

function dataCivilConsulta(valor: unknown): string {
  try {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const d = new Date(valor + "T12:00:00Z");
      return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === valor ? valor : "";
    }
    const objeto = valor as { toDate?: () => Date } | null;
    const d = typeof objeto?.toDate === "function" ? objeto.toDate() :
      typeof valor === "string" && valor.trim() ? new Date(valor) : null;
    return d && Number.isFinite(d.getTime()) ? hojeNoParque(d) : "";
  } catch { return ""; }
}

// Estimativa da política comercial; não altera nem substitui a validação do ingresso.
export function classificarAcessoManutencao(pedido: DadosConsultaElevador, reserva = false) {
  const quantidade = quantidadeElevadorNoPedido(pedido);
  if (quantidade === 0) return null;
  const visita = dataCivilConsulta(pedido.dataVisita || pedido.dataEntrada);
  const compra = reserva ? "" : dataCivilConsulta(pedido.createdAt);
  const base = compra || visita;
  const fim = base ? new Date(base + "T12:00:00Z") : null;
  if (fim) fim.setUTCMonth(fim.getUTCMonth() + 6);
  const validade = fim ? fim.toISOString().slice(0, 10) : "";
  const tipo = String(pedido.tipo || "").toLowerCase();
  const produto = String(pedido.produto || "").toLowerCase();
  const operacional = String(pedido.statusOperacional || "").toLowerCase();
  const pagamento = String(pedido.statusPagamento || "").toLowerCase();
  const numeroUsado = Number(pedido.elevadorQuantidadeValidada);
  const acessoParque = reserva || ["ingresso", "parque", "idoso", "camping"].includes(tipo) ||
    Number(pedido.quantidadeParque) > 0 || (tipo !== "elevador" && /ingresso parque|parque \+|meia entrada idoso|camping/.test(produto));
  const usoLegado = !reserva && !acessoParque && operacional === "utilizado" && pedido.elevadorValidado !== true;
  let saldo: number | null = quantidade;
  if (Number.isSafeInteger(numeroUsado) && numeroUsado > 0) {
    saldo = quantidade === null ? null : Math.max(0, quantidade - numeroUsado);
  } else if (pedido.elevadorValidado === true || usoLegado) {
    saldo = 0;
  }
  if (saldo === 0 || pagamento === "reembolsado") return null;
  const bloqueado = ["cancelado", "bloqueado", "reembolsado", "cancelada", "bloqueada"].includes(operacional);
  // O validador exclusivo do elevador não verifica datas. Preservar também
  // os registros com prazo vencido ou incerto em uma categoria de revisão.
  const motivo = bloqueado ? "revisar_bloqueio" :
    !visita || !validade || validade < INICIO_BLOQUEIO_ELEVADOR ? "revisar_validade" :
    visita >= INICIO_BLOQUEIO_ELEVADOR ? "agendado" : "validade_aberta";
  return { quantidade, saldo, visita, validade, motivo } as const;
}
