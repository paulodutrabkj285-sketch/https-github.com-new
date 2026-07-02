"use client";

import { useState } from "react";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLECOES_PARA_LIMPAR = [
    "pedidos",
    "reservas_agencias",
    "agencias",
    "entradas",
    "pagamentos",
    "logs",
    "historico",
];

export default function ManutencaoPage() {
    const [confirmacao, setConfirmacao] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [mensagem, setMensagem] = useState("");

    async function limparColecao(nomeColecao: string) {
        const snapshot = await getDocs(collection(db, nomeColecao));

        if (snapshot.empty) {
            return 0;
        }

        let totalApagados = 0;
        let batch = writeBatch(db);
        let contador = 0;

        for (const documento of snapshot.docs) {
            batch.delete(doc(db, nomeColecao, documento.id));
            contador++;
            totalApagados++;

            if (contador === 400) {
                await batch.commit();
                batch = writeBatch(db);
                contador = 0;
            }
        }

        if (contador > 0) {
            await batch.commit();
        }

        return totalApagados;
    }

    async function limparDadosTeste() {
        if (confirmacao !== "ZERAR SISTEMA") {
            setMensagem('Digite exatamente: ZERAR SISTEMA');
            return;
        }

        const confirmar = window.confirm(
            "Tem certeza que deseja apagar todos os dados de teste? Essa ação não pode ser desfeita."
        );

        if (!confirmar) return;

        try {
            setCarregando(true);
            setMensagem("Limpando dados de teste...");

            let totalGeral = 0;

            for (const nomeColecao of COLECOES_PARA_LIMPAR) {
                const total = await limparColecao(nomeColecao);
                totalGeral += total;
            }

            setMensagem(
                `Sistema limpo com sucesso. Total de documentos apagados: ${totalGeral}`
            );

            setConfirmacao("");
        } catch (error) {
            console.error("Erro ao limpar dados:", error);
            setMensagem("Erro ao limpar dados. Verifique o console.");
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-3xl bg-white p-8 shadow-xl">
                    <p className="font-bold text-red-600">Parque Mundo Novo</p>

                    <h1 className="mt-2 text-3xl font-black">
                        Manutenção do Sistema
                    </h1>

                    <p className="mt-3 text-slate-600">
                        Use esta tela apenas antes de colocar o sistema em produção.
                    </p>

                    <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-800">
                        <p className="font-black">Atenção</p>
                        <p className="mt-2">
                            Esta ação apaga os dados de teste dos painéis, pedidos, reservas,
                            agências, pagamentos e entradas.
                        </p>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-100 p-5">
                        <p className="font-bold">Coleções que serão limpas:</p>

                        <ul className="mt-3 list-disc pl-6">
                            {COLECOES_PARA_LIMPAR.map((colecao) => (
                                <li key={colecao}>{colecao}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-6">
                        <label className="font-bold">
                            Para confirmar, digite:
                        </label>

                        <div className="mt-2 rounded-xl bg-slate-900 p-3 font-black text-white">
                            ZERAR SISTEMA
                        </div>

                        <input
                            value={confirmacao}
                            onChange={(e) => setConfirmacao(e.target.value)}
                            placeholder="Digite ZERAR SISTEMA"
                            className="mt-3 w-full rounded-2xl border px-4 py-4 font-bold outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    {mensagem && (
                        <div className="mt-5 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">
                            {mensagem}
                        </div>
                    )}

                    <button
                        onClick={limparDadosTeste}
                        disabled={carregando}
                        className="mt-6 w-full rounded-2xl bg-red-600 px-6 py-5 text-xl font-black text-white shadow-xl transition hover:bg-red-700 disabled:opacity-60"
                    >
                        {carregando ? "Limpando..." : "Zerar dados de teste"}
                    </button>
                </div>
            </div>
        </main>
    );
}