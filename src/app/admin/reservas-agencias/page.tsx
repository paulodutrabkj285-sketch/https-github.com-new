"use client";

import {
    Agencia,
    ativarAgencia,
    bloquearAgencia,
    listarAgencias,
} from "@/lib/agencias";

import { db } from "@/lib/firebase";

import {
    collection,
    getDocs,
    orderBy,
    query,
} from "firebase/firestore";

import {
    useEffect,
    useState,
} from "react";

type ReservaAgencia = {
    id: string;

    agenciaNome?: string;

    agenciaCadastur?: string;

    codigoGrupo?: string;

    dataVisita?: string;

    horaPrevista?: string;

    totalVisitantes?: number;

    adultos?: number;

    idosos?: number;

    elevador?: boolean;

    qtdElevador?: number;

    descontoAplicado?: number;

    valorFinal?: number;

    statusPagamento?: string;

    statusOperacional?: string;

    tipoVeiculo?: string;

    createdAt?: any;
};

export default function ReservasAgenciasAdminPage() {
    const [agencias, setAgencias] =
        useState<Agencia[]>([]);

    const [
        reservas,
        setReservas,
    ] = useState<
        ReservaAgencia[]
    >([]);

    const [carregando, setCarregando] =
        useState(true);

    const [
        processando,
        setProcessando,
    ] = useState("");

    const [mensagem, setMensagem] =
        useState("");

    useEffect(() => {
        carregarTudo();
    }, []);

    async function carregarTudo() {
        try {
            setCarregando(true);

            const listaAgencias =
                await listarAgencias();

            setAgencias(
                listaAgencias
            );

            const q = query(
                collection(
                    db,
                    "reservas_agencias"
                ),

                orderBy(
                    "createdAt",
                    "desc"
                )
            );

            const snap =
                await getDocs(q);

            const listaReservas =
                snap.docs.map(
                    (item) => ({
                        id: item.id,

                        ...item.data(),
                    })
                ) as ReservaAgencia[];

            setReservas(
                listaReservas
            );
        } catch (error) {
            console.error(
                "Erro ao carregar parceiros/reservas:",
                error
            );

            setMensagem(
                "Erro ao carregar dados."
            );
        } finally {
            setCarregando(false);
        }
    }

    async function aprovar(
        agencia: Agencia
    ) {
        const confirmou =
            window.confirm(
                `Aprovar ${agencia.nomeEmpresa} para realizar reservas com desconto?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessando(
                agencia.id
            );

            await ativarAgencia(
                agencia.id,
                "admin"
            );

            setMensagem(
                `${agencia.nomeEmpresa} foi aprovada.`
            );

            await carregarTudo();
        } catch (error) {
            console.error(
                error
            );

            setMensagem(
                "Erro ao aprovar parceiro."
            );
        } finally {
            setProcessando("");
        }
    }

    async function bloquear(
        agencia: Agencia
    ) {
        const confirmou =
            window.confirm(
                `Bloquear ${agencia.nomeEmpresa}?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessando(
                agencia.id
            );

            await bloquearAgencia(
                agencia.id
            );

            setMensagem(
                `${agencia.nomeEmpresa} foi bloqueada.`
            );

            await carregarTudo();
        } catch (error) {
            console.error(
                error
            );

            setMensagem(
                "Erro ao bloquear parceiro."
            );
        } finally {
            setProcessando("");
        }
    }

    function formatarMoeda(
        valor?: number
    ) {
        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        );
    }

    function formatarData(
        data?: string
    ) {
        if (!data) {
            return "-";
        }

        const partes =
            data.split("-");

        if (
            partes.length !==
            3
        ) {
            return data;
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    const pendentes =
        agencias.filter(
            (item) =>
                item.status ===
                "pendente"
        );

    const ativas =
        agencias.filter(
            (item) =>
                item.status ===
                "ativa"
        );

    const bloqueadas =
        agencias.filter(
            (item) =>
                item.status ===
                "bloqueada"
        );

    const reservasAtivas =
        reservas.filter(
            (item) =>
                item.statusOperacional ===
                "reservado"
        );

    if (carregando) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <p>
                    Carregando...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-black text-emerald-800">
                    Agências e Reservas
                </h1>

                <p className="mt-2 text-slate-600">
                    Aprovação de parceiros
                    e controle das excursões.
                </p>

                {mensagem && (
                    <div className="mt-5 rounded-xl bg-emerald-100 p-4 font-bold text-emerald-800">
                        {mensagem}
                    </div>
                )}

                {/* CONTADORES */}

                <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card
                        titulo="Aguardando aprovação"
                        valor={
                            pendentes.length
                        }
                    />

                    <Card
                        titulo="Parceiros ativos"
                        valor={
                            ativas.length
                        }
                    />

                    <Card
                        titulo="Bloqueados"
                        valor={
                            bloqueadas.length
                        }
                    />

                    <Card
                        titulo="Reservas ativas"
                        valor={
                            reservasAtivas.length
                        }
                    />
                </section>

                {/* PENDENTES */}

                <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                    <h2 className="text-2xl font-black text-orange-700">
                        Cadastros aguardando
                        aprovação
                    </h2>

                    {pendentes.length ===
                        0 ? (
                        <p className="mt-5 text-slate-500">
                            Nenhum cadastro
                            pendente.
                        </p>
                    ) : (
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-left">
                                <thead>
                                    <tr className="border-b bg-slate-50">
                                        <th className="p-3">
                                            Empresa
                                        </th>

                                        <th className="p-3">
                                            Responsável
                                        </th>

                                        <th className="p-3">
                                            Cadastur
                                        </th>

                                        <th className="p-3">
                                            CPF/CNPJ
                                        </th>

                                        <th className="p-3">
                                            Cidade
                                        </th>

                                        <th className="p-3">
                                            WhatsApp
                                        </th>

                                        <th className="p-3">
                                            Ação
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {pendentes.map(
                                        (
                                            agencia
                                        ) => (
                                            <tr
                                                key={
                                                    agencia.id
                                                }
                                                className="border-b"
                                            >
                                                <td className="p-3 font-bold">
                                                    {
                                                        agencia.nomeEmpresa
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        agencia.responsavel
                                                    }
                                                </td>

                                                <td className="p-3 font-bold">
                                                    {
                                                        agencia.cadastur
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        agencia.documento
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        agencia.cidade
                                                    }
                                                    /
                                                    {
                                                        agencia.estado
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        agencia.whatsapp
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    <button
                                                        onClick={() =>
                                                            aprovar(
                                                                agencia
                                                            )
                                                        }
                                                        disabled={
                                                            processando ===
                                                            agencia.id
                                                        }
                                                        className="rounded-xl bg-green-600 px-4 py-2 font-black text-white disabled:opacity-50"
                                                    >
                                                        ✅ APROVAR
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* ATIVAS */}

                <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                    <h2 className="text-2xl font-black text-emerald-700">
                        Parceiros aprovados
                    </h2>

                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    <th className="p-3">
                                        Empresa
                                    </th>

                                    <th className="p-3">
                                        Tipo
                                    </th>

                                    <th className="p-3">
                                        Cadastur
                                    </th>

                                    <th className="p-3">
                                        E-mail
                                    </th>

                                    <th className="p-3">
                                        Status
                                    </th>

                                    <th className="p-3">
                                        Reserva
                                    </th>

                                    <th className="p-3">
                                        Ação
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {ativas.map(
                                    (
                                        agencia
                                    ) => (
                                        <tr
                                            key={
                                                agencia.id
                                            }
                                            className="border-b"
                                        >
                                            <td className="p-3 font-bold">
                                                {
                                                    agencia.nomeEmpresa
                                                }
                                            </td>

                                            <td className="p-3">
                                                {
                                                    agencia.tipoParceiro
                                                }
                                            </td>

                                            <td className="p-3">
                                                {
                                                    agencia.cadastur
                                                }
                                            </td>

                                            <td className="p-3">
                                                {
                                                    agencia.email
                                                }
                                            </td>

                                            <td className="p-3">
                                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">
                                                    ATIVA
                                                </span>
                                            </td>

                                            <td className="p-3">
                                                <a
                                                    href={`/parceiros/reservas?agenciaId=${agencia.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-bold text-blue-700 underline"
                                                >
                                                    Abrir página
                                                </a>
                                            </td>

                                            <td className="p-3">
                                                <button
                                                    onClick={() =>
                                                        bloquear(
                                                            agencia
                                                        )
                                                    }
                                                    className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
                                                >
                                                    BLOQUEAR
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* RESERVAS */}

                <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                    <h2 className="text-2xl font-black text-emerald-800">
                        Reservas de Agências
                    </h2>

                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[1200px] text-left">
                            <thead>
                                <tr className="border-b bg-slate-50">
                                    <th className="p-3">
                                        Agência
                                    </th>

                                    <th className="p-3">
                                        Grupo
                                    </th>

                                    <th className="p-3">
                                        Visita
                                    </th>

                                    <th className="p-3">
                                        Pessoas
                                    </th>

                                    <th className="p-3">
                                        Elevador
                                    </th>

                                    <th className="p-3">
                                        Desconto
                                    </th>

                                    <th className="p-3">
                                        Valor
                                    </th>

                                    <th className="p-3">
                                        Pagamento
                                    </th>

                                    <th className="p-3">
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {reservas.length ===
                                    0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                9
                                            }
                                            className="p-4 text-slate-500"
                                        >
                                            Nenhuma
                                            reserva.
                                        </td>
                                    </tr>
                                ) : (
                                    reservas.map(
                                        (
                                            reserva
                                        ) => (
                                            <tr
                                                key={
                                                    reserva.id
                                                }
                                                className="border-b"
                                            >
                                                <td className="p-3 font-bold">
                                                    {reserva.agenciaNome ||
                                                        "Reserva antiga"}
                                                </td>

                                                <td className="p-3 font-mono">
                                                    {
                                                        reserva.codigoGrupo
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {formatarData(
                                                        reserva.dataVisita
                                                    )}
                                                    {reserva.horaPrevista
                                                        ? ` ${reserva.horaPrevista}`
                                                        : ""}
                                                </td>

                                                <td className="p-3 font-black">
                                                    {reserva.totalVisitantes ||
                                                        0}
                                                </td>

                                                <td className="p-3">
                                                    {reserva.elevador
                                                        ? `${reserva.qtdElevador || 0}`
                                                        : "Não"}
                                                </td>

                                                <td className="p-3">
                                                    {reserva.descontoAplicado ||
                                                        0}
                                                    %
                                                </td>

                                                <td className="p-3 font-black">
                                                    {formatarMoeda(
                                                        reserva.valorFinal
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        reserva.statusPagamento
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        reserva.statusOperacional
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}

function Card({
    titulo,
    valor,
}: {
    titulo: string;
    valor: string | number;
}) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-500">
                {titulo}
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-700">
                {valor}
            </p>
        </div>
    );
}