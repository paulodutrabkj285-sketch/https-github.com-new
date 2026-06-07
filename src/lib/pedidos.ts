import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

export type PedidoInput = {
  produto: string;
  tipo: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  dataVisita?: string;
  dataEntrada?: string;
  noites?: number;
  quantidadePessoas?: number;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  statusPagamento: string;
  statusOperacional: string;
  pagbankCheckoutId?: string;
  pagbankReferenceId?: string;
  pagbankPayUrl?: string;
  pagbankStatus?: string;
  codigoIngresso?: string;
  qrCodeIngresso?: string;
};

export type Pedido = PedidoInput & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  expiracaoPix?: string;
  sicrediTxid?: string;
  sicrediStatus?: string;
  sicrediPixCopiaCola?: string;
  sicrediLocation?: string;
  valorPago?: number;
};

function gerarCodigoIngresso() {
  const numero = Math.floor(10000 + Math.random() * 90000);
  return `PMN-${numero}`;
}

function gerarExpiracaoPix() {
  const agora = new Date();
  agora.setHours(agora.getHours() + 1);
  return agora.toISOString();
}

export async function criarPedido(dados: PedidoInput) {
  const codigoIngresso = dados.codigoIngresso || gerarCodigoIngresso();

  const ref = await addDoc(collection(db, "pedidos"), {
    ...dados,
    codigoIngresso,
    expiracaoPix: gerarExpiracaoPix(),
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}

export async function atualizarPedido(
  pedidoId: string,
  dados: Partial<PedidoInput> & Record<string, unknown>
) {
  const ref = doc(db, "pedidos", pedidoId);

  await updateDoc(ref, {
    ...dados,
    updatedAt: new Date().toISOString(),
  });
}

export async function buscarPedidoPorId(pedidoId: string) {
  const ref = doc(db, "pedidos", pedidoId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as Pedido;
}

export async function buscarPedidoPorTxid(txid: string) {
  const q = query(
    collection(db, "pedidos"),
    where("sicrediTxid", "==", txid),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const docItem = snap.docs[0];

  return {
    id: docItem.id,
    ...docItem.data(),
  } as Pedido;
}

export async function listarPedidos() {
  const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as Pedido[];
}

export function calcularResumoFinanceiro(pedidos: Pedido[]) {
  const totalPedidos = pedidos.length;

  const pedidosPagos = pedidos.filter(
    (pedido) => pedido.statusPagamento === "pago"
  );

  const pedidosPendentes = pedidos.filter(
    (pedido) => pedido.statusPagamento !== "pago"
  );

  const faturamentoBruto = pedidosPagos.reduce(
    (total, pedido) => total + Number(pedido.valorTotal || 0),
    0
  );

  const taxaPercentual = 4.99;
  const valorTaxas = faturamentoBruto * (taxaPercentual / 100);
  const faturamentoLiquido = faturamentoBruto - valorTaxas;

  const quantidadeIngressos = pedidosPagos.reduce(
    (total, pedido) => total + Number(pedido.quantidade || 0),
    0
  );

  return {
    totalPedidos,
    totalPagos: pedidosPagos.length,
    totalPendentes: pedidosPendentes.length,
    quantidadeIngressos,
    faturamentoBruto,
    taxaPercentual,
    valorTaxas,
    faturamentoLiquido,
  };
}