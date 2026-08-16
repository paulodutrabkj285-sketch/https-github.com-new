"use client";

import {
    Agencia,
    ativarAgencia,
    atualizarAgencia,
    bloquearAgencia,
    listarAgencias,
    marcarAgenciaPendente,
    reprovarAgencia,
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

/* ==========================================
   TIPOS
========================================== */

type ReservaAgencia = {
    id: string;

    agenciaId?: string;
    agenciaNome?: string;
    agenciaDocumento?: string;
    agenciaCadastur?: string;

    codigoGrupo?: string;
    qrCodeGrupo?: string;

    dataVisita?: string;
    horaPrevista?: string;

    totalVisitantes?: number;
    adultos?: number;
    idosos?: number;

    elevador?: boolean;
    qtdElevador?: number;

    descontoAplicado?: number;

    valorBruto?: number;
    valorDesconto?: number;
    valorFinal?: number;

    statusPagamento?: string;
    formaPagamento?: string;

    statusOperacional?: string;

    tipoVeiculo?: string;

    createdAt?: any;
};

/* ==========================================
   PÁGINA
========================================== */

export default function ReservasAgenciasAdminPage() {
    const [
        agencias,
        setAgencias,
    ] = useState<Agencia[]>([]);

    const [
        reservas,
        setReservas,
    ] = useState<ReservaAgencia[]>([]);

    const [
        carregando,
        setCarregando,
    ] = useState(true);

    const [
        processando,
        setProcessando,
    ] = useState("");

    const [
        mensagem,
        setMensagem,
    ] = useState("");

    const [
        erro,
        setErro,
    ] = useState("");

    /* ======================================
       CARREGAR
    ====================================== */

    useEffect(() => {
        carregarTudo();
    }, []);

    async function carregarTudo() {
        try {
            setCarregando(true);
            setErro("");

            const listaAgencias =
                await listarAgencias();

            setAgencias(
                listaAgencias
            );

            const q =
                query(
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
                        id:
                            item.id,

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

            setErro(
                "Erro ao carregar dados das agências."
            );
        } finally {
            setCarregando(false);
        }
    }

    /* ======================================
       APROVAR
    ====================================== */

    async function aprovar(
        agencia: Agencia
    ) {
        /*
         * Antes de aprovar,
         * o Admin informa o número
         * encontrado na conferência
         * do Cadastur.
         */
        const cadasturInformado =
            window.prompt(
                `Informe o número do Cadastur conferido para:\n\n${agencia.nomeEmpresa}\nCNPJ: ${formatarDocumento(
                    agencia.documento
                )}`
            );

        if (
            cadasturInformado ===
            null
        ) {
            return;
        }

        const cadastur =
            cadasturInformado
                .trim();

        if (!cadastur) {
            window.alert(
                "Informe o número do Cadastur antes de aprovar."
            );

            return;
        }

        const confirmou =
            window.confirm(
                `CONFIRMAR APROVAÇÃO?\n\nEmpresa: ${agencia.nomeEmpresa}\nCNPJ: ${formatarDocumento(
                    agencia.documento
                )}\nCadastur: ${cadastur}\n\nApós a aprovação, este parceiro terá acesso às compras e reservas com desconto.`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessando(
                agencia.id
            );

            setMensagem("");
            setErro("");

            /*
             * Primeiro salvamos o Cadastur
             * que foi efetivamente conferido.
             */
            await atualizarAgencia(
                agencia.id,
                {
                    cadastur,
                }
            );

            /*
             * Depois ativamos.
             *
             * ativarAgencia também registra:
             *
             * documentoVerificado
             * cadasturVerificado
             * data da aprovação
             * responsável pela aprovação
             */
            await ativarAgencia(
                agencia.id,
                "admin"
            );

            setMensagem(
                `✅ ${agencia.nomeEmpresa} foi aprovada e já pode realizar compras e reservas com desconto.`
            );

            await carregarTudo();
        } catch (error) {
            console.error(
                "Erro ao aprovar:",
                error
            );

            setErro(
                "Erro ao aprovar parceiro."
            );
        } finally {
            setProcessando("");
        }
    }

    /* ======================================
       REPROVAR
    ====================================== */

    async function reprovar(
        agencia: Agencia
    ) {
        const motivo =
            window.prompt(
                `Informe o motivo da reprovação de ${agencia.nomeEmpresa}:`
            );

        if (
            motivo === null
        ) {
            return;
        }

        const confirmou =
            window.confirm(
                `Reprovar o cadastro de ${agencia.nomeEmpresa}?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessando(
                agencia.id
            );

            setMensagem("");
            setErro("");

            await reprovarAgencia(
                agencia.id,
                motivo.trim(),
                "admin"
            );

            setMensagem(
                `${agencia.nomeEmpresa} foi reprovada.`
            );

            await carregarTudo();
        } catch (error) {
            console.error(
                "Erro ao reprovar:",
                error
            );

            setErro(
                "Erro ao reprovar parceiro."
            );
        } finally {
            setProcessando("");
        }
    }

    /* ======================================
       BLOQUEAR
    ====================================== */

    async function bloquear(
        agencia: Agencia
    ) {
        const confirmou =
            window.confirm(
                `Bloquear ${agencia.nomeEmpresa}?\n\nO parceiro perderá o acesso às novas compras e reservas com desconto.`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessando(
                agencia.id
            );

            setMensagem("");
            setErro("");

            await bloquearAgencia(
                agencia.id,
                "admin"
            );

            setMensagem(
                `${agencia.nomeEmpresa} foi bloqueada.`
            );

            await carregarTudo();
        } catch (error) {
            console.error(
                "Erro ao bloquear:",
                error
            );

            setErro(
                "Erro ao bloquear parceiro."
            );
        } finally {
            setProcessando("");
        }
    }

    /* ======================================
       REATIVAR PARA NOVA ANÁLISE
    ====================================== */

    async function voltarParaAnalise(
        agencia: Agencia
    ) {
        const confirmou =
            window.confirm(
                `Enviar ${agencia.nomeEmpresa} novamente para análise?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessando(
                agencia.id
            );

            setMensagem("");
            setErro("");

            await marcarAgenciaPendente(
                agencia.id
            );

            setMensagem(
                `${agencia.nomeEmpresa} voltou para a fila de análise.`
            );

            await carregarTudo();
        } catch (error) {
            console.error(
                error
            );

            setErro(
                "Erro ao alterar o cadastro."
            );
        } finally {
            setProcessando("");
        }
    }

    /* ======================================
       FORMATAÇÃO
    ====================================== */

    function formatarMoeda(
        valor?: number
    ) {
        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style:
                    "currency",

                currency:
                    "BRL",
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

    function formatarDocumento(
        documento?: string
    ) {
        const numeros =
            String(
                documento || ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            numeros.length ===
            14
        ) {
            return numeros.replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                "$1.$2.$3/$4-$5"
            );
        }

        return (
            documento ||
            "-"
        );
    }

    function nomeTipo(
        tipo?: string
    ) {
        if (
            tipo ===
            "agencia"
        ) {
            return "Agência";
        }

        if (
            tipo ===
            "guia"
        ) {
            return "Guia";
        }

        if (
            tipo ===
            "operadora"
        ) {
            return "Operadora";
        }

        if (
            tipo ===
            "transportadora"
        ) {
            return "Transportadora";
        }

        return (
            tipo ||
            "-"
        );
    }

    /* ======================================
       LISTAS
    ====================================== */

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

    const reprovadas =
        agencias.filter(
            (item) =>
                item.status ===
                "reprovada"
        );

    const reservasAtivas =
        reservas.filter(
            (item) =>
                item.statusOperacional ===
                "reservado"
        );

    const totalPessoasReservadas =
        reservasAtivas.reduce(
            (
                total,
                reserva
            ) =>
                total +
                Number(
                    reserva.totalVisitantes ||
                    0
                ),
            0
        );

    const valorReservasAtivas =
        reservasAtivas.reduce(
            (
                total,
                reserva
            ) =>
                total +
                Number(
                    reserva.valorFinal ||
                    0
                ),
            0
        );

    /* ======================================
       CARREGANDO
    ====================================== */

    if (carregando) {
        return (
            <main className="min-h-screen bg-slate-100 p-6">
                <p className="font-bold text-slate-700">
                    Carregando agências e reservas...
                </p>
            </main>
        );
    }

    /* ======================================
       TELA
    ====================================== */

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
            <div className="mx-auto max-w-7xl">

                {/* CABEÇALHO */}

                <div className="rounded-3xl bg-emerald-900 p-6 text-white shadow-lg">
                    <p className="text-sm font-black uppercase tracking-widest text-emerald-300">
                        Parque Mundo Novo
                    </p>

                    <h1 className="mt-2 text-3xl font-black md:text-4xl">
                        Agências e Reservas
                    </h1>

                    <p className="mt-2 text-white/80">
                        Aprovação de parceiros,
                        controle de grupos,
                        pagamentos e visitas.
                    </p>
                </div>

                {/* MENSAGENS */}

                {mensagem && (
                    <div className="mt-5 rounded-xl bg-emerald-100 p-4 font-bold text-emerald-800">
                        {mensagem}
                    </div>
                )}

                {erro && (
                    <div className="mt-5 rounded-xl bg-red-100 p-4 font-bold text-red-800">
                        {erro}
                    </div>
                )}

                {/* CONTADORES */}

                <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <Card
                        titulo="Aguardando aprovação"
                        valor={
                            pendentes.length
                        }
                    />

                    <Card
                        titulo="Parceiros aprovados"
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
                        titulo="Reprovados"
                        valor={
                            reprovadas.length
                        }
                    />

                    <Card
                        titulo="Grupos reservados"
                        valor={
                            reservasAtivas.length
                        }
                    />

                    <Card
                        titulo="Pessoas reservadas"
                        valor={
                            totalPessoasReservadas
                        }
                    />
                </section>

                {/* ALERTA PENDENTES */}

                {pendentes.length >
                    0 && (
                        <div className="mt-6 rounded-2xl border-2 border-orange-300 bg-orange-50 p-5 text-orange-900">
                            <p className="font-black">
                                ⚠️ Existem{" "}
                                {
                                    pendentes.length
                                }{" "}
                                cadastro(s) aguardando análise.
                            </p>

                            <p className="mt-2 text-sm">
                                Confira o CNPJ e a situação do parceiro no Cadastur antes de aprovar.
                            </p>
                        </div>
                    )}

                {/* =================================
                    PENDENTES
                ================================= */}

                <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-black text-orange-700">
                                Cadastros aguardando aprovação
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Confira os dados antes de liberar descontos.
                            </p>
                        </div>

                        <span className="rounded-full bg-orange-100 px-4 py-2 font-black text-orange-800">
                            {
                                pendentes.length
                            } pendente(s)
                        </span>
                    </div>

                    {pendentes.length ===
                        0 ? (
                        <p className="mt-5 text-slate-500">
                            Nenhum cadastro pendente.
                        </p>
                    ) : (
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[1250px] text-left">
                                <thead>
                                    <tr className="border-b bg-slate-50">
                                        <th className="p-3">
                                            Empresa
                                        </th>

                                        <th className="p-3">
                                            Tipo
                                        </th>

                                        <th className="p-3">
                                            CNPJ
                                        </th>

                                        <th className="p-3">
                                            Responsável
                                        </th>

                                        <th className="p-3">
                                            Cidade
                                        </th>

                                        <th className="p-3">
                                            WhatsApp
                                        </th>

                                        <th className="p-3">
                                            E-mail
                                        </th>

                                        <th className="p-3">
                                            Situação
                                        </th>

                                        <th className="p-3">
                                            Ações
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
                                                className="border-b align-top"
                                            >
                                                <td className="p-3 font-black">
                                                    {
                                                        agencia.nomeEmpresa
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {nomeTipo(
                                                        agencia.tipoParceiro
                                                    )}
                                                </td>

                                                <td className="p-3 font-mono font-bold">
                                                    {formatarDocumento(
                                                        agencia.documento
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        agencia.responsavel
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
                                                    {
                                                        agencia.email
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-800">
                                                        AGUARDANDO ANÁLISE
                                                    </span>
                                                </td>

                                                <td className="p-3">
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                aprovar(
                                                                    agencia
                                                                )
                                                            }
                                                            disabled={
                                                                processando ===
                                                                agencia.id
                                                            }
                                                            className="rounded-xl bg-green-600 px-4 py-2 font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                                                        >
                                                            ✅ APROVAR
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                reprovar(
                                                                    agencia
                                                                )
                                                            }
                                                            disabled={
                                                                processando ===
                                                                agencia.id
                                                            }
                                                            className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            ❌ REPROVAR
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* =================================
                    APROVADAS
                ================================= */}

                <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-2xl font-black text-emerald-700">
                            Parceiros aprovados
                        </h2>

                        <span className="rounded-full bg-green-100 px-4 py-2 font-black text-green-800">
                            {
                                ativas.length
                            } ativo(s)
                        </span>
                    </div>

                    {ativas.length ===
                        0 ? (
                        <p className="mt-5 text-slate-500">
                            Nenhum parceiro aprovado.
                        </p>
                    ) : (
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[1250px] text-left">
                                <thead>
                                    <tr className="border-b bg-slate-50">
                                        <th className="p-3">
                                            Empresa
                                        </th>

                                        <th className="p-3">
                                            CNPJ
                                        </th>

                                        <th className="p-3">
                                            Cadastur
                                        </th>

                                        <th className="p-3">
                                            Tipo
                                        </th>

                                        <th className="p-3">
                                            E-mail
                                        </th>

                                        <th className="p-3">
                                            Verificação
                                        </th>

                                        <th className="p-3">
                                            Área do parceiro
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
                                                <td className="p-3 font-black">
                                                    {
                                                        agencia.nomeEmpresa
                                                    }
                                                </td>

                                                <td className="p-3 font-mono">
                                                    {formatarDocumento(
                                                        agencia.documento
                                                    )}
                                                </td>

                                                <td className="p-3 font-bold">
                                                    {
                                                        agencia.cadastur ||
                                                        "-"
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {nomeTipo(
                                                        agencia.tipoParceiro
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        agencia.email
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    <div className="space-y-1">
                                                        <span className="block rounded-full bg-green-100 px-3 py-1 text-center text-xs font-black text-green-800">
                                                            CNPJ CONFERIDO
                                                        </span>

                                                        <span className="block rounded-full bg-green-100 px-3 py-1 text-center text-xs font-black text-green-800">
                                                            CADASTUR REGULAR
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="p-3">
                                                    <a
                                                        href={`/parceiros/reservas?agenciaId=${agencia.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-block rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"
                                                    >
                                                        Abrir área
                                                    </a>
                                                </td>

                                                <td className="p-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            bloquear(
                                                                agencia
                                                            )
                                                        }
                                                        disabled={
                                                            processando ===
                                                            agencia.id
                                                        }
                                                        className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50"
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
                    )}
                </section>

                {/* =================================
                    BLOQUEADAS
                ================================= */}

                {bloqueadas.length >
                    0 && (
                        <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                            <h2 className="text-2xl font-black text-red-700">
                                Parceiros bloqueados
                            </h2>

                            <div className="mt-5 overflow-x-auto">
                                <table className="w-full min-w-[800px] text-left">
                                    <thead>
                                        <tr className="border-b bg-slate-50">
                                            <th className="p-3">
                                                Empresa
                                            </th>

                                            <th className="p-3">
                                                CNPJ
                                            </th>

                                            <th className="p-3">
                                                E-mail
                                            </th>

                                            <th className="p-3">
                                                Ação
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {bloqueadas.map(
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
                                                        {formatarDocumento(
                                                            agencia.documento
                                                        )}
                                                    </td>

                                                    <td className="p-3">
                                                        {
                                                            agencia.email
                                                        }
                                                    </td>

                                                    <td className="p-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                voltarParaAnalise(
                                                                    agencia
                                                                )
                                                            }
                                                            className="rounded-xl bg-orange-600 px-4 py-2 font-bold text-white"
                                                        >
                                                            VOLTAR PARA ANÁLISE
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                {/* =================================
                    REPROVADAS
                ================================= */}

                {reprovadas.length >
                    0 && (
                        <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                            <h2 className="text-2xl font-black text-slate-700">
                                Cadastros reprovados
                            </h2>

                            <div className="mt-5 overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left">
                                    <thead>
                                        <tr className="border-b bg-slate-50">
                                            <th className="p-3">
                                                Empresa
                                            </th>

                                            <th className="p-3">
                                                CNPJ
                                            </th>

                                            <th className="p-3">
                                                Motivo
                                            </th>

                                            <th className="p-3">
                                                Ação
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {reprovadas.map(
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
                                                        {formatarDocumento(
                                                            agencia.documento
                                                        )}
                                                    </td>

                                                    <td className="p-3">
                                                        {
                                                            agencia.motivoReprovacao ||
                                                            "-"
                                                        }
                                                    </td>

                                                    <td className="p-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                voltarParaAnalise(
                                                                    agencia
                                                                )
                                                            }
                                                            className="rounded-xl bg-orange-600 px-4 py-2 font-bold text-white"
                                                        >
                                                            REANALISAR
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                {/* =================================
                    RESERVAS
                ================================= */}

                <section className="mt-8 rounded-2xl bg-white p-5 shadow">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-emerald-800">
                                Reservas e Compras das Agências
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Controle dos grupos programados para visitar o Parque.
                            </p>
                        </div>

                        <div className="rounded-xl bg-emerald-100 px-4 py-3 text-right">
                            <p className="text-xs font-bold uppercase text-emerald-700">
                                Valor das reservas ativas
                            </p>

                            <p className="text-xl font-black text-emerald-900">
                                {formatarMoeda(
                                    valorReservasAtivas
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[1500px] text-left">
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
                                        Adultos
                                    </th>

                                    <th className="p-3">
                                        Idosos
                                    </th>

                                    <th className="p-3">
                                        Elevador
                                    </th>

                                    <th className="p-3">
                                        Desconto
                                    </th>

                                    <th className="p-3">
                                        Valor bruto
                                    </th>

                                    <th className="p-3">
                                        Desconto R$
                                    </th>

                                    <th className="p-3">
                                        Valor final
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
                                                13
                                            }
                                            className="p-6 text-center text-slate-500"
                                        >
                                            Nenhuma reserva de agência registrada.
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
                                                <td className="p-3 font-black">
                                                    {reserva.agenciaNome ||
                                                        "Reserva antiga"}
                                                </td>

                                                <td className="p-3 font-mono font-bold">
                                                    {
                                                        reserva.codigoGrupo ||
                                                        "-"
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {formatarData(
                                                        reserva.dataVisita
                                                    )}

                                                    {reserva.horaPrevista
                                                        ? ` às ${reserva.horaPrevista}`
                                                        : ""}
                                                </td>

                                                <td className="p-3 text-lg font-black">
                                                    {reserva.totalVisitantes ||
                                                        0}
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        reserva.adultos ||
                                                        0
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {
                                                        reserva.idosos ||
                                                        0
                                                    }
                                                </td>

                                                <td className="p-3">
                                                    {reserva.elevador
                                                        ? `${reserva.qtdElevador || 0} pessoa(s)`
                                                        : "Não"}
                                                </td>

                                                <td className="p-3 font-black text-emerald-700">
                                                    {reserva.descontoAplicado ||
                                                        0}
                                                    %
                                                </td>

                                                <td className="p-3">
                                                    {formatarMoeda(
                                                        reserva.valorBruto
                                                    )}
                                                </td>

                                                <td className="p-3 text-emerald-700">
                                                    -
                                                    {formatarMoeda(
                                                        reserva.valorDesconto
                                                    )}
                                                </td>

                                                <td className="p-3 text-lg font-black">
                                                    {formatarMoeda(
                                                        reserva.valorFinal
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    <StatusPagamento
                                                        status={
                                                            reserva.statusPagamento
                                                        }
                                                    />
                                                </td>

                                                <td className="p-3">
                                                    <StatusOperacional
                                                        status={
                                                            reserva.statusOperacional
                                                        }
                                                    />
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

/* ==========================================
   CARD
========================================== */

function Card({
    titulo,
    valor,
}: {
    titulo:
    string;

    valor:
    string |
    number;
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

/* ==========================================
   STATUS PAGAMENTO
========================================== */

function StatusPagamento({
    status,
}: {
    status?: string;
}) {
    if (
        status ===
        "pago_antecipado"
    ) {
        return (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">
                PAGO ANTECIPADO
            </span>
        );
    }

    if (
        status ===
        "pago_na_chegada"
    ) {
        return (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                PAGO NA CHEGADA
            </span>
        );
    }

    if (
        status ===
        "a_pagar_na_chegada"
    ) {
        return (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-800">
                A PAGAR NA CHEGADA
            </span>
        );
    }

    return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            {status ||
                "-"}
        </span>
    );
}

/* ==========================================
   STATUS OPERACIONAL
========================================== */

function StatusOperacional({
    status,
}: {
    status?: string;
}) {
    if (
        status ===
        "reservado"
    ) {
        return (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                RESERVADO
            </span>
        );
    }

    if (
        status ===
        "utilizado"
    ) {
        return (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">
                UTILIZADO
            </span>
        );
    }

    if (
        status ===
        "cancelado"
    ) {
        return (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                CANCELADO
            </span>
        );
    }

    return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            {status ||
                "-"}
        </span>
    );
}