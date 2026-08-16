"use client";

import {
    criarAgencia,
    validarCnpj,
} from "@/lib/agencias";

import {
    useState,
} from "react";

export default function CadastroParceiroPage() {
    const [
        carregando,
        setCarregando,
    ] = useState(false);

    const [
        sucesso,
        setSucesso,
    ] = useState(false);

    const [
        erro,
        setErro,
    ] = useState("");

    const [
        form,
        setForm,
    ] = useState({
        nomeEmpresa: "",
        responsavel: "",
        documento: "",

        tipoParceiro:
            "agencia",

        telefone: "",
        whatsapp: "",
        email: "",
        cidade: "",
        estado: "",
        observacoes: "",
    });

    /* ======================================
       ALTERAR CAMPO
    ====================================== */

    function alterarCampo(
        e:
            React.ChangeEvent<
                HTMLInputElement |
                HTMLTextAreaElement |
                HTMLSelectElement
            >
    ) {
        const {
            name,
            value,
        } =
            e.target;

        setForm(
            (
                atual
            ) => ({
                ...atual,

                [name]:
                    value,
            })
        );
    }

    /* ======================================
       CNPJ
    ====================================== */

    function somenteDigitos(
        valor: string
    ) {
        return valor.replace(
            /\D/g,
            ""
        );
    }

    function formatarCnpj(
        valor: string
    ) {
        const numeros =
            somenteDigitos(
                valor
            )
                .slice(
                    0,
                    14
                );

        return numeros
            .replace(
                /^(\d{2})(\d)/,
                "$1.$2"
            )
            .replace(
                /^(\d{2})\.(\d{3})(\d)/,
                "$1.$2.$3"
            )
            .replace(
                /\.(\d{3})(\d)/,
                ".$1/$2"
            )
            .replace(
                /(\d{4})(\d)/,
                "$1-$2"
            );
    }

    function alterarCnpj(
        e:
            React.ChangeEvent<HTMLInputElement>
    ) {
        setForm(
            (
                atual
            ) => ({
                ...atual,

                documento:
                    formatarCnpj(
                        e.target
                            .value
                    ),
            })
        );
    }

    /* ======================================
       VALIDAÇÃO
    ====================================== */

    function validarFormulario() {
        if (
            !form.nomeEmpresa.trim()
        ) {
            return "Informe o nome da empresa.";
        }

        if (
            !form.responsavel.trim()
        ) {
            return "Informe o responsável.";
        }

        if (
            !validarCnpj(
                form.documento
            )
        ) {
            return "Informe um CNPJ válido com 14 dígitos.";
        }

        if (
            !form.telefone.trim()
        ) {
            return "Informe o telefone.";
        }

        if (
            !form.whatsapp.trim()
        ) {
            return "Informe o WhatsApp.";
        }

        if (
            !form.email.trim()
        ) {
            return "Informe o e-mail.";
        }

        if (
            !form.cidade.trim()
        ) {
            return "Informe a cidade.";
        }

        if (
            !form.estado.trim()
        ) {
            return "Informe o estado.";
        }

        return "";
    }

    /* ======================================
       ENVIAR CADASTRO
    ====================================== */

    async function enviarCadastro(
        e:
            React.FormEvent
    ) {
        e.preventDefault();

        setErro("");
        setSucesso(false);

        const erroValidacao =
            validarFormulario();

        if (
            erroValidacao
        ) {
            setErro(
                erroValidacao
            );

            return;
        }

        try {
            setCarregando(
                true
            );

            await criarAgencia({
                nomeEmpresa:
                    form.nomeEmpresa
                        .trim(),

                responsavel:
                    form.responsavel
                        .trim(),

                documento:
                    form.documento,

                /*
                 * Será preenchido/verificado
                 * pelo Admin posteriormente.
                 */
                cadastur:
                    "",

                tipoParceiro:
                    form.tipoParceiro as
                    | "agencia"
                    | "guia"
                    | "transportadora"
                    | "operadora",

                telefone:
                    form.telefone
                        .trim(),

                whatsapp:
                    form.whatsapp
                        .trim(),

                email:
                    form.email
                        .trim(),

                cidade:
                    form.cidade
                        .trim(),

                estado:
                    form.estado
                        .trim()
                        .toUpperCase(),

                observacoes:
                    form.observacoes
                        .trim(),
            });

            setSucesso(
                true
            );

            setForm({
                nomeEmpresa:
                    "",

                responsavel:
                    "",

                documento:
                    "",

                tipoParceiro:
                    "agencia",

                telefone:
                    "",

                whatsapp:
                    "",

                email:
                    "",

                cidade:
                    "",

                estado:
                    "",

                observacoes:
                    "",
            });
        } catch (
        error: any
        ) {
            console.error(
                error
            );

            setErro(
                error?.message ||
                "Não foi possível enviar o cadastro. Tente novamente."
            );
        } finally {
            setCarregando(
                false
            );
        }
    }

    /* ======================================
       TELA
    ====================================== */

    return (
        <main
            className="relative min-h-screen bg-cover bg-center px-4 py-10 text-white"
            style={{
                backgroundImage:
                    "url('/fotos/fundo-geral.jpg')",
            }}
        >
            <div className="absolute inset-0 bg-black/65" />

            <div className="relative z-10 mx-auto max-w-4xl">
                <section className="rounded-3xl border border-white/20 bg-emerald-950/90 p-6 shadow-2xl backdrop-blur-sm md:p-10">

                    {/* CABEÇALHO */}

                    <div className="text-center">
                        <img
                            src="/logo-final.png"
                            alt="Parque Mundo Novo"
                            className="mx-auto h-28 w-28 rounded-3xl bg-white/10 object-contain p-3 shadow-xl"
                        />

                        <h1 className="mt-5 text-3xl font-black md:text-5xl">
                            Agências e Parceiros
                        </h1>

                        <p className="mt-3 text-lg text-white/90">
                            Cadastro para acesso
                            às condições comerciais
                            do Parque Mundo Novo.
                        </p>
                    </div>

                    {/* AVISO PRINCIPAL */}

                    <div className="mt-7 rounded-3xl border-2 border-yellow-300 bg-yellow-100 p-5 text-yellow-950 shadow-lg">
                        <p className="text-lg font-black">
                            ⚠️ IMPORTANTE
                        </p>

                        <p className="mt-2 font-bold">
                            O preenchimento deste cadastro
                            não libera automaticamente
                            descontos ou compras antecipadas.
                        </p>

                        <p className="mt-3">
                            Após o envio, os dados da empresa
                            serão analisados pela equipe do
                            Parque Mundo Novo.
                        </p>

                        <p className="mt-3">
                            O CNPJ e a regularidade do parceiro
                            no setor de turismo serão conferidos
                            antes da aprovação.
                        </p>

                        <p className="mt-3 font-black">
                            Somente após a aprovação será
                            liberado o acesso às compras e
                            reservas com desconto.
                        </p>
                    </div>

                    {/* POLÍTICA COMERCIAL */}

                    <div className="mt-5 rounded-2xl bg-white/10 p-5 text-sm text-white/95">
                        <p className="font-black">
                            Condições após aprovação:
                        </p>

                        <p className="mt-3">
                            👥 Grupos de até 20 pessoas:
                            <strong>
                                {" "}
                                5% de desconto
                            </strong>
                        </p>

                        <p className="mt-2">
                            👥 Grupos acima de 20 pessoas:
                            <strong>
                                {" "}
                                10% de desconto
                            </strong>
                        </p>

                        <p className="mt-2">
                            👴 Meia entrada não recebe desconto adicional.
                        </p>

                        <p className="mt-2">
                            🏕️ Camping não participa da política
                            de desconto para parceiros.
                        </p>
                    </div>

                    {/* SUCESSO */}

                    {sucesso && (
                        <div className="mt-7 rounded-3xl border-2 border-green-300 bg-green-100 p-6 text-center text-green-900 shadow-xl">
                            <p className="text-2xl font-black">
                                ✅ Cadastro enviado com sucesso!
                            </p>

                            <p className="mt-3 text-lg font-bold">
                                Seu cadastro está aguardando
                                análise do Parque Mundo Novo.
                            </p>

                            <p className="mt-3">
                                Após a conferência e aprovação,
                                será liberado o acesso às compras
                                antecipadas e reservas com as
                                condições especiais para parceiros.
                            </p>

                            <p className="mt-3 font-semibold">
                                A equipe do Parque poderá entrar
                                em contato pelos dados informados
                                no cadastro.
                            </p>
                        </div>
                    )}

                    {/* ERRO */}

                    {erro && (
                        <div className="mt-6 rounded-2xl bg-red-100 p-4 text-center font-bold text-red-800">
                            {erro}
                        </div>
                    )}

                    {/* FORM */}

                    <form
                        onSubmit={
                            enviarCadastro
                        }
                        className="mt-8 grid gap-5"
                    >
                        <div className="grid gap-5 md:grid-cols-2">

                            <Campo
                                label="Nome da empresa"
                                name="nomeEmpresa"
                                value={
                                    form.nomeEmpresa
                                }
                                onChange={
                                    alterarCampo
                                }
                                placeholder="Ex: Serra Turismo"
                            />

                            <Campo
                                label="Responsável"
                                name="responsavel"
                                value={
                                    form.responsavel
                                }
                                onChange={
                                    alterarCampo
                                }
                                placeholder="Nome do responsável"
                            />

                            {/* CNPJ */}

                            <div>
                                <label className="mb-2 block text-sm font-bold">
                                    CNPJ
                                </label>

                                <input
                                    type="text"
                                    name="documento"
                                    value={
                                        form.documento
                                    }
                                    onChange={
                                        alterarCnpj
                                    }
                                    placeholder="00.000.000/0000-00"
                                    inputMode="numeric"
                                    className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
                                />

                                <p className="mt-2 text-xs text-white/70">
                                    O CNPJ será verificado
                                    antes da aprovação do cadastro.
                                </p>
                            </div>

                            {/* TIPO */}

                            <div>
                                <label className="mb-2 block text-sm font-bold">
                                    Tipo de parceiro
                                </label>

                                <select
                                    name="tipoParceiro"
                                    value={
                                        form.tipoParceiro
                                    }
                                    onChange={
                                        alterarCampo
                                    }
                                    className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
                                >
                                    <option value="agencia">
                                        Agência de turismo
                                    </option>

                                    <option value="guia">
                                        Guia de turismo
                                    </option>

                                    <option value="operadora">
                                        Operadora de turismo
                                    </option>

                                    <option value="transportadora">
                                        Transportadora turística
                                    </option>
                                </select>
                            </div>

                            <Campo
                                label="Telefone"
                                name="telefone"
                                value={
                                    form.telefone
                                }
                                onChange={
                                    alterarCampo
                                }
                                placeholder="Telefone comercial"
                            />

                            <Campo
                                label="WhatsApp"
                                name="whatsapp"
                                value={
                                    form.whatsapp
                                }
                                onChange={
                                    alterarCampo
                                }
                                placeholder="WhatsApp para contato"
                            />

                            <Campo
                                label="E-mail"
                                name="email"
                                type="email"
                                value={
                                    form.email
                                }
                                onChange={
                                    alterarCampo
                                }
                                placeholder="email@empresa.com.br"
                            />

                            <Campo
                                label="Cidade"
                                name="cidade"
                                value={
                                    form.cidade
                                }
                                onChange={
                                    alterarCampo
                                }
                                placeholder="Cidade"
                            />

                            <Campo
                                label="Estado"
                                name="estado"
                                value={
                                    form.estado
                                }
                                onChange={
                                    alterarCampo
                                }
                                placeholder="SC"
                            />
                        </div>

                        {/* OBSERVAÇÕES */}

                        <div>
                            <label className="mb-2 block text-sm font-bold">
                                Observações
                            </label>

                            <textarea
                                name="observacoes"
                                value={
                                    form.observacoes
                                }
                                onChange={
                                    alterarCampo
                                }
                                rows={4}
                                placeholder="Informe detalhes sobre excursões, vans, ônibus ou volume médio de visitantes."
                                className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
                            />
                        </div>

                        {/* DECLARAÇÃO */}

                        <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/90">
                            <p>
                                Ao enviar o cadastro,
                                o parceiro declara que
                                as informações fornecidas
                                são verdadeiras.
                            </p>

                            <p className="mt-2">
                                O Parque Mundo Novo realizará
                                a análise das informações
                                antes de liberar qualquer
                                benefício comercial.
                            </p>

                            <p className="mt-2">
                                Cadastros inconsistentes,
                                irregulares ou utilizados
                                indevidamente poderão ser
                                recusados ou bloqueados.
                            </p>
                        </div>

                        {/* BOTÃO */}

                        <button
                            type="submit"
                            disabled={
                                carregando
                            }
                            className="rounded-2xl bg-green-600 px-6 py-5 text-xl font-black text-white shadow-xl transition hover:bg-green-500 disabled:opacity-60"
                        >
                            {carregando
                                ? "Enviando cadastro..."
                                : "Enviar cadastro para análise"}
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}

/* ======================================
   CAMPO
====================================== */

function Campo({
    label,
    name,
    value,
    onChange,
    placeholder,
    type =
    "text",
}: {
    label:
    string;

    name:
    string;

    value:
    string;

    onChange:
    (
        e:
            React.ChangeEvent<HTMLInputElement>
    ) => void;

    placeholder?:
    string;

    type?:
    string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold">
                {label}
            </label>

            <input
                type={
                    type
                }
                name={
                    name
                }
                value={
                    value
                }
                onChange={
                    onChange
                }
                placeholder={
                    placeholder
                }
                className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
            />
        </div>
    );
}