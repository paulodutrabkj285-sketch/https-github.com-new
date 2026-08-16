"use client";

import {
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import { useRouter } from "next/navigation";

import {
    useState,
} from "react";

export default function AcessoParceiroPage() {
    const router =
        useRouter();

    const [
        documento,
        setDocumento,
    ] =
        useState("");

    const [
        email,
        setEmail,
    ] =
        useState("");

    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        mensagem,
        setMensagem,
    ] =
        useState("");

    const [
        tipoMensagem,
        setTipoMensagem,
    ] =
        useState<
            "erro" |
            "sucesso" |
            ""
        >("");

    /* ==========================================
       FUNÇÕES
    ========================================== */

    function somenteDigitos(
        valor: string
    ) {
        return valor.replace(
            /\D/g,
            ""
        );
    }

    function formatarDocumento(
        valor: string
    ) {
        const numeros =
            somenteDigitos(
                valor
            );

        if (
            numeros.length <= 11
        ) {
            return numeros
                .replace(
                    /(\d{3})(\d)/,
                    "$1.$2"
                )
                .replace(
                    /(\d{3})(\d)/,
                    "$1.$2"
                )
                .replace(
                    /(\d{3})(\d{1,2})$/,
                    "$1-$2"
                );
        }

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

    /* ==========================================
       ENTRAR
    ========================================== */

    async function entrar() {
        setMensagem("");
        setTipoMensagem("");

        const documentoLimpo =
            somenteDigitos(
                documento
            );

        const emailLimpo =
            email
                .trim()
                .toLowerCase();

        if (
            !documentoLimpo
        ) {
            setTipoMensagem(
                "erro"
            );

            setMensagem(
                "Informe o CNPJ ou CPF cadastrado."
            );

            return;
        }

        if (
            !emailLimpo
        ) {
            setTipoMensagem(
                "erro"
            );

            setMensagem(
                "Informe o e-mail cadastrado."
            );

            return;
        }

        try {
            setCarregando(
                true
            );

            /*
             * Primeiro procuramos pelo documento.
             *
             * No Firestore o documento é salvo
             * somente com números.
             */
            const consulta =
                query(
                    collection(
                        db,
                        "agencias"
                    ),

                    where(
                        "documento",
                        "==",
                        documentoLimpo
                    )
                );

            const snap =
                await getDocs(
                    consulta
                );

            if (
                snap.empty
            ) {
                setTipoMensagem(
                    "erro"
                );

                setMensagem(
                    "Não encontramos um parceiro cadastrado com esse CNPJ/CPF."
                );

                return;
            }

            /*
             * Pode existir cadastro antigo duplicado.
             *
             * Por segurança procuramos especificamente
             * um cadastro ATIVO e com o mesmo e-mail.
             */
            const parceiro =
                snap.docs.find(
                    (item) => {
                        const dados =
                            item.data();

                        const emailBanco =
                            String(
                                dados.email ||
                                ""
                            )
                                .trim()
                                .toLowerCase();

                        return (
                            dados.status ===
                            "ativa" &&
                            emailBanco ===
                            emailLimpo
                        );
                    }
                );

            if (
                !parceiro
            ) {
                /*
                 * Verifica se existe parceiro ativo
                 * com o documento, mas e-mail diferente.
                 */
                const ativo =
                    snap.docs.find(
                        (item) =>
                            item.data()
                                .status ===
                            "ativa"
                    );

                if (ativo) {
                    setTipoMensagem(
                        "erro"
                    );

                    setMensagem(
                        "O e-mail informado não corresponde ao cadastro aprovado."
                    );

                    return;
                }

                /*
                 * Verifica se está aguardando aprovação.
                 */
                const pendente =
                    snap.docs.find(
                        (item) =>
                            item.data()
                                .status ===
                            "pendente"
                    );

                if (
                    pendente
                ) {
                    setTipoMensagem(
                        "erro"
                    );

                    setMensagem(
                        "Seu cadastro ainda está aguardando aprovação do Parque Mundo Novo."
                    );

                    return;
                }

                /*
                 * Verifica se foi bloqueado.
                 */
                const bloqueado =
                    snap.docs.find(
                        (item) =>
                            item.data()
                                .status ===
                            "bloqueada"
                    );

                if (
                    bloqueado
                ) {
                    setTipoMensagem(
                        "erro"
                    );

                    setMensagem(
                        "Este cadastro está bloqueado. Entre em contato com o Parque Mundo Novo."
                    );

                    return;
                }

                /*
                 * Verifica reprovação.
                 */
                const reprovado =
                    snap.docs.find(
                        (item) =>
                            item.data()
                                .status ===
                            "reprovada"
                    );

                if (
                    reprovado
                ) {
                    setTipoMensagem(
                        "erro"
                    );

                    setMensagem(
                        "Este cadastro não está aprovado para acesso à área de parceiros."
                    );

                    return;
                }

                setTipoMensagem(
                    "erro"
                );

                setMensagem(
                    "Não foi possível validar o acesso."
                );

                return;
            }

            const parceiroId =
                parceiro.id;

            setTipoMensagem(
                "sucesso"
            );

            setMensagem(
                "Cadastro localizado. Abrindo sua área..."
            );

            /*
             * Redireciona para a área
             * que já construímos.
             */
            router.push(
                `/parceiros/reservas?agenciaId=${parceiroId}`
            );
        } catch (error) {
            console.error(
                "Erro ao acessar área do parceiro:",
                error
            );

            setTipoMensagem(
                "erro"
            );

            setMensagem(
                "Não foi possível validar o acesso agora. Tente novamente."
            );
        } finally {
            setCarregando(
                false
            );
        }
    }

    /* ==========================================
       TELA
    ========================================== */

    return (
        <main
            className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-10"
            style={{
                backgroundImage:
                    "url('/fotos/fundo-geral.jpg')",
            }}
        >
            {/* ESCURECIMENTO */}

            <div className="absolute inset-0 bg-black/65" />

            {/* CARD */}

            <div className="relative z-10 w-full max-w-xl rounded-3xl border border-white/10 bg-emerald-950/95 p-6 text-white shadow-2xl md:p-8">

                {/* LOGO */}

                <div className="text-center">
                    <img
                        src="/logo-final.png"
                        alt="Parque Mundo Novo"
                        className="mx-auto h-24 w-24 object-contain"
                    />

                    <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                        Área exclusiva
                    </p>

                    <h1 className="mt-2 text-3xl font-black">
                        Área do Parceiro
                    </h1>

                    <p className="mt-3 text-sm text-white/70">
                        Acesso para agências,
                        guias, operadoras e
                        parceiros já aprovados
                        pelo Parque Mundo Novo.
                    </p>
                </div>

                {/* AVISO */}

                <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-900/60 p-4 text-sm">
                    <p className="font-black text-emerald-300">
                        ✅ Já possui cadastro aprovado?
                    </p>

                    <p className="mt-2 text-white/75">
                        Informe o mesmo CNPJ/CPF
                        e e-mail utilizados no
                        cadastro aprovado.
                    </p>
                </div>

                {/* DOCUMENTO */}

                <label className="mt-6 block">
                    <span className="text-sm font-bold">
                        CNPJ / CPF
                    </span>

                    <input
                        type="text"
                        value={
                            documento
                        }
                        onChange={(
                            e
                        ) => {
                            const valor =
                                somenteDigitos(
                                    e.target.value
                                ).slice(
                                    0,
                                    14
                                );

                            setDocumento(
                                formatarDocumento(
                                    valor
                                )
                            );
                        }}
                        placeholder="00.000.000/0000-00"
                        className="mt-2 w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
                    />
                </label>

                {/* EMAIL */}

                <label className="mt-4 block">
                    <span className="text-sm font-bold">
                        E-mail cadastrado
                    </span>

                    <input
                        type="email"
                        value={
                            email
                        }
                        onChange={(
                            e
                        ) =>
                            setEmail(
                                e.target.value
                            )
                        }
                        placeholder="email@empresa.com.br"
                        className="mt-2 w-full rounded-2xl border border-white/20 bg-white px-4 py-4 font-bold text-slate-900 outline-none"
                    />
                </label>

                {/* MENSAGEM */}

                {mensagem && (
                    <div
                        className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${tipoMensagem ===
                                "erro"
                                ? "border-red-300 bg-red-100 text-red-800"
                                : "border-emerald-300 bg-emerald-100 text-emerald-800"
                            }`}
                    >
                        {mensagem}
                    </div>
                )}

                {/* ENTRAR */}

                <button
                    type="button"
                    onClick={
                        entrar
                    }
                    disabled={
                        carregando
                    }
                    className="mt-6 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-lg font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                    {carregando
                        ? "Validando cadastro..."
                        : "Entrar na área do parceiro"}
                </button>

                {/* DIVISOR */}

                <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/20" />

                    <span className="text-xs font-bold text-white/50">
                        OU
                    </span>

                    <div className="h-px flex-1 bg-white/20" />
                </div>

                {/* CADASTRO */}

                <div className="text-center">
                    <p className="text-sm text-white/70">
                        Ainda não possui cadastro
                        aprovado?
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/parceiros/cadastro"
                            )
                        }
                        className="mt-4 w-full rounded-2xl border border-white/30 bg-white/10 px-5 py-4 font-black text-white transition hover:bg-white/20"
                    >
                        Fazer cadastro de parceiro
                    </button>
                </div>

                {/* VOLTAR */}

                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            "/ingressos"
                        )
                    }
                    className="mt-4 w-full py-3 text-sm font-bold text-white/60 hover:text-white"
                >
                    ← Voltar para ingressos
                </button>
            </div>
        </main>
    );
}