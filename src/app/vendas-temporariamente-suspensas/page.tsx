import Link from "next/link";

export default function VendasTemporariamenteSuspensasPage() {
    return (
        <main
            className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-10 text-white"
            style={{
                backgroundImage: "url('/fotos/fundo-geral.jpg')",
            }}
        >
            <div className="absolute inset-0 bg-black/65" />

            <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/20 bg-emerald-950/80 p-6 text-center shadow-2xl backdrop-blur-md sm:p-10">
                <img
                    src="/logo-final.png"
                    alt="Parque Mundo Novo"
                    className="mx-auto w-28 rounded-2xl bg-white/10 p-3"
                />

                <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-emerald-200">
                    Site oficial
                </p>

                <h1 className="mt-4 text-4xl font-black sm:text-5xl">
                    Vendas online temporariamente suspensas
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/85">
                    Estamos finalizando o treinamento da equipe responsável pela validação
                    dos ingressos na portaria.
                </p>

                <div className="mt-6 rounded-2xl border border-yellow-300/30 bg-yellow-400/15 p-5 text-left text-sm leading-relaxed text-yellow-50">
                    As vendas online serão reabertas em breve. Ingressos já comprados
                    continuam válidos e serão atendidos normalmente.
                </div>

                <p className="mt-6 text-sm leading-relaxed text-white/75">
                    Para dúvidas, entre em contato pelo WhatsApp:
                    <br />
                    <strong className="text-white">(49) 99129-9991</strong>
                </p>

                <Link
                    href="/ingressos"
                    className="mt-8 inline-block rounded-2xl bg-emerald-500 px-7 py-4 font-black text-emerald-950 shadow-xl transition hover:bg-emerald-400"
                >
                    Voltar para o site
                </Link>
            </section>
        </main>
    );
}