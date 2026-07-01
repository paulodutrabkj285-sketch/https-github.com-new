"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import QRCode from "qrcode";
import { db } from "@/lib/firebase";

const VALOR_ADULTO = 60;
const VALOR_IDOSO = 30;
const VALOR_ELEVADOR = 75;
const DESCONTO_AGENCIA = 0.05;

const imagensFundo = [
    "/fotos/fundo-geral.jpg",
    "/fotos/cachoeira-alta.png",
    "/fotos/cachoeira-lago.png",
];

export default function ReservaParceiroPage() {
    const [imagemAtual, setImagemAtual] = useState(0);

    const [dataVisita, setDataVisita] = useState("");
    const [horaPrevista, setHoraPrevista] = useState("");
    const [tipoVeiculo, setTipoVeiculo] = useState("Ônibus");
    const [adultos, setAdultos] = useState(0);
    const [idosos, setIdosos] = useState(0);
    const [temElevador, setTemElevador] = useState(false);
    const [qtdElevador, setQtdElevador] = useState(0);
    const [observacoes, setObservacoes] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [mensagem, setMensagem] = useState("");

    useEffect(() => {
        const intervalo = setInterval(() => {
            setImagemAtual((atual) => (atual + 1) % imagensFundo.length);
        }, 7000);

        return () => clearInterval(intervalo);
    }, []);

    const calculo = useMemo(() => {
        const valorAdultosBruto = adultos * VALOR_ADULTO;
        const descontoAdultos = valorAdultosBruto * DESCONTO_AGENCIA;
        const valorAdultosFinal = valorAdultosBruto - descontoAdultos;

        const valorIdososFinal = idosos * VALOR_IDOSO;

        const valorElevadorBruto = temElevador ? qtdElevador * VALOR_ELEVADOR : 0;
        const descontoElevador = valorElevadorBruto * DESCONTO_AGENCIA;
        const valorElevadorFinal = valorElevadorBruto - descontoElevador;

        const valorBruto =
            valorAdultosBruto + valorIdososFinal + valorElevadorBruto;

        const valorDesconto = descontoAdultos + descontoElevador;

        const valorFinal =
            valorAdultosFinal + valorIdososFinal + valorElevadorFinal;

        const totalVisitantes = adultos + idosos;

        return {
            valorAdultosBruto,
            descontoAdultos,
            valorAdultosFinal,
            valorIdososFinal,
            valorElevadorBruto,
            descontoElevador,
            valorElevadorFinal,
            valorBruto,
            valorDesconto,
            valorFinal,
            totalVisitantes,
        };
    }, [adultos, idosos, temElevador, qtdElevador]);

    function formatarMoeda(valor: number) {
        return valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }

    function gerarCodigoGrupo() {
        const ano = new Date().getFullYear();
        const numero = Math.floor(100000 + Math.random() * 900000);
        return `GRP-${ano}-${numero}`;
    }

    async function salvarReserva() {
        setMensagem("");

        if (!dataVisita) {
            setMensagem("Informe a data da visita.");
            return;
        }

        if (adultos <= 0 && idosos <= 0) {
            setMensagem("Informe pelo menos 1 visitante.");
            return;
        }

        if (temElevador && qtdElevador <= 0) {
            setMensagem("Informe a quantidade de elevadores.");
            return;
        }

        try {
            setCarregando(true);

            const codigoGrupo = gerarCodigoGrupo();

            const qrCodeGrupo = await QRCode.toDataURL(
                JSON.stringify({
                    tipo: "reserva_agencia",
                    codigoGrupo,
                })
            );

            await addDoc(collection(db, "reservas_agencias"), {
                agenciaId: null,
                agenciaNome: "Agência não logada",

                dataVisita,
                horaPrevista,
                tipoVeiculo,

                adultos,
                idosos,

                elevador: temElevador,
                qtdElevador: temElevador ? qtdElevador : 0,

                observacoes,

                valorAdultosBruto: calculo.valorAdultosBruto,
                descontoAdultos: calculo.descontoAdultos,
                valorAdultosFinal: calculo.valorAdultosFinal,

                valorIdososFinal: calculo.valorIdososFinal,

                valorElevadorBruto: calculo.valorElevadorBruto,
                descontoElevador: calculo.descontoElevador,
                valorElevadorFinal: calculo.valorElevadorFinal,

                valorBruto: calculo.valorBruto,
                valorDesconto: calculo.valorDesconto,
                valorFinal: calculo.valorFinal,

                totalVisitantes: calculo.totalVisitantes,

                descontoAplicado: 5,
                categoriaParceiro: "Bronze",

                codigoGrupo,
                qrCodeGrupo,

                statusPagamento: "a_pagar_na_chegada",
                formaPagamento: "pendente",
                pagamentoNaChegada: true,
                statusOperacional: "reservado",

                origem: "parceiros",
                tipoReserva: "agencia_guia",

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setMensagem(
                `Reserva criada com sucesso! Código do grupo: ${codigoGrupo}. O pagamento será realizado na chegada ao parque.`
            );

            setDataVisita("");
            setHoraPrevista("");
            setTipoVeiculo("Ônibus");
            setAdultos(0);
            setIdosos(0);
            setTemElevador(false);
            setQtdElevador(0);
            setObservacoes("");
        } catch (error) {
            console.error("Erro ao criar reserva:", error);
            setMensagem("Erro ao criar reserva. Tente novamente.");
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="relative min-h-screen overflow-hidden text-white">
            {imagensFundo.map((imagem, index) => (
                <div
                    key={imagem}
                    className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-1000 ${index === imagemAtual ? "opacity-100" : "opacity-0"
                        }`}
                    style={{
                        backgroundImage: `url('${imagem}')`,
                    }}
                />
            ))}

            <div className="absolute inset-0 bg-black/65" />

            <div className="relative z-10 px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 p-6 shadow-xl">
                        <p className="text-sm text-emerald-300 font-semibold">
                            Parque Mundo Novo
                        </p>

                        <h1 className="text-3xl font-bold mt-2">
                            Reserva para Agências e Guias
                        </h1>

                        <p className="text-slate-100 mt-2">
                            Área exclusiva para reservas de excursões, grupos turísticos,
                            agências e guias cadastrados.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <section className="lg:col-span-2 bg-white/95 text-slate-900 rounded-2xl p-6 shadow-xl backdrop-blur">
                            <h2 className="text-xl font-bold mb-4">Dados da visita</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="font-medium">Data da visita</span>
                                    <input
                                        type="date"
                                        value={dataVisita}
                                        onChange={(e) => setDataVisita(e.target.value)}
                                        className="mt-1 w-full rounded-lg border px-3 py-2"
                                    />
                                </label>

                                <label className="block">
                                    <span className="font-medium">Chegada prevista</span>
                                    <input
                                        type="time"
                                        value={horaPrevista}
                                        onChange={(e) => setHoraPrevista(e.target.value)}
                                        className="mt-1 w-full rounded-lg border px-3 py-2"
                                    />
                                </label>

                                <label className="block">
                                    <span className="font-medium">Tipo de veículo</span>
                                    <select
                                        value={tipoVeiculo}
                                        onChange={(e) => setTipoVeiculo(e.target.value)}
                                        className="mt-1 w-full rounded-lg border px-3 py-2"
                                    >
                                        <option>Van</option>
                                        <option>Micro-ônibus</option>
                                        <option>Ônibus</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="font-medium">Adultos</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={adultos}
                                        onChange={(e) => setAdultos(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border px-3 py-2"
                                    />
                                </label>

                                <label className="block">
                                    <span className="font-medium">Idosos / meia entrada</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={idosos}
                                        onChange={(e) => setIdosos(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border px-3 py-2"
                                    />
                                </label>

                                <div className="block">
                                    <span className="font-medium">Elevador Panorâmico</span>

                                    <div className="mt-2 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTemElevador(false);
                                                setQtdElevador(0);
                                            }}
                                            className={`px-4 py-2 rounded-lg border transition ${!temElevador
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-white text-slate-900"
                                                }`}
                                        >
                                            Não
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTemElevador(true)}
                                            className={`px-4 py-2 rounded-lg border transition ${temElevador
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-white text-slate-900"
                                                }`}
                                        >
                                            Sim
                                        </button>
                                    </div>
                                </div>

                                {temElevador && (
                                    <label className="block">
                                        <span className="font-medium">Quantidade Elevador</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={qtdElevador}
                                            onChange={(e) => setQtdElevador(Number(e.target.value))}
                                            className="mt-1 w-full rounded-lg border px-3 py-2"
                                        />
                                    </label>
                                )}
                            </div>

                            <label className="block mt-4">
                                <span className="font-medium">Observações</span>
                                <textarea
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                    placeholder="Ex: chegada prevista 09:30, grupo escolar, ônibus XYZ..."
                                    className="mt-1 w-full rounded-lg border px-3 py-2 min-h-28"
                                />
                            </label>

                            {mensagem && (
                                <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 font-medium">
                                    {mensagem}
                                </div>
                            )}

                            <button
                                onClick={salvarReserva}
                                disabled={carregando}
                                className="mt-6 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold py-3 transition"
                            >
                                {carregando ? "Criando reserva..." : "Criar reserva da agência"}
                            </button>
                        </section>

                        <aside className="bg-white/95 text-slate-900 rounded-2xl p-6 shadow-xl h-fit backdrop-blur">
                            <h2 className="text-xl font-bold mb-4">Resumo da reserva</h2>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span>Adultos</span>
                                    <strong>{adultos}</strong>
                                </div>

                                <div className="flex justify-between">
                                    <span>Idosos</span>
                                    <strong>{idosos}</strong>
                                </div>

                                <div className="flex justify-between">
                                    <span>Total visitantes</span>
                                    <strong>{calculo.totalVisitantes}</strong>
                                </div>

                                <hr />

                                <div className="flex justify-between">
                                    <span>Adultos bruto</span>
                                    <strong>{formatarMoeda(calculo.valorAdultosBruto)}</strong>
                                </div>

                                <div className="flex justify-between text-emerald-700">
                                    <span>Desconto adultos 5%</span>
                                    <strong>- {formatarMoeda(calculo.descontoAdultos)}</strong>
                                </div>

                                <div className="flex justify-between">
                                    <span>Idosos</span>
                                    <strong>{formatarMoeda(calculo.valorIdososFinal)}</strong>
                                </div>

                                <p className="text-xs text-slate-500">
                                    Meia entrada não recebe desconto adicional.
                                </p>

                                {temElevador && (
                                    <>
                                        <div className="flex justify-between">
                                            <span>Elevador bruto</span>
                                            <strong>{formatarMoeda(calculo.valorElevadorBruto)}</strong>
                                        </div>

                                        <div className="flex justify-between text-emerald-700">
                                            <span>Desconto elevador 5%</span>
                                            <strong>- {formatarMoeda(calculo.descontoElevador)}</strong>
                                        </div>
                                    </>
                                )}

                                <hr />

                                <div className="flex justify-between">
                                    <span>Valor bruto</span>
                                    <strong>{formatarMoeda(calculo.valorBruto)}</strong>
                                </div>

                                <div className="flex justify-between text-emerald-700">
                                    <span>Desconto total</span>
                                    <strong>- {formatarMoeda(calculo.valorDesconto)}</strong>
                                </div>

                                <div className="flex justify-between text-lg">
                                    <span className="font-bold">Valor final</span>
                                    <strong>{formatarMoeda(calculo.valorFinal)}</strong>
                                </div>
                            </div>

                            <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-800">
                                <p>
                                    Camping não aparece neste fluxo, pois será vendido somente
                                    para cliente final.
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </main>
    );
}