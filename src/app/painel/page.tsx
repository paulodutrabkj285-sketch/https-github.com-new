"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Pedido = {
    id: string;
    valorTotal?: number;
    statusPagamento?: string;
    createdAt?: any;
    dataEntrada?: string;
};

type ReservaAgencia = {
    id: string;
    agenciaNome?: string;
    codigoGrupo?: string;
    dataVisita?: string;
    horaPrevista?: string;
    totalVisitantes?: number;
    valorFinal?: number;
    valorDesconto?: number;
    statusPagamento?: string;
    statusOperacional?: string;
};

const menus = [
    {
        titulo: "Dashboard",
        descricao: "Visão geral do parque",
        link: "/admin/dashboard",
        emoji: "📊",
        cor: "from-emerald-500 to-green-700",
    },
    {
        titulo: "Pedidos",
        descricao: "Ingressos vendidos",
        link: "/admin/pedidos",
        emoji: "🎟️",
        cor: "from-blue-500 to-blue-700",
    },
    {
        titulo: "Portaria",
        descricao: "Entrada dos visitantes",
        link: "/portaria",
        emoji: "🚪",
        cor: "from-purple-500 to-purple-700",
    },
    {
        titulo: "Validação",
        descricao: "Validar ingressos",
        link: "/admin/validacao",
        emoji: "✅",
        cor: "from-green-500 to-green-700",
    },
    {
        titulo: "Cadastro Parceiros",
        descricao: "Cadastrar agências e guias",
        link: "/parceiros/cadastro",
        emoji: "🤝",
        cor: "from-orange-500 to-red-600",
    },
    {
        titulo: "Reserva Parceiros",
        descricao: "Nova excursão",
        link: "/parceiros/reservas",
        emoji: "🚌",
        cor: "from-cyan-500 to-sky-700",
    },
    {
        titulo: "Relatório Excursões",
        descricao: "Reservas das agências",
        link: "/relatorios/reservas-agencias",
        emoji: "📋",
        cor: "from-indigo-500 to-indigo-700",
    },
    {
        titulo: "Venda de Ingressos",
        descricao: "Página pública",
        link: "/ingressos",
        emoji: "🎫",
        cor: "from-teal-500 to-emerald-700",
    },
];

export default function PainelPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [reservas, setReservas] = useState<ReservaAgencia[]>([]);
    const [totalAgencias, setTotalAgencias] = useState(0);
    const [carregando, setCarregando] = useState(true);
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");

    useEffect(() => {
        carregarDados();
    }, []);

    async function carregarDados() {
        try {
            setCarregando(true);

            const pedidosSnap = await getDocs(collection(db, "pedidos"));
            const reservasSnap = await getDocs(collection(db, "reservas_agencias"));

            let agenciasQuantidade = 0;

            try {
                const agenciasSnap = await getDocs(collection(db, "agencias"));
                agenciasQuantidade = agenciasSnap.size;
            } catch {
                agenciasQuantidade = 0;
            }

            const listaPedidos = pedidosSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Pedido[];

            const listaReservas = reservasSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ReservaAgencia[];

            setPedidos(listaPedidos);
            setReservas(listaReservas);
            setTotalAgencias(agenciasQuantidade);
            setUltimaAtualizacao(new Date().toLocaleString("pt-BR"));
        } catch (error) {
            console.error("Erro ao carregar painel:", error);
        } finally {
            setCarregando(false);
        }
    }

    function hojeISO() {
        return new Date().toISOString().split("T")[0];
    }

    function formatarMoeda(valor: number) {
        return valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }

    function formatarData(data?: string) {
        if (!data) return "-";

        const partes = data.split("-");
        if (partes.length !== 3) return data;

        const [ano, mes, dia] = partes;
        return `${dia}/${mes}/${ano}`;
    }

    function pedidoEhHoje(pedido: Pedido) {
        const hoje = hojeISO();

        if (pedido.dataEntrada === hoje) return true;

        if (pedido.createdAt?.toDate) {
            const data = pedido.createdAt.toDate().toISOString().split("T")[0];
            return data === hoje;
        }

        return false;
    }

    const indicadores = useMemo(() => {
        const hoje = hojeISO();

        const pedidosHoje = pedidos.filter(pedidoEhHoje);

        const pedidosPagosHoje = pedidosHoje.filter((p) =>
            ["pago", "aprovado", "confirmado", "paid"].includes(
                String(p.statusPagamento || "").toLowerCase()
            )
        );

        const receitaIngressosHoje = pedidosPagosHoje.reduce(
            (soma, p) => soma + (Number(p.valorTotal) || 0),
            0
        );

        const reservasHoje = reservas.filter((r) => r.dataVisita === hoje);

        const visitantesHoje = reservasHoje.reduce(
            (soma, r) => soma + (Number(r.totalVisitantes) || 0),
            0
        );

        const receitaExcursaoHoje = reservasHoje.reduce(
            (soma, r) => soma + (Number(r.valorFinal) || 0),
            0
        );

        const receitaExcursaoTotal = reservas.reduce(
            (soma, r) => soma + (Number(r.valorFinal) || 0),
            0
        );

        const descontosExcursao = reservas.reduce(
            (soma, r) => soma + (Number(r.valorDesconto) || 0),
            0
        );

        const pagamentosPendentes = reservas.filter(
            (r) =>
                r.statusPagamento === "a_pagar_na_chegada" ||
                r.statusPagamento === "pendente"
        ).length;

        return {
            ingressosHoje: pedidosHoje.length,
            receitaIngressosHoje,
            reservasHoje: reservasHoje.length,
            visitantesHoje,
            receitaExcursaoHoje,
            receitaExcursaoTotal,
            descontosExcursao,
            pagamentosPendentes,
        };
    }, [pedidos, reservas]);

    const agendaHoje = useMemo(() => {
        const hoje = hojeISO();

        return reservas
            .filter((r) => r.dataVisita === hoje)
            .sort((a, b) =>
                String(a.horaPrevista || "").localeCompare(String(b.horaPrevista || ""))
            )
            .slice(0, 6);
    }, [reservas]);

    const pendentes = useMemo(() => {
        return reservas
            .filter(
                (r) =>
                    r.statusPagamento === "a_pagar_na_chegada" ||
                    r.statusPagamento === "pendente"
            )
            .slice(0, 6);
    }, [reservas]);

    return (
        <main className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="font-bold text-emerald-700">Parque Mundo Novo</p>

                        <h1 className="mt-2 text-4xl font-black text-slate-900">
                            Painel Geral do Sistema
                        </h1>

                        <p className="mt-3 text-slate-600">
                            Central de acesso rápido, indicadores e controle operacional.
                        </p>

                        {ultimaAtualizacao && (
                            <p className="mt-2 text-sm text-slate-500">
                                Última atualização: {ultimaAtualizacao}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={carregarDados}
                        className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white shadow hover:bg-slate-800"
                    >
                        {carregando ? "Atualizando..." : "Atualizar painel"}
                    </button>
                </div>

                <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <CardIndicador
                        emoji="🎟️"
                        titulo="Ingressos hoje"
                        valor={String(indicadores.ingressosHoje)}
                        detalhe={formatarMoeda(indicadores.receitaIngressosHoje)}
                    />

                    <CardIndicador
                        emoji="🚌"
                        titulo="Excursões hoje"
                        valor={String(indicadores.reservasHoje)}
                        detalhe={`${indicadores.visitantesHoje} visitantes previstos`}
                    />

                    <CardIndicador
                        emoji="💰"
                        titulo="Receita excursões hoje"
                        valor={formatarMoeda(indicadores.receitaExcursaoHoje)}
                        detalhe="Pagamento na chegada"
                    />

                    <CardIndicador
                        emoji="⏳"
                        titulo="Pagamentos pendentes"
                        valor={String(indicadores.pagamentosPendentes)}
                        detalhe="Reservas a receber"
                    />

                    <CardIndicador
                        emoji="🤝"
                        titulo="Agências cadastradas"
                        valor={String(totalAgencias)}
                        detalhe="Parceiros registrados"
                    />

                    <CardIndicador
                        emoji="📋"
                        titulo="Total reservas"
                        valor={String(reservas.length)}
                        detalhe="Excursões cadastradas"
                    />

                    <CardIndicador
                        emoji="📈"
                        titulo="Receita excursões"
                        valor={formatarMoeda(indicadores.receitaExcursaoTotal)}
                        detalhe="Total previsto"
                    />

                    <CardIndicador
                        emoji="🏷️"
                        titulo="Descontos concedidos"
                        valor={formatarMoeda(indicadores.descontosExcursao)}
                        detalhe="Agências e guias"
                    />
                </div>

                <div className="mb-8 grid gap-6 lg:grid-cols-2">
                    <section className="rounded-3xl bg-white p-6 shadow">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">
                                    Agenda de hoje
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Excursões previstas para chegada ao parque.
                                </p>
                            </div>

                            <Link
                                href="/relatorios/reservas-agencias"
                                className="text-sm font-bold text-emerald-700 hover:underline"
                            >
                                Ver relatório
                            </Link>
                        </div>

                        {agendaHoje.length === 0 ? (
                            <div className="rounded-2xl bg-slate-100 p-5 text-center font-bold text-slate-600">
                                Nenhuma excursão marcada para hoje.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {agendaHoje.map((reserva) => (
                                    <div
                                        key={reserva.id}
                                        className="rounded-2xl border border-slate-200 p-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-black text-slate-900">
                                                    {reserva.agenciaNome || "Agência não logada"}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    Código: {reserva.codigoGrupo || "-"}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-black text-emerald-700">
                                                    {reserva.horaPrevista || "--:--"}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {reserva.totalVisitantes || 0} visitantes
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl bg-white p-6 shadow">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">
                                    Pagamentos pendentes
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Valores que devem ser recebidos na chegada.
                                </p>
                            </div>

                            <Link
                                href="/relatorios/reservas-agencias"
                                className="text-sm font-bold text-emerald-700 hover:underline"
                            >
                                Ver todos
                            </Link>
                        </div>

                        {pendentes.length === 0 ? (
                            <div className="rounded-2xl bg-slate-100 p-5 text-center font-bold text-slate-600">
                                Nenhum pagamento pendente.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendentes.map((reserva) => (
                                    <div
                                        key={reserva.id}
                                        className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-black text-slate-900">
                                                    {reserva.agenciaNome || "Agência não logada"}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    {formatarData(reserva.dataVisita)} •{" "}
                                                    {reserva.codigoGrupo || "-"}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-black text-yellow-800">
                                                    {formatarMoeda(Number(reserva.valorFinal) || 0)}
                                                </p>
                                                <p className="text-xs font-bold text-yellow-700">
                                                    A receber
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <div className="mb-5">
                    <h2 className="text-2xl font-black text-slate-900">
                        Acessos rápidos
                    </h2>
                    <p className="text-slate-600">
                        Todos os módulos principais do sistema em um só lugar.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {menus.map((menu) => (
                        <Link
                            key={menu.titulo}
                            href={menu.link}
                            className={`rounded-3xl bg-gradient-to-br ${menu.cor} p-6 text-white shadow-xl transition-all duration-300 hover:scale-105`}
                        >
                            <div className="text-5xl">{menu.emoji}</div>

                            <h2 className="mt-5 text-2xl font-black">{menu.titulo}</h2>

                            <p className="mt-3 opacity-90">{menu.descricao}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}

function CardIndicador({
    emoji,
    titulo,
    valor,
    detalhe,
}: {
    emoji: string;
    titulo: string;
    valor: string;
    detalhe: string;
}) {
    return (
        <div className="rounded-3xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-500">{titulo}</p>
                    <p className="mt-2 text-3xl font-black text-slate-900">{valor}</p>
                    <p className="mt-1 text-sm text-slate-500">{detalhe}</p>
                </div>

                <div className="text-4xl">{emoji}</div>
            </div>
        </div>
    );
}