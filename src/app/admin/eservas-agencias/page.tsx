"use client";

import { useEffect, useMemo, useState } from "react";
import {
    collection,
    getDocs,
    orderBy,
    query,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type ReservaAgencia = {
    id: string;
    agenciaNome?: string;
    codigoGrupo?: string;
    dataVisita?: string;
    horaPrevista?: string;
    tipoVeiculo?: string;
    adultos?: number;
    idosos?: number;
    qtdElevador?: number;
    totalVisitantes?: number;
    valorBruto?: number;
    valorDesconto?: number;
    valorFinal?: number;
    statusPagamento?: string;
    formaPagamento?: string;
    statusOperacional?: string;
    createdAt?: Timestamp;
};

export default function ReservasAgenciasAdminPage() {
    const [reservas, setReservas] = useState<ReservaAgencia[]>([]);
    const [busca, setBusca] = useState("");
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        carregarReservas();
    }, []);

    async function carregarReservas() {
        try {
            setCarregando(true);

            const q = query(
                collection(db, "reservas_agencias"),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(q);

            const lista = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ReservaAgencia[];

            setReservas(lista);
        } catch (error) {
            console.error("Erro ao carregar reservas:", error);
        } finally {
            setCarregando(false);
        }
    }

    const reservasFiltradas = useMemo(() => {
        const termo = busca.toLowerCase().trim();

        if (!termo) return reservas;

        return reservas.filter((reserva) => {
            return (
                reserva.agenciaNome?.toLowerCase().includes(termo) ||
                reserva.codigoGrupo?.toLowerCase().includes(termo) ||
                reserva.dataVisita?.toLowerCase().includes(termo) ||
                reserva.statusPagamento?.toLowerCase().includes(termo) ||
                reserva.statusOperacional?.toLowerCase().includes(termo)
            );
        });
    }, [busca, reservas]);

    function formatarMoeda(valor?: number) {
        return (valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }

    function formatarData(data?: string) {
        if (!data) return "-";
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    function statusTexto(status?: string) {
        if (!status) return "Não informado";

        const mapa: Record<string, string> = {
            a_pagar_na_chegada: "A pagar na chegada",
            pendente: "Pendente",
            pago: "Pago",
            reservado: "Reservado",
            finalizado: "Finalizado",
            cancelado: "Cancelado",
        };

        return mapa[status] || status;
    }

    const totalReservas = reservasFiltradas.length;

    const totalVisitantes = reservasFiltradas.reduce(
        (soma, r) => soma + (r.totalVisitantes || 0),
        0
    );

    const totalPrevisto = reservasFiltradas.reduce(
        (soma, r) => soma + (r.valorFinal || 0),
        0
    );

    const totalDescontos = reservasFiltradas.reduce(
        (soma, r) => soma + (r.valorDesconto || 0),
        0
    );

    return (
        <main className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6">
                    <p className="text-sm font-bold text-emerald-700">
                        Parque Mundo Novo
                    </p>
                    <h1 className="text-3xl font-black">
                        Reservas de Agências e Guias
                    </h1>
                    <p className="mt-2 text-slate-600">
                        Controle das excursões, grupos turísticos e reservas feitas pelos
                        parceiros.
                    </p>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-4">
                    <CardResumo titulo="Reservas" valor={String(totalReservas)} />
                    <CardResumo titulo="Visitantes previstos" valor={String(totalVisitantes)} />
                    <CardResumo titulo="Receita prevista" valor={formatarMoeda(totalPrevisto)} />
                    <CardResumo titulo="Descontos" valor={formatarMoeda(totalDescontos)} />
                </div>

                <div className="mb-6 rounded-2xl bg-white p-4 shadow">
                    <label className="text-sm font-bold">Buscar reserva</label>
                    <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Busque por agência, código do grupo, data ou status..."
                        className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div className="overflow-hidden rounded-2xl bg-white shadow">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                            <thead className="bg-slate-900 text-white">
                                <tr>
                                    <th className="p-3">Código</th>
                                    <th className="p-3">Agência</th>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Veículo</th>
                                    <th className="p-3">Adultos</th>
                                    <th className="p-3">Idosos</th>
                                    <th className="p-3">Elevador</th>
                                    <th className="p-3">Visitantes</th>
                                    <th className="p-3">Valor final</th>
                                    <th className="p-3">Pagamento</th>
                                    <th className="p-3">Operação</th>
                                </tr>
                            </thead>

                            <tbody>
                                {carregando && (
                                    <tr>
                                        <td colSpan={11} className="p-6 text-center font-bold">
                                            Carregando reservas...
                                        </td>
                                    </tr>
                                )}

                                {!carregando && reservasFiltradas.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="p-6 text-center font-bold">
                                            Nenhuma reserva encontrada.
                                        </td>
                                    </tr>
                                )}

                                {!carregando &&
                                    reservasFiltradas.map((reserva) => (
                                        <tr
                                            key={reserva.id}
                                            className="border-b hover:bg-slate-50"
                                        >
                                            <td className="p-3 font-bold">
                                                {reserva.codigoGrupo || "-"}
                                            </td>
                                            <td className="p-3">
                                                {reserva.agenciaNome || "Agência não logada"}
                                            </td>
                                            <td className="p-3">
                                                {formatarData(reserva.dataVisita)}
                                                {reserva.horaPrevista && (
                                                    <span className="block text-xs text-slate-500">
                                                        {reserva.horaPrevista}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">{reserva.tipoVeiculo || "-"}</td>
                                            <td className="p-3">{reserva.adultos || 0}</td>
                                            <td className="p-3">{reserva.idosos || 0}</td>
                                            <td className="p-3">{reserva.qtdElevador || 0}</td>
                                            <td className="p-3 font-bold">
                                                {reserva.totalVisitantes || 0}
                                            </td>
                                            <td className="p-3 font-bold text-emerald-700">
                                                {formatarMoeda(reserva.valorFinal)}
                                            </td>
                                            <td className="p-3">
                                                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                                                    {statusTexto(reserva.statusPagamento)}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                                                    {statusTexto(reserva.statusOperacional)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}

function CardResumo({ titulo, valor }: { titulo: string; valor: string }) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">{titulo}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{valor}</p>
        </div>
    );
}