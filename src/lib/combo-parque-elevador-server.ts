import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { comboParqueElevadorAtivo, PROMOCAO_PARQUE_ELEVADOR } from "./preco-elevador";

export const COOKIE_COMBO = "pmn_combo_120";
export const PREFIXO_PEDIDO_COMBO = "COMBO120-";
export const DURACAO_COMBO_SEGUNDOS = 60 * 60;

function assinar(conteudo: string) {
  // Segredo privado já usado no servidor; nunca exposto em NEXT_PUBLIC_*.
  const segredo = process.env.COMBO_PROMOCAO_SECRET || process.env.CRON_SECRET;
  if (!segredo) throw new Error("Segredo do combo não configurado no servidor.");
  return createHmac("sha256", segredo).update(`pmn-combo-120:${conteudo}`).digest("hex");
}

function assinaturaValida(conteudo: string, assinatura: unknown) {
  if (typeof assinatura !== "string" || !/^[a-f0-9]{64}$/.test(assinatura)) return false;
  return timingSafeEqual(Buffer.from(assinar(conteudo), "hex"), Buffer.from(assinatura, "hex"));
}

export function iniciarAutorizacaoCombo() {
  const nonce = randomUUID();
  const validade = Date.now() + DURACAO_COMBO_SEGUNDOS * 1000;
  const conteudo = `${nonce}.${validade}`;
  return `${conteudo}.${assinar(`inicio:${conteudo}`)}`;
}

export function lerAutorizacaoCombo(token?: string) {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [nonce, validade, assinatura] = partes;
  if (!/^[a-f0-9-]{36}$/.test(nonce) || !/^\d{13}$/.test(validade) ||
      Number(validade) <= Date.now() || !assinaturaValida(`inicio:${nonce}.${validade}`, assinatura)) return null;
  return { pedidoId: PREFIXO_PEDIDO_COMBO + nonce };
}

type PedidoCombo = {
  promocao?: string; origem?: string; tipo?: string; cortesia?: boolean;
  quantidade?: number; quantidadeParque?: number; quantidadeElevador?: number;
  valorUnitario?: number; valorUnitarioElevador?: number; valorParque?: number;
  valorElevador?: number; valorTotal?: number;
  codigoIngressoParque?: string; codigoIngressoElevador?: string; comboAssinatura?: unknown;
};

function conteudoPedido(pedidoId: string, pedido: PedidoCombo) {
  return JSON.stringify([
    pedidoId, pedido.promocao, pedido.origem, pedido.tipo, pedido.quantidade,
    pedido.quantidadeParque, pedido.quantidadeElevador, pedido.valorUnitario,
    pedido.valorUnitarioElevador, pedido.valorParque, pedido.valorElevador, pedido.valorTotal,
    pedido.codigoIngressoParque, pedido.codigoIngressoElevador,
  ]);
}

export function assinarPedidoCombo(pedidoId: string, pedido: PedidoCombo) {
  return assinar(`pedido:${conteudoPedido(pedidoId, pedido)}`);
}

// Pedidos comuns e antigos não passam a depender de segredo ou de novos campos.
// O prefixo impede remover a promoção de um combo para contornar a validação.
export function pedidoComboValidoNoServidor(pedidoId: string, pedido: PedidoCombo) {
  if (pedido.promocao !== PROMOCAO_PARQUE_ELEVADOR && !pedidoId.startsWith(PREFIXO_PEDIDO_COMBO)) return true;
  const quantidade = pedido.quantidadeParque;
  if (!pedidoId.startsWith(PREFIXO_PEDIDO_COMBO) || !comboParqueElevadorAtivo(pedido) ||
      pedido.quantidade !== quantidade || pedido.valorUnitario !== 60 ||
      pedido.valorUnitarioElevador !== 60 || pedido.valorParque !== Number(quantidade) * 60 ||
      pedido.valorElevador !== Number(quantidade) * 60 || pedido.valorTotal !== Number(quantidade) * 120 ||
      !pedido.codigoIngressoParque || !pedido.codigoIngressoElevador ||
      pedido.codigoIngressoParque === pedido.codigoIngressoElevador) return false;
  return assinaturaValida(`pedido:${conteudoPedido(pedidoId, pedido)}`, pedido.comboAssinatura);
}
