"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AcessoParceiroPage() {
    const router = useRouter();

    const [documento, setDocumento] = useState("");
    const [email, setEmail] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [mensagem, setMensagem] = useState("");

    const [tipoMensagem, setTipoMensagem] =
        useState<"erro" | "sucesso" | "">("");

    /* ==========================================
       FUNÇÕES
    ========================================== */

    function somenteDigitos(valor: string) {
        return valor.replace(/\D/g, "");
    }

    function formatarDocumento(valor: string) {
        const numeros = somenteDigitos(valor);

        // CPF
        if (numeros.length <= 11) {
            return numeros
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        }

        // CNPJ
        return numeros
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }

    /* ==========================================
       ENTRAR
    ========================================== */

    async function entrar() {
        setMensagem("");
        setTipoMensagem("");

        const documentoLimpo = somenteDigitos(documento);

        const emailLimpo = email
            .trim()
            .toLowerCase();

        if (!documentoLimpo) {
            setTipoMensagem("erro");
            setMensagem(
                "Informe o CNPJ ou CPF cadastrado."
            );
            return;
        }

        if (!emailLimpo) {
            setTipoMensagem("erro");
            setMensagem(
                "Informe o e-mail cadastrado."
            );
            return;
        }

        try {
            setCarregando(true);

            /*
             * Agora NÃO consultamos mais
             * o Firestore diretamente no navegador.
             *
             * A validação acontece no servidor.
             */
            const resposta = await fetch(
                "/parceiros/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        documento:
                            documentoLimpo,

                        email:
                            emailLimpo,
                    }),
                }
            );

            let dados: {
                ok?: boolean;
                error?: string;
                mensagem?: string;
            } = {};

            try {
                dados =
                    await resposta.json();
            } catch {
                dados = {};
            }

            if (
                !resposta.ok ||
                !dados.ok
            ) {
                setTipoMensagem("erro");

                setMensagem(
                    dados.error ||
                    dados.mensagem ||
                    "Não foi possível validar o acesso."
                );

                return;
            }

            /*
             * O servidor criou a sessão
             * segura através do cookie.
             *
             * Não precisamos mais colocar
             * agenciaId na URL.
             */

            setTipoMensagem("sucesso");

            setMensagem(
                "Cadastro localizado. Abrindo sua área..."
            );

            /*
             * Pequeno intervalo apenas para
             * o usuário visualizar a confirmação.
             */
            setTimeout(() => {
                router.push(
                    "/parceiros/reservas"
                );

                router.refresh();
            }, 500);
        } catch (error) {
            console.error(
                "Erro ao acessar área do parceiro:",
                error
            );

            setTipoMensagem("erro");

            setMensagem(
                "Não foi possível validar o acesso agora. Tente novamente."
            );
        } finally {
            setCarregando(false);
        }
    }

    /* ==========================================
       ENTER NO FORMULÁRIO
    ========================================== */

    function pressionarEnter(
        e: React.KeyboardEvent
    ) {
        if (
            e.key === "Enter" &&
            !carregando
        ) {
            entrar();
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
                        value={documento}
                        onChange={(e) => {
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
                        onKeyDown={
                            pressionarEnter
                        }
                        placeholder="00.000.000/0000-00"
                        autoComplete="username"
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
                        value={email}
                        onChange={(e) =>
                            setEmail(
                                e.target.value
                            )
                        }
                        onKeyDown={
                            pressionarEnter
                        }
                        placeholder="email@empresa.com.br"
                        autoComplete="email"
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
                    onClick={entrar}
                    disabled={carregando}
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