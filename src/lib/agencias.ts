import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type AgenciaInput = {
    nomeEmpresa: string;
    responsavel: string;
    documento: string;
    cadastur: string;
    tipoParceiro: "agencia" | "guia" | "transportadora" | "operadora";
    telefone: string;
    whatsapp: string;
    email: string;
    cidade: string;
    estado: string;
    observacoes?: string;
};

export type Agencia = AgenciaInput & {
    id: string;
    status: "ativa" | "bloqueada";
    descontoPadrao: number;
    categoria: "Bronze" | "Prata" | "Ouro" | "Diamante";
    aprovacaoAutomatica: boolean;
    totalVisitantes: number;
    receitaGerada: number;
    descontosConcedidos: number;
    createdAt: string;
    updatedAt?: string;
};

export async function criarAgencia(dados: AgenciaInput) {
    const ref = await addDoc(collection(db, "agencias"), {
        ...dados,
        status: "ativa",
        descontoPadrao: 5,
        categoria: "Bronze",
        aprovacaoAutomatica: true,
        totalVisitantes: 0,
        receitaGerada: 0,
        descontosConcedidos: 0,
        createdAt: new Date().toISOString(),
    });

    return ref.id;
}

export async function listarAgencias() {
    const q = query(collection(db, "agencias"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
    })) as Agencia[];
}

export async function buscarAgenciaPorId(id: string) {
    const ref = doc(db, "agencias", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return {
        id: snap.id,
        ...snap.data(),
    } as Agencia;
}

export async function atualizarAgencia(
    id: string,
    dados: Partial<AgenciaInput> & Record<string, unknown>
) {
    const ref = doc(db, "agencias", id);

    await updateDoc(ref, {
        ...dados,
        updatedAt: new Date().toISOString(),
    });
}

export async function bloquearAgencia(id: string) {
    await atualizarAgencia(id, {
        status: "bloqueada",
    });
}

export async function ativarAgencia(id: string) {
    await atualizarAgencia(id, {
        status: "ativa",
    });
}

export function calcularDescontoGrupo(totalVisitantes: number) {
    if (totalVisitantes >= 60) return 20;
    if (totalVisitantes >= 40) return 15;
    if (totalVisitantes >= 20) return 10;
    if (totalVisitantes >= 10) return 5;
    return 0;
}