import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
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

export async function criarPedido(dados: PedidoInput) {
  const ref = await addDoc(collection(db, "pedidos"), {
    ...dados,
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