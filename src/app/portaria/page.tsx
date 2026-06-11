"use client";

import { atualizarPedido, listarPedidos, Pedido } from "@/lib/pedidos";
import { Html5Qrcode } from "html5-qrcode";
import { useRef, useState } from "react";

export default function PortariaPage() {
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [mensagem, setMensagem] = useState("Aguardando leitura do ingresso");
    const [carregando, setCarregando] = useState(false);
    const [cameraAtiva, setCameraAtiva] = useState(false);
    const [codigoManual, setCodigoManual] = useState("");

    const leitorRef = useRef<Html5Qrcode | null>(null);

    function limpar(valor: string) {
        return String(valor || "").trim();
    }

    function formatarDataHora(valor?: string) {
        if (!valor) return "";

        return new Date(valor).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function extrairQr(texto: string) {
        const valor = limpar(texto);

        try {
            const dados = JSON.parse(valor);

            return {
                codigo: limpar(dados?.codigo || dados?.codigoIngresso || ""),
                pedidoId: limpar(dados?.pedidoId || ""),
            };
        } catch {
            return {
                codigo: valor,
                pedidoId: "",
            };
        }
    }

    async function buscarIngresso(textoQr: string) {
        try {
            setCarregando(true);
            setPedido(null);

            const dadosQr = extrairQr(textoQr);
            const pedidos = await listarPedidos();

            const encontrado = pedidos.find((item) => {
                return (
                    limpar(item.codigoIngresso || "") === dadosQr.codigo ||
                    limpar(item.qrCodeIngresso || "") === dadosQr.codigo ||
                    limpar(item.id || "") === dadosQr.codigo ||
                    limpar(item.id || "") === dadosQr.pedidoId
                );
            });

            await pararCamera();

            if (!encontrado) {
                setMensagem("INGRESSO NÃO ENCONTRADO");
                return;
            }

            setPedido(encontrado);
            setCodigoManual(encontrado.codigoIngresso || dadosQr.codigo);

            if (encontrado.statusPagamento !== "pago") {
                setMensagem("INGRESSO NÃO PAGO");
                return;
            }

            if (encontrado.statusOperacional === "utilizado") {
                setMensagem("INGRESSO JÁ UTILIZADO");
                return;
            }

            if (encontrado.statusOperacional === "bloqueado") {
                setMensagem("INGRESSO BLOQUEADO");
                return;
            }

            setMensagem("INGRESSO VÁLIDO");
        } catch (error) {
            console.error(error);
            setMensagem("ERRO AO VALIDAR INGRESSO");
        } finally {
            setCarregando(false);
        }
    }

    async function iniciarCamera() {
        setPedido(null);
        setMensagem("Aponte a câmera para o QR Code");
        setCameraAtiva(true);

        setTimeout(async () => {
            try {
                const leitor = new Html5Qrcode("leitor-portaria");
                leitorRef.current = leitor;

                await leitor.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 280, height: 280 },
                    },
                    async (texto) => {
                        if (texto) {
                            await buscarIngresso(texto);
                        }
                    },
                    () => { }
                );
            } catch (error) {
                console.error(error);
                setMensagem("NÃO FOI POSSÍVEL ACESSAR A CÂMERA");
                setCameraAtiva(false);
            }
        }, 300);
    }

    async function pararCamera() {
        try {
            if (leitorRef.current) {
                await leitorRef.current.stop();
                await leitorRef.current.clear();
                leitorRef.current = null;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCameraAtiva(false);
        }
    }

    async function confirmarEntrada() {
        if (!pedido) return;

        try {
            setCarregando(true);

            const agora = new Date().toISOString();

            await atualizarPedido(pedido.id, {
                statusOperacional: "utilizado",
                validadoEm: agora,
                utilizadoEm: agora,
            });

            setPedido({
                ...pedido,
                statusOperacional: "utilizado",
                validadoEm: agora,
                utilizadoEm: agora,
            } as Pedido & Record<string, unknown>);

            setMensagem("ENTRADA CONFIRMADA");
        } catch (error) {
            console.error(error);
            setMensagem("ERRO AO CONFIRMAR ENTRADA");
        } finally {
            setCarregando(false);
        }
    }

    const pedidoAny = pedido as
        | (Pedido & {
            utilizadoEm?: string;
            validadoEm?: string;
        })
        | null;

    const usadoEm = pedidoAny?.utilizadoEm || pedidoAny?.validadoEm || "";

    const valido =
        pedido &&
        pedido.statusPagamento === "pago" &&
        pedido.statusOperacional !== "utilizado" &&
        pedido.statusOperacional !== "bloqueado";

    const usado = pedido?.statusOperacional === "utilizado";

    const painelClass = valido
        ? "bg-green-600/95 border-green-400"
        : usado || pedido
            ? "bg-red-600/95 border-red-400"
            : "bg-slate-900/80 border-white/30";

    return (
        <main
            className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-5 text-white"
            style={{
                backgroundImage: "url('/fotos/fundo-geral.jpg')",
            }}
        >
            <div className="absolute inset-0 bg-black/45" />

            <div className="relative z-10 mx-auto max-w-md">
                <header className="mb-5 text-center">
                    <h1 className="text-3xl font-black drop-shadow-lg">Portaria</h1>
                    <p className="mt-1 text-sm text-white/90">Parque Mundo Novo</p>
                </header>

                <section
                    className={`rounded-3xl border-4 p-6 text-center shadow-2xl backdrop-blur-sm ${painelClass}`}
                >
                    <p className="text-6xl">
                        {valido ? "🟢" : usado || pedido ? "🔴" : "📷"}
                    </p>

                    <h2 className="mt-4 text-4xl font-black leading-tight drop-shadow-lg">
                        {mensagem}
                    </h2>

                    {usado && usadoEm && (
                        <div className="mt-4 rounded-2xl bg-white/20 p-4 text-center text-xl font-black">
                            Utilizado em:
                            <br />
                            {formatarDataHora(usadoEm)}
                        </div>
                    )}

                    {pedido && (
                        <div className="mt-6 rounded-2xl bg-white/15 p-4 text-left text-lg font-bold">
                            <p>Cliente: {pedido.nome}</p>
                            <p>Produto: {pedido.produto}</p>
                            <p>Qtd: {pedido.quantidade}</p>
                            <p>Código: {pedido.codigoIngresso}</p>
                            <p>
                                Pagamento:{" "}
                                {pedido.statusPagamento === "pago"
                                    ? "Confirmado"
                                    : pedido.statusPagamento}
                            </p>
                            <p>Status: {pedido.statusOperacional || "ativo"}</p>

                            {usado && usadoEm && <p>Entrada: {formatarDataHora(usadoEm)}</p>}
                        </div>
                    )}
                </section>

                <section className="mt-5 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-xl backdrop-blur-sm">
                    {!cameraAtiva ? (
                        <button
                            onClick={iniciarCamera}
                            disabled={carregando}
                            className="w-full rounded-2xl bg-green-700 px-5 py-6 text-2xl font-black text-white disabled:opacity-60"
                        >
                            📷 ESCANEAR QR CODE
                        </button>
                    ) : (
                        <button
                            onClick={pararCamera}
                            className="w-full rounded-2xl bg-red-600 px-5 py-5 text-xl font-black text-white"
                        >
                            FECHAR CÂMERA
                        </button>
                    )}

                    {cameraAtiva && (
                        <div className="mt-4 overflow-hidden rounded-2xl bg-black p-2">
                            <div id="leitor-portaria" className="w-full" />
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <input
                            type="text"
                            value={codigoManual}
                            onChange={(e) => setCodigoManual(e.target.value.toUpperCase())}
                            placeholder="Digite o código PMN"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-lg font-bold uppercase outline-none focus:border-green-700"
                        />

                        <button
                            onClick={() => {
                                if (!codigoManual.trim()) {
                                    setMensagem("DIGITE O CÓDIGO DO INGRESSO");
                                    return;
                                }

                                buscarIngresso(codigoManual.trim());
                            }}
                            disabled={carregando}
                            className="rounded-2xl bg-blue-600 px-5 py-4 font-black text-white disabled:opacity-60"
                        >
                            BUSCAR
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setPedido(null);
                            setCodigoManual("");
                            setMensagem("Aguardando leitura do ingresso");
                        }}
                        className="mt-4 w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold text-slate-700"
                    >
                        LIMPAR
                    </button>
                </section>

                {valido && (
                    <button
                        onClick={confirmarEntrada}
                        disabled={carregando}
                        className="mt-5 w-full rounded-3xl bg-green-500 px-5 py-6 text-2xl font-black text-white shadow-xl disabled:opacity-60"
                    >
                        CONFIRMAR ENTRADA
                    </button>
                )}

                {!valido && pedido && (
                    <button
                        disabled
                        className="mt-5 w-full rounded-3xl bg-red-700 px-5 py-6 text-2xl font-black text-white shadow-xl"
                    >
                        ENTRADA BLOQUEADA
                    </button>
                )}
            </div>
        </main>
    );
}