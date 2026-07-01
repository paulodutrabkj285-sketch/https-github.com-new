"use client";

import { criarAgencia } from "@/lib/agencias";
import Link from "next/link";
import { useState } from "react";

export default function CadastroParceiroPage() {
    const [carregando, setCarregando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState("");
    const [agenciaId, setAgenciaId] = useState("");

    const [form, setForm] = useState({
        nomeEmpresa: "",
        responsavel: "",
        documento: "",
        cadastur: "",
        tipoParceiro: "agencia",
        telefone: "",
        whatsapp: "",
        email: "",
        cidade: "",
        estado: "",
        observacoes: "",
    });

    function alterarCampo(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;

        setForm((atual) => ({
            ...atual,
            [name]: value,
        }));
    }

    function validarFormulario() {
        if (!form.nomeEmpresa.trim()) return "Informe o nome da empresa ou guia.";
        if (!form.responsavel.trim()) return "Informe o responsável.";
        if (!form.documento.trim()) return "Informe o CPF ou CNPJ.";
        if (!form.cadastur.trim()) return "Informe o número do Cadastur.";
        if (!form.telefone.trim()) return "Informe o telefone.";
        if (!form.whatsapp.trim()) return "Informe o WhatsApp.";
        if (!form.email.trim()) return "Informe o e-mail.";
        if (!form.cidade.trim()) return "Informe a cidade.";
        if (!form.estado.trim()) return "Informe o estado.";

        return "";
    }

    async function enviarCadastro(e: React.FormEvent) {
        e.preventDefault();

        setErro("");
        setSucesso(false);
        setAgenciaId("");

        const erroValidacao = validarFormulario();

        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }

        try {
            setCarregando(true);

            const resultado = await criarAgencia({
                nomeEmpresa: form.nomeEmpresa.trim(),
                responsavel: form.responsavel.trim(),
                documento: form.documento.trim(),
                cadastur: form.cadastur.trim(),
                tipoParceiro: form.tipoParceiro as
                    | "agencia"
                    | "guia"
                    | "transportadora"
                    | "operadora",
                telefone: form.telefone.trim(),
                whatsapp: form.whatsapp.trim(),
                email: form.email.trim(),
                cidade: form.cidade.trim(),
                estado: form.estado.trim().toUpperCase(),
                observacoes: form.observacoes.trim(),
            });

            const idCriado = const idCriado = resultado || "";

            setAgenciaId(idCriado);
            setSucesso(true);

            setForm({
                nomeEmpresa: "",
                responsavel: "",
                documento: "",
                cadastur: "",
                tipoParceiro: "agencia",
                telefone: "",
                whatsapp: "",
                email: "",
                cidade: "",
                estado: "",
                observacoes: "",
            });
        } catch (error) {
            console.error(error);
            setErro("Não foi possível enviar o cadastro. Tente novamente.");
        } finally {
            setCarregando(false);
        }
    }

    const linkReserva = agenciaId
        ? `/parceiros/reservas?agenciaId=${agenciaId}`
        : "/parceiros/reservas";

    return (
        <main
            className="relative min-h-screen bg-cover bg-center px-4 py-10 text-white"
            style={{
                backgroundImage: "url('/fotos/fundo-geral.jpg')",
            }}
        >
            <div className="absolute inset-0 bg-black/65" />

            <div className="relative z-10 mx-auto max-w-4xl">
                <section className="rounded-3xl border border-white/20 bg-emerald-950/85 p-6 shadow-2xl backdrop-blur-sm md:p-10">
                    <div className="text-center">
                        <img
                            src="/logo-final.png"
                            alt="Parque Mundo Novo"
                            className="mx-auto h-28 w-28 rounded-3xl bg-white/10 object-contain p-3 shadow-xl"
                        />

                        <h1 className="mt-5 text-3xl font-black md:text-5xl">
                            Cadastro de Parceiro
                        </h1>

                        <p className="mt-3 text-lg text-white/90">
                            Agências, guias, operadoras e transportadoras turísticas.
                        </p>

                        <div className="mt-5 rounded-2xl bg-yellow-100 p-4 text-left text-sm font-semibold text-yellow-900">
                            <p>
                                ⚠️ O desconto de parceiro será aplicado apenas ao ingresso
                                adulto do parque e ao elevador panorâmico.
                            </p>
                            <p className="mt-2">
                                👴 Meia entrada não recebe desconto adicional, pois já é um
                                benefício legal.
                            </p>
                            <p className="mt-2">
                                🏕️ Camping não participa da política de desconto para agências
                                e guias.
                            </p>
                        </div>
                    </div>

                    {sucesso && (
                        <div className="mt-6 rounded-2xl bg-green-100 p-5 text-center font-bold text-green-800">
                            <p>Cadastro enviado com sucesso.</p>
                            <p className="mt-1">
                                Agora o parceiro já pode fazer a reserva da excursão.
                            </p>

                            <Link
                                href={linkReserva}
                                className="mt-5 inline-block rounded-2xl bg-green-700 px-6 py-4 text-lg font-black text-white shadow-xl transition hover:bg-green-600"
                            >
                                Fazer reserva agora
                            </Link>
                        </div>
                    )}

                    {erro && (
                        <div className="mt-6 rounded-2xl bg-red-100 p-4 text-center font-bold text-red-800">
                            {erro}
                        </div>
                    )}

                    <form onSubmit={enviarCadastro} className="mt-8 grid gap-5">
                        <div className="grid gap-5 md:grid-cols-2">
                            <Campo
                                label="Nome da empresa / guia"
                                name="nomeEmpresa"
                                value={form.nomeEmpresa}
                                onChange={alterarCampo}
                                placeholder="Ex: Serra Turismo"
                            />

                            <Campo
                                label="Responsável"
                                name="responsavel"
                                value={form.responsavel}
                                onChange={alterarCampo}
                                placeholder="Nome do responsável"
                            />

                            <Campo
                                label="CPF ou CNPJ"
                                name="documento"
                                value={form.documento}
                                onChange={alterarCampo}
                                placeholder="Digite CPF ou CNPJ"
                            />

                            <Campo
                                label="Número Cadastur"
                                name="cadastur"
                                value={form.cadastur}
                                onChange={alterarCampo}
                                placeholder="Cadastro oficial do turismo"
                            />

                            <div>
                                <label className="mb-2 block text-sm font-bold">
                                    Tipo de parceiro
                                </label>

                                <select
                                    name="tipoParceiro"
                                    value={form.tipoParceiro}
                                    onChange={alterarCampo}
                                    className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
                                >
                                    <option value="agencia">Agência de turismo</option>
                                    <option value="guia">Guia de turismo</option>
                                    <option value="transportadora">Transportadora turística</option>
                                    <option value="operadora">Operadora de turismo</option>
                                </select>
                            </div>

                            <Campo
                                label="Telefone"
                                name="telefone"
                                value={form.telefone}
                                onChange={alterarCampo}
                                placeholder="Telefone comercial"
                            />

                            <Campo
                                label="WhatsApp"
                                name="whatsapp"
                                value={form.whatsapp}
                                onChange={alterarCampo}
                                placeholder="WhatsApp para contato"
                            />

                            <Campo
                                label="E-mail"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={alterarCampo}
                                placeholder="email@empresa.com.br"
                            />

                            <Campo
                                label="Cidade"
                                name="cidade"
                                value={form.cidade}
                                onChange={alterarCampo}
                                placeholder="Cidade"
                            />

                            <Campo
                                label="Estado"
                                name="estado"
                                value={form.estado}
                                onChange={alterarCampo}
                                placeholder="SC"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold">Observações</label>

                            <textarea
                                name="observacoes"
                                value={form.observacoes}
                                onChange={alterarCampo}
                                rows={4}
                                placeholder="Informe detalhes sobre excursões, vans, ônibus ou volume médio de visitantes."
                                className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
                            />
                        </div>

                        <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/90">
                            <p>
                                Ao enviar o cadastro, o parceiro declara que as informações
                                fornecidas são verdadeiras e que possui cadastro Cadastur válido.
                            </p>
                            <p className="mt-2">
                                O Parque Mundo Novo poderá bloquear cadastros inconsistentes ou
                                uso indevido dos descontos.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={carregando}
                            className="rounded-2xl bg-green-600 px-6 py-5 text-xl font-black text-white shadow-xl transition hover:bg-green-500 disabled:opacity-60"
                        >
                            {carregando ? "Enviando cadastro..." : "Enviar cadastro"}
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}

function Campo({
    label,
    name,
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold">{label}</label>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
            />
        </div>
    );
}