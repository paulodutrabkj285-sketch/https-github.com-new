"use client";

import {
    atualizarPedido,
    listarPedidosAtivosPortaria,
    Pedido,
} from "@/lib/pedidos";
import {
    listarPedidosLocalmente,
    listarReservasAgenciasLocalmente,
    obterPendentes,
    registrarValidacaoOffline,
    registrarValidacaoReservaOffline,
    ReservaAgenciaCache,
    salvarPedidosLocalmente,
    salvarReservasAgenciasLocalmente,
    sincronizarPendentes,
} from "@/lib/portariaDb";
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDocs,
    updateDoc,
} from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

const FUNCIONARIOS = [
    "HANDERSON",
    "DANIELA",
    "JULIA",
    "JHAMES",
    "JOSEVITOR",
    "SILVANA",
    "VICTOR",
    "WELLINGTON",
    "PEDRO",
    "FRANCISCO",
    "Perteson",
];

type EntidadeElevador =
    | { tipo: "pedido"; pedido: Pedido }
    | { tipo: "reserva_agencia"; reserva: ReservaAgenciaCache };

type DadosQrReserva = {
    tipo?: string;
    codigoGrupo?: string;
};

function normalizarCodigo(valor?: string) {
    return String(valor || "").trim().toUpperCase();
}

function numeroSeguro(valor: unknown) {
    const numero = Number(valor || 0);
    return Number.isFinite(numero) ? numero : 0;
}

function formatarData(valor?: string) {
    if (!valor) return "Não informada";
    const partes = String(valor).split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return String(valor);
}

function formatarDataHora(valor?: string) {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function ehIngressoElevador(pedido: Pedido) {
    const tipo = String(pedido.tipo || "").trim().toLowerCase();
    const produto = String(pedido.produto || "").trim().toLowerCase();

    return (
        tipo === "elevador" ||
        produto.includes("elevador") ||
        pedido.elevador === true ||
        numeroSeguro(pedido.qtdElevador) > 0
    );
}

function quantidadeElevadorPedido(pedido: Pedido) {
    const especifica = numeroSeguro(pedido.qtdElevador);
    if (especifica > 0) return especifica;

    const quantidade = numeroSeguro(pedido.quantidade);
    return quantidade > 0 ? quantidade : 1;
}

function reservaTemElevador(reserva: ReservaAgenciaCache) {
    return reserva.elevador === true && numeroSeguro(reserva.qtdElevador) > 0;
}

function extrairCodigoQr(texto: string) {
    const bruto = String(texto || "").trim();

    if (!bruto) {
        return { codigo: "", tipo: "desconhecido" as const };
    }

    try {
        const dados = JSON.parse(bruto) as DadosQrReserva;
        if (dados?.tipo === "reserva_agencia" && dados?.codigoGrupo) {
            return {
                codigo: normalizarCodigo(dados.codigoGrupo),
                tipo: "reserva_agencia" as const,
            };
        }
    } catch {
        // QR normal pode ser somente o código PMN.
    }

    const codigo = normalizarCodigo(bruto);

    if (codigo.startsWith("GRP-")) {
        return { codigo, tipo: "reserva_agencia" as const };
    }

    if (codigo.startsWith("PMN-")) {
        return { codigo, tipo: "pedido" as const };
    }

    return { codigo, tipo: "desconhecido" as const };
}

export default function ElevadorValidacaoPage() {
    const [entidade, setEntidade] = useState<EntidadeElevador | null>(null);
    const [mensagem, setMensagem] = useState(
        "Aguardando leitura do ingresso do elevador"
    );
    const [carregando, setCarregando] = useState(false);
    const [cameraAtiva, setCameraAtiva] = useState(false);
    const [codigoManual, setCodigoManual] = useState("");
    const [funcionario, setFuncionario] = useState("");
    const [isOnline, setIsOnline] = useState(true);
    const [sincronizando, setSincronizando] = useState(false);
    const [pendentesCount, setPendentesCount] = useState(0);
    const [pedidosCache, setPedidosCache] = useState<Pedido[]>([]);
    const [reservasCache, setReservasCache] = useState<ReservaAgenciaCache[]>([]);
    const [pessoasHoje, setPessoasHoje] = useState(0);

    const leitorRef = useRef<Html5Qrcode | null>(null);
    const bloqueioLeituraRef = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        setIsOnline(navigator.onLine);

        const online = () => {
            setIsOnline(true);
            void sincronizarTudo();
        };

        const offline = () => setIsOnline(false);

        window.addEventListener("online", online);
        window.addEventListener("offline", offline);

        void carregarDados();

        return () => {
            window.removeEventListener("online", online);
            window.removeEventListener("offline", offline);
            void pararCamera();
        };
    }, []);

    useEffect(() => {
        void atualizarPendencias();
    }, [entidade]);

    async function carregarReservasOnline() {
        const snap = await getDocs(collection(db, "reservas_agencias"));

        return snap.docs.map((item) => ({
            id: item.id,
            ...item.data(),
        })) as ReservaAgenciaCache[];
    }

    function calcularContadorHoje(
        pedidos: Pedido[],
        reservas: ReservaAgenciaCache[]
    ) {
        const hoje = new Date().toISOString().slice(0, 10);
        let total = 0;

        for (const pedido of pedidos) {
            if (
                pedido.elevadorValidado &&
                String(pedido.elevadorValidadoEm || "").startsWith(hoje)
            ) {
                total +=
                    numeroSeguro(pedido.elevadorQuantidadeValidada) ||
                    quantidadeElevadorPedido(pedido);
            }
        }

        for (const reserva of reservas) {
            if (
                reserva.elevadorValidado &&
                String(reserva.elevadorValidadoEm || "").startsWith(hoje)
            ) {
                total +=
                    numeroSeguro(reserva.elevadorQuantidadeValidada) ||
                    numeroSeguro(reserva.qtdElevador);
            }
        }

        setPessoasHoje(total);
    }

    async function carregarDados() {
        try {
            if (typeof navigator !== "undefined" && navigator.onLine) {
                const [pedidos, reservas] = await Promise.all([
                    listarPedidosAtivosPortaria(),
                    carregarReservasOnline(),
                ]);

                setPedidosCache(pedidos);
                setReservasCache(reservas);

                await Promise.all([
                    salvarPedidosLocalmente(pedidos),
                    salvarReservasAgenciasLocalmente(reservas),
                ]);

                calcularContadorHoje(pedidos, reservas);
                return;
            }
        } catch (error) {
            console.error("ELEVADOR: erro ao carregar online:", error);
        }

        try {
            const [pedidos, reservas] = await Promise.all([
                listarPedidosLocalmente(),
                listarReservasAgenciasLocalmente(),
            ]);

            setPedidosCache(pedidos);
            setReservasCache(reservas);
            calcularContadorHoje(pedidos, reservas);
        } catch (error) {
            console.error("ELEVADOR: erro ao carregar cache:", error);
        }
    }

    async function atualizarPendencias() {
        try {
            const itens = await obterPendentes();
            setPendentesCount(itens.filter((item) => item.local === "elevador").length);
        } catch (error) {
            console.error("ELEVADOR: erro ao contar pendências:", error);
        }
    }

    async function sincronizarTudo() {
        if (sincronizando) return;

        try {
            setSincronizando(true);
            const quantidade = await sincronizarPendentes();
            await carregarDados();
            await atualizarPendencias();

            if (quantidade > 0) {
                setMensagem(`${quantidade} validação(ões) sincronizada(s).`);
            }
        } catch (error) {
            console.error("ELEVADOR: erro ao sincronizar:", error);
            setMensagem("Erro ao sincronizar dados.");
        } finally {
            setSincronizando(false);
        }
    }

    function vibrar(tipo: "sucesso" | "erro") {
        if (typeof navigator === "undefined" || !navigator.vibrate) return;

        navigator.vibrate(
            tipo === "sucesso" ? [120, 70, 120] : [220, 120, 220]
        );
    }

    function validarPedido(pedido: Pedido) {
        setEntidade({ tipo: "pedido", pedido });

        if (pedido.statusPagamento !== "pago") {
            setMensagem("PAGAMENTO NÃO CONFIRMADO — NÃO LIBERAR");
            vibrar("erro");
            return;
        }

        if (!ehIngressoElevador(pedido)) {
            setMensagem("ESTE INGRESSO NÃO POSSUI ELEVADOR");
            vibrar("erro");
            return;
        }

        if (pedido.elevadorValidado) {
            setMensagem(
                `ELEVADOR JÁ UTILIZADO EM ${formatarDataHora(
                    pedido.elevadorValidadoEm
                )}`
            );
            vibrar("erro");
            return;
        }

        setMensagem(
            `INGRESSO VÁLIDO — LIBERAR ${quantidadeElevadorPedido(pedido)} PESSOA(S)`
        );
        vibrar("sucesso");
    }

    function validarReserva(reserva: ReservaAgenciaCache) {
        setEntidade({ tipo: "reserva_agencia", reserva });

        if (reserva.statusPagamento !== "pago") {
            setMensagem("RESERVA COM PAGAMENTO PENDENTE — NÃO LIBERAR");
            vibrar("erro");
            return;
        }

        if (!reservaTemElevador(reserva)) {
            setMensagem("ESTA RESERVA NÃO POSSUI ELEVADOR");
            vibrar("erro");
            return;
        }

        if (reserva.elevadorValidado) {
            setMensagem(
                `ELEVADOR JÁ UTILIZADO EM ${formatarDataHora(
                    reserva.elevadorValidadoEm
                )}`
            );
            vibrar("erro");
            return;
        }

        setMensagem(
            `RESERVA VÁLIDA — LIBERAR ${numeroSeguro(
                reserva.qtdElevador
            )} PESSOA(S) NO ELEVADOR`
        );
        vibrar("sucesso");
    }

    async function buscarCodigo(texto: string) {
        if (carregando || bloqueioLeituraRef.current) return;

        const dados = extrairCodigoQr(texto);

        if (!dados.codigo) {
            setMensagem("CÓDIGO INVÁLIDO");
            vibrar("erro");
            return;
        }

        bloqueioLeituraRef.current = true;

        try {
            setCarregando(true);
            setEntidade(null);
            await pararCamera();

            if (typeof navigator !== "undefined" && navigator.onLine) {
                await carregarDados();
            }

            if (dados.tipo === "reserva_agencia" || dados.codigo.startsWith("GRP-")) {
                const reservas =
                    typeof navigator !== "undefined" && navigator.onLine
                        ? reservasCache
                        : await listarReservasAgenciasLocalmente();

                let reserva = reservas.find(
                    (item) => normalizarCodigo(item.codigoGrupo) === dados.codigo
                );

                if (!reserva && typeof navigator !== "undefined" && navigator.onLine) {
                    const atualizadas = await carregarReservasOnline();
                    setReservasCache(atualizadas);
                    await salvarReservasAgenciasLocalmente(atualizadas);
                    reserva = atualizadas.find(
                        (item) => normalizarCodigo(item.codigoGrupo) === dados.codigo
                    );
                }

                if (!reserva) {
                    setMensagem("RESERVA DE AGÊNCIA NÃO ENCONTRADA");
                    vibrar("erro");
                    return;
                }

                validarReserva(reserva);
                return;
            }

            let pedido = pedidosCache.find(
                (item) => normalizarCodigo(item.codigoIngresso) === dados.codigo
            );

            if (!pedido) {
                const locais = await listarPedidosLocalmente();
                pedido = locais.find(
                    (item) => normalizarCodigo(item.codigoIngresso) === dados.codigo
                );
            }

            if (!pedido) {
                setMensagem("INGRESSO NÃO ENCONTRADO");
                vibrar("erro");
                return;
            }

            validarPedido(pedido);
        } catch (error) {
            console.error("ELEVADOR: erro ao consultar:", error);
            setMensagem("ERRO AO CONSULTAR INGRESSO");
            vibrar("erro");
        } finally {
            setCarregando(false);
            setTimeout(() => {
                bloqueioLeituraRef.current = false;
            }, 700);
        }
    }

    async function iniciarCamera() {
        if (!funcionario.trim()) {
            setMensagem("SELECIONE O FUNCIONÁRIO PRIMEIRO");
            vibrar("erro");
            return;
        }

        setEntidade(null);
        setMensagem("Aponte a câmera para o QR Code");
        setCameraAtiva(true);

        setTimeout(async () => {
            try {
                const leitor = new Html5Qrcode("leitor-elevador");
                leitorRef.current = leitor;

                await leitor.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 280, height: 280 } },
                    async (texto) => {
                        if (texto) await buscarCodigo(texto);
                    },
                    () => { }
                );
            } catch (error) {
                console.error("ELEVADOR: câmera:", error);
                setCameraAtiva(false);
                setMensagem("NÃO FOI POSSÍVEL ACESSAR A CÂMERA");
                vibrar("erro");
            }
        }, 250);
    }

    async function pararCamera() {
        try {
            if (leitorRef.current) {
                try {
                    await leitorRef.current.stop();
                } catch { }

                try {
                    await leitorRef.current.clear();
                } catch { }

                leitorRef.current = null;
            }
        } finally {
            setCameraAtiva(false);
        }
    }

    const podeConfirmar = useMemo(() => {
        if (!entidade || !funcionario.trim()) return false;

        if (entidade.tipo === "pedido") {
            return (
                entidade.pedido.statusPagamento === "pago" &&
                ehIngressoElevador(entidade.pedido) &&
                !entidade.pedido.elevadorValidado
            );
        }

        return (
            entidade.reserva.statusPagamento === "pago" &&
            reservaTemElevador(entidade.reserva) &&
            !entidade.reserva.elevadorValidado
        );
    }, [entidade, funcionario]);

    async function confirmarUsoElevador() {
        if (!entidade || !podeConfirmar) return;

        const agora = new Date().toISOString();

        try {
            setCarregando(true);

            if (entidade.tipo === "pedido") {
                const quantidade = quantidadeElevadorPedido(entidade.pedido);
                const dados = {
                    elevadorValidado: true,
                    elevadorValidadoPor: funcionario,
                    elevadorValidadoEm: agora,
                    elevadorQuantidadeValidada: quantidade,
                };

                if (navigator.onLine) {
                    await atualizarPedido(entidade.pedido.id, dados);
                } else {
                    await registrarValidacaoOffline(
                        entidade.pedido.id,
                        "elevador",
                        dados
                    );
                }

                const atualizado: Pedido = { ...entidade.pedido, ...dados };
                setEntidade({ tipo: "pedido", pedido: atualizado });
                setPedidosCache((atuais) =>
                    atuais.map((item) => (item.id === atualizado.id ? atualizado : item))
                );
                setPessoasHoje((total) => total + quantidade);
                setMensagem(`ELEVADOR VALIDADO — LIBERAR ${quantidade} PESSOA(S)`);
            } else {
                const quantidade = numeroSeguro(entidade.reserva.qtdElevador);
                const dados = {
                    elevadorValidado: true,
                    elevadorValidadoPor: funcionario,
                    elevadorValidadoEm: agora,
                    elevadorQuantidadeValidada: quantidade,
                };

                if (navigator.onLine) {
                    await updateDoc(
                        doc(db, "reservas_agencias", entidade.reserva.id),
                        dados
                    );
                } else {
                    await registrarValidacaoReservaOffline(
                        entidade.reserva.id,
                        "elevador",
                        dados
                    );
                }

                const atualizada: ReservaAgenciaCache = {
                    ...entidade.reserva,
                    ...dados,
                };

                setEntidade({ tipo: "reserva_agencia", reserva: atualizada });
                setReservasCache((atuais) =>
                    atuais.map((item) => (item.id === atualizada.id ? atualizada : item))
                );
                setPessoasHoje((total) => total + quantidade);
                setMensagem(`ELEVADOR VALIDADO — LIBERAR ${quantidade} PESSOA(S)`);
            }

            vibrar("sucesso");
            await atualizarPendencias();
        } catch (error) {
            console.error("ELEVADOR: erro ao validar:", error);
            setMensagem("ERRO AO REGISTRAR USO DO ELEVADOR");
            vibrar("erro");
        } finally {
            setCarregando(false);
        }
    }

    const statusVisual = useMemo(() => {
        if (!entidade) {
            return {
                classe: "border-slate-300 bg-white/95 text-slate-900",
                titulo: "AGUARDANDO",
            };
        }

        if (entidade.tipo === "pedido") {
            const pedido = entidade.pedido;

            if (pedido.statusPagamento !== "pago") {
                return {
                    classe: "border-red-400 bg-red-50 text-red-950",
                    titulo: "NÃO LIBERAR",
                };
            }

            if (!ehIngressoElevador(pedido)) {
                return {
                    classe: "border-red-400 bg-red-50 text-red-950",
                    titulo: "SEM ELEVADOR",
                };
            }

            if (pedido.elevadorValidado) {
                return {
                    classe: "border-amber-400 bg-amber-50 text-amber-950",
                    titulo: "JÁ UTILIZADO",
                };
            }

            return {
                classe: "border-emerald-400 bg-emerald-50 text-emerald-950",
                titulo: "VÁLIDO",
            };
        }

        const reserva = entidade.reserva;

        if (reserva.statusPagamento !== "pago") {
            return {
                classe: "border-red-400 bg-red-50 text-red-950",
                titulo: "PAGAMENTO PENDENTE",
            };
        }

        if (!reservaTemElevador(reserva)) {
            return {
                classe: "border-red-400 bg-red-50 text-red-950",
                titulo: "SEM ELEVADOR",
            };
        }

        if (reserva.elevadorValidado) {
            return {
                classe: "border-amber-400 bg-amber-50 text-amber-950",
                titulo: "JÁ UTILIZADO",
            };
        }

        return {
            classe: "border-emerald-400 bg-emerald-50 text-emerald-950",
            titulo: "VÁLIDO",
        };
    }, [entidade]);

    return (
        <main
            className="min-h-screen bg-cover bg-center bg-fixed px-4 py-6"
            style={{
                backgroundImage:
                    "linear-gradient(rgba(0,0,0,.68), rgba(0,0,0,.78)), url('/fotos/fundo-geral.jpg')",
            }}
        >
            <div className="mx-auto max-w-3xl">
                <header className="rounded-3xl border border-white/15 bg-slate-950/80 p-5 text-white shadow-2xl backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
                                Parque Mundo Novo
                            </p>
                            <h1 className="mt-1 text-3xl font-black">🚡 Validação do Elevador</h1>
                            <p className="mt-2 text-sm text-white/70">
                                Aplicativo exclusivo do Elevador Panorâmico
                            </p>
                        </div>

                        <div
                            className={`rounded-2xl px-4 py-3 text-center text-xs font-black ${isOnline
                                    ? "bg-emerald-500/20 text-emerald-200"
                                    : "bg-amber-500/20 text-amber-200"
                                }`}
                        >
                            {isOnline ? "● ONLINE" : "● OFFLINE"}
                        </div>
                    </div>
                </header>

                <section className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-sky-600 p-4 text-center text-white shadow-xl">
                        <p className="text-xs font-black uppercase">Pessoas no elevador hoje</p>
                        <p className="mt-1 text-4xl font-black">{pessoasHoje}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-900 p-4 text-center text-white shadow-xl">
                        <p className="text-xs font-black uppercase">Pendências offline</p>
                        <p className="mt-1 text-4xl font-black">{pendentesCount}</p>
                    </div>
                </section>

                {!isOnline && (
                    <div className="mt-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-center font-bold text-amber-950">
                        ⚠️ Modo offline. Use somente este aparelho até a conexão voltar para evitar validação duplicada.
                    </div>
                )}

                <section className="mt-4 rounded-3xl bg-white/95 p-5 shadow-xl">
                    <label className="block text-sm font-black uppercase text-slate-600">
                        Funcionário do elevador
                    </label>
                    <select
                        value={funcionario}
                        onChange={(event) => setFuncionario(event.target.value)}
                        className="mt-2 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-lg font-black text-slate-900"
                    >
                        <option value="">Selecione...</option>
                        {FUNCIONARIOS.map((nome) => (
                            <option key={nome} value={nome}>
                                {nome}
                            </option>
                        ))}
                    </select>
                </section>

                <section className="mt-4 rounded-3xl bg-white/95 p-5 shadow-xl">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={cameraAtiva ? pararCamera : iniciarCamera}
                            disabled={carregando}
                            className={`rounded-2xl px-5 py-4 text-lg font-black text-white ${cameraAtiva ? "bg-red-600" : "bg-sky-600"
                                }`}
                        >
                            {cameraAtiva ? "⏹ Parar câmera" : "📷 Ler QR Code"}
                        </button>

                        <button
                            type="button"
                            onClick={sincronizarTudo}
                            disabled={!isOnline || sincronizando}
                            className="rounded-2xl bg-slate-800 px-5 py-4 text-lg font-black text-white disabled:bg-slate-400"
                        >
                            {sincronizando ? "Sincronizando..." : "🔄 Sincronizar"}
                        </button>
                    </div>

                    {cameraAtiva && (
                        <div className="mt-4 overflow-hidden rounded-3xl bg-black p-2">
                            <div id="leitor-elevador" className="min-h-[320px] w-full" />
                        </div>
                    )}

                    <div className="mt-5 border-t pt-5">
                        <p className="text-sm font-black uppercase text-slate-600">Digitar código</p>
                        <div className="mt-2 flex gap-2">
                            <input
                                value={codigoManual}
                                onChange={(event) =>
                                    setCodigoManual(event.target.value.toUpperCase())
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") void buscarCodigo(codigoManual);
                                }}
                                placeholder="PMN-12345 ou GRP-2026-123456"
                                className="min-w-0 flex-1 rounded-2xl border-2 border-slate-300 px-4 py-4 font-mono font-black uppercase text-slate-900"
                            />
                            <button
                                type="button"
                                onClick={() => buscarCodigo(codigoManual)}
                                disabled={carregando}
                                className="rounded-2xl bg-slate-900 px-5 py-4 font-black text-white"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </section>

                <section
                    className={`mt-4 rounded-3xl border-4 p-6 text-center shadow-2xl ${statusVisual.classe}`}
                >
                    <p className="text-sm font-black uppercase tracking-[0.2em]">
                        {statusVisual.titulo}
                    </p>
                    <p className="mt-3 text-2xl font-black">{mensagem}</p>
                </section>

                {entidade?.tipo === "pedido" && (
                    <section className="mt-4 rounded-3xl bg-white/95 p-6 text-slate-900 shadow-xl">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase text-slate-500">Ingresso</p>
                                <p className="mt-1 font-mono text-2xl font-black">
                                    {entidade.pedido.codigoIngresso}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-sky-100 px-5 py-3 text-center text-sky-900">
                                <p className="text-xs font-black uppercase">Liberar</p>
                                <p className="text-3xl font-black">
                                    {quantidadeElevadorPedido(entidade.pedido)}
                                </p>
                                <p className="text-xs font-bold">pessoa(s)</p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Cliente</p>
                                <p className="font-bold">{entidade.pedido.nome || "-"}</p>
                            </div>
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Produto</p>
                                <p className="font-bold">{entidade.pedido.produto || "-"}</p>
                            </div>
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Data da visita</p>
                                <p className="font-bold">{formatarData(entidade.pedido.dataVisita)}</p>
                            </div>
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Pagamento</p>
                                <p className="font-black uppercase">
                                    {entidade.pedido.statusPagamento}
                                </p>
                            </div>
                        </div>

                        {entidade.pedido.elevadorValidado && (
                            <div className="mt-4 rounded-2xl bg-amber-100 p-4 text-sm text-amber-950">
                                <strong>Já validado por:</strong>{" "}
                                {entidade.pedido.elevadorValidadoPor || "-"}
                                <br />
                                <strong>Data/hora:</strong>{" "}
                                {formatarDataHora(entidade.pedido.elevadorValidadoEm)}
                            </div>
                        )}
                    </section>
                )}

                {entidade?.tipo === "reserva_agencia" && (
                    <section className="mt-4 rounded-3xl bg-white/95 p-6 text-slate-900 shadow-xl">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase text-slate-500">
                                    Reserva de agência
                                </p>
                                <p className="mt-1 font-mono text-xl font-black">
                                    {entidade.reserva.codigoGrupo}
                                </p>
                                <p className="mt-2 text-lg font-black text-sky-800">
                                    {entidade.reserva.agenciaNome || "Agência"}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-sky-100 px-5 py-3 text-center text-sky-900">
                                <p className="text-xs font-black uppercase">Liberar no elevador</p>
                                <p className="text-3xl font-black">
                                    {numeroSeguro(entidade.reserva.qtdElevador)}
                                </p>
                                <p className="text-xs font-bold">pessoa(s)</p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Grupo total</p>
                                <p className="font-black">
                                    {numeroSeguro(entidade.reserva.totalVisitantes)} pessoa(s)
                                </p>
                            </div>
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Elevador</p>
                                <p className="font-black">
                                    {numeroSeguro(entidade.reserva.qtdElevador)} pessoa(s)
                                </p>
                            </div>
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Data da visita</p>
                                <p className="font-bold">{formatarData(entidade.reserva.dataVisita)}</p>
                            </div>
                            <div className="rounded-xl bg-slate-100 p-3">
                                <p className="text-xs text-slate-500">Pagamento</p>
                                <p className="font-black uppercase">
                                    {entidade.reserva.statusPagamento || "-"}
                                </p>
                            </div>
                        </div>

                        {entidade.reserva.elevadorValidado && (
                            <div className="mt-4 rounded-2xl bg-amber-100 p-4 text-sm text-amber-950">
                                <strong>Já validado por:</strong>{" "}
                                {entidade.reserva.elevadorValidadoPor || "-"}
                                <br />
                                <strong>Data/hora:</strong>{" "}
                                {formatarDataHora(entidade.reserva.elevadorValidadoEm)}
                            </div>
                        )}
                    </section>
                )}

                {entidade && (
                    <section className="mt-4 rounded-3xl bg-white/95 p-5 shadow-xl">
                        <button
                            type="button"
                            onClick={confirmarUsoElevador}
                            disabled={carregando || !podeConfirmar}
                            className="w-full rounded-2xl bg-emerald-600 px-5 py-5 text-xl font-black text-white disabled:bg-slate-400"
                        >
                            {carregando
                                ? "Registrando..."
                                : podeConfirmar
                                    ? entidade.tipo === "pedido"
                                        ? `✅ CONFIRMAR E LIBERAR ${quantidadeElevadorPedido(
                                            entidade.pedido
                                        )} PESSOA(S)`
                                        : `✅ CONFIRMAR E LIBERAR ${numeroSeguro(
                                            entidade.reserva.qtdElevador
                                        )} PESSOA(S)`
                                    : "VALIDAÇÃO NÃO PERMITIDA"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setEntidade(null);
                                setCodigoManual("");
                                setMensagem("Aguardando leitura do ingresso do elevador");
                            }}
                            className="mt-3 w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 font-black text-slate-800"
                        >
                            Nova leitura
                        </button>
                    </section>
                )}

                <p className="mt-6 text-center text-xs text-white/60">
                    Parque Mundo Novo • Validação exclusiva do Elevador Panorâmico
                </p>
            </div>
        </main>
    );
}