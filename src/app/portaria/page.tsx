"use client";

import { atualizarPedido, listarPedidos, Pedido } from "@/lib/pedidos";
import { Html5Qrcode } from "html5-qrcode";
import { useRef, useState } from "react";

export default function PortariaPage() {
    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [mensagem, setMensagem] = useState("Aguardando leitura do ingresso");
    const [carregando, setCarregando] = useState(false);
    const [cameraAtiva, setCameraAtiva] = useState(false);

    const leitorRef = useRef<Html5Qrcode | null>(null);

    function limpar(valor: string) {
        return String(valor || "").trim();
    }

    function extrairQr(texto: string) {
        const valor = limpar(texto);

        try {
            const dados = JSON.parse(valor);
            return {
                codigo: limpar(dados?.codigo || ""),
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

            await atualizarPedido(pedido.id, {
                statusOperacional: "utilizado",
                validadoEm: new Date().toISOString(),
            });

            setPedido({
                ...pedido,
                statusOperacional: "utilizado",
            });

            setMensagem("ENTRADA CONFIRMADA");
        } catch (error) {
            console.error(error);
            setMensagem("ERRO AO CONFIRMAR ENTRADA");
        } finally {
            setCarregando(false);
        }
    }

    const valido =
        pedido &&
        pedido.statusPagamento === "pago" &&
        pedido.statusOperacional !== "utilizado" &&
        pedido.statusOperacional !== "bloqueado";

    const usado = pedido?.statusOperacional === "utilizado";

    const painelClass = valido
        ? "bg-green-600 border-green-400"
        : usado || pedido
            ? "bg-red-600 border-red-400"
            : "bg-slate-800 border-slate-600";

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
            <div className="mx-auto max-w-md">
                <header className="mb-5 text-center">
                    <h1 className="text-3xl font-black">Portaria</h1>
                    <p className="mt-1 text-sm text-white/70">Parque Mundo Novo</p>
                </header>

                <section
                    className={`rounded-3xl border-4 p-6 text-center shadow-2xl ${painelClass}`}
                >
                    <p className="text-6xl">
                        {valido ? "🟢" : usado || pedido ? "🔴" : "📷"}
                    </p>

                    <h2 className="mt-4 text-4xl font-black leading-tight">
                        {mensagem}
                    </h2>

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
                        </div>
                    )}
                </section>

                <section className="mt-5 rounded-3xl bg-white p-4 text-slate-900 shadow-xl">
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

                    <button
                        onClick={() => {
                            setPedido(null);
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