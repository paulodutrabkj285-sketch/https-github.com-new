import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "O que fazer em Urubici | Parque Mundo Novo",
    description:
        "Descubra o que fazer em Urubici: cachoeiras, mirantes, camping, elevador panorâmico, natureza e aventura no Parque Mundo Novo.",
    keywords: [
        "O que fazer em Urubici",
        "Turismo em Urubici",
        "Parque em Urubici",
        "Cachoeiras em Urubici",
        "Camping em Urubici",
        "Elevador panorâmico Urubici",
        "Passeios em Urubici",
        "Parque Mundo Novo",
    ],
};

const atracoes = [
    {
        titulo: "Cachoeiras",
        texto: "Contato direto com a natureza em um dos cenários mais bonitos da Serra Catarinense.",
        icone: "🌊",
    },
    {
        titulo: "Elevador Panorâmico",
        texto: "Uma experiência única com vista privilegiada. Atração vendida separadamente.",
        icone: "🚡",
    },
    {
        titulo: "Camping",
        texto: "Área para quem deseja viver uma experiência completa junto à natureza.",
        icone: "🏕️",
    },
    {
        titulo: "Mirantes",
        texto: "Pontos perfeitos para fotos, contemplação e momentos especiais em família.",
        icone: "📸",
    },
    {
        titulo: "Área Kids",
        texto: "Espaço para as crianças aproveitarem o passeio com mais diversão.",
        icone: "👨‍👩‍👧",
    },
    {
        titulo: "Trilhas e natureza",
        texto: "Caminhadas, ar puro, paisagens naturais e experiências ao ar livre.",
        icone: "🥾",
    },
];

const fotos = [
    "/fotos/conheca/foto1.png",
    "/fotos/conheca/foto2.png",
    "/fotos/conheca/foto3.png",
    "/fotos/conheca/foto4.png",
    "/fotos/conheca/foto5.png",
    "/fotos/conheca/foto6.png",
];

const perguntas = [
    {
        pergunta: "O Parque Mundo Novo fica em Urubici?",
        resposta:
            "Sim. O Parque Mundo Novo está localizado em Urubici, na Serra Catarinense.",
    },
    {
        pergunta: "O parque abre todos os dias?",
        resposta:
            "Sim. O funcionamento é todos os dias, das 08h às 17h30.",
    },
    {
        pergunta: "O Elevador Panorâmico está incluso no ingresso?",
        resposta:
            "Não. O Elevador Panorâmico é uma atração opcional e possui ingresso vendido separadamente.",
    },
    {
        pergunta: "O camping inclui acesso ao parque?",
        resposta:
            "Sim. A diária do camping inclui acesso ao parque durante o período contratado.",
    },
    {
        pergunta: "Recebo o ingresso por e-mail?",
        resposta:
            "Sim. Após a confirmação do pagamento, o ingresso digital com QR Code é enviado por e-mail.",
    },
    {
        pergunta: "Aceita Pix?",
        resposta:
            "Sim. A compra online funciona com Pix e confirmação automática de pagamento.",
    },
];

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: perguntas.map((item) => ({
        "@type": "Question",
        name: item.pergunta,
        acceptedAnswer: {
            "@type": "Answer",
            text: item.resposta,
        },
    })),
};

export default function OQueFazerEmUrubiciPage() {
    return (
        <main className="min-h-screen bg-[#06130d] text-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(faqSchema),
                }}
            />

            <section
                className="relative flex min-h-[88vh] items-center overflow-hidden bg-cover bg-center px-6 py-24"
                style={{
                    backgroundImage: "url('/fotos/fundo-geral.jpg')",
                }}
            >
                <div className="absolute inset-0 bg-black/55" />

                <div className="relative z-10 mx-auto max-w-6xl">
                    <p className="mb-4 text-sm font-bold uppercase tracking-[0.35em] text-emerald-300">
                        Turismo em Urubici
                    </p>

                    <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                        O que fazer em Urubici? Conheça o Parque Mundo Novo
                    </h1>

                    <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/85 md:text-2xl">
                        Cachoeiras, mirantes, camping, elevador panorâmico, natureza e
                        aventura em um dos destinos mais especiais da Serra Catarinense.
                    </p>

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                        <Link
                            href="/ingressos"
                            className="rounded-2xl bg-emerald-500 px-8 py-4 text-center text-lg font-black text-emerald-950 shadow-xl transition hover:bg-emerald-400"
                        >
                            Comprar ingresso
                        </Link>

                        <Link
                            href="/conheca-o-parque"
                            className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-center text-lg font-bold backdrop-blur transition hover:bg-white/20"
                        >
                            Conheça o parque
                        </Link>
                    </div>
                </div>
            </section>

            <section className="px-6 py-20">
                <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Serra Catarinense
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Urubici é um dos destinos mais procurados de Santa Catarina
                        </h2>
                    </div>

                    <div className="space-y-5 text-lg leading-relaxed text-white/75">
                        <p>
                            Urubici é conhecida por suas paisagens naturais, clima de serra,
                            cachoeiras, mirantes, trilhas, gastronomia e experiências ao ar
                            livre.
                        </p>

                        <p>
                            Para quem procura o que fazer em Urubici, o Parque Mundo Novo é
                            uma opção completa para famílias, casais, grupos de amigos,
                            campistas e visitantes que desejam aproveitar a natureza com
                            conforto e praticidade.
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-[#0b1f14] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Atrações
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Experiências para aproveitar no Parque Mundo Novo
                        </h2>

                        <p className="mx-auto mt-5 max-w-3xl text-lg text-white/70">
                            O parque reúne natureza, lazer, aventura e estrutura para tornar
                            sua visita a Urubici ainda mais especial.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {atracoes.map((item) => (
                            <div
                                key={item.titulo}
                                className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur"
                            >
                                <div className="text-4xl">{item.icone}</div>

                                <h3 className="mt-5 text-2xl font-black">{item.titulo}</h3>

                                <p className="mt-3 leading-relaxed text-white/70">
                                    {item.texto}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Galeria
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Momentos no Parque Mundo Novo
                        </h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {fotos.map((foto, index) => (
                            <div
                                key={foto}
                                className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-2xl"
                            >
                                <img
                                    src={foto}
                                    alt={`Foto do Parque Mundo Novo em Urubici ${index + 1}`}
                                    className="h-72 w-full object-cover transition duration-500 hover:scale-105"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#0b1f14] px-6 py-20">
                <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
                    <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-6">
                        <h3 className="text-2xl font-black">Horário</h3>
                        <p className="mt-3 text-white/75">
                            Todos os dias, das 08h às 17h30.
                        </p>
                    </div>

                    <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-6">
                        <h3 className="text-2xl font-black">Localização</h3>
                        <p className="mt-3 text-white/75">SC-110 KM 34, Urubici - SC.</p>
                    </div>

                    <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-6">
                        <h3 className="text-2xl font-black">Ingressos</h3>
                        <p className="mt-3 text-white/75">
                            Compra online com Pix, confirmação automática e QR Code.
                        </p>
                    </div>
                </div>
            </section>

            <section className="px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Dúvidas frequentes
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Perguntas sobre a visita
                        </h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {perguntas.map((item) => (
                            <div
                                key={item.pergunta}
                                className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6"
                            >
                                <h3 className="text-xl font-black">{item.pergunta}</h3>
                                <p className="mt-3 leading-relaxed text-white/70">
                                    {item.resposta}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-6 pb-24">
                <div className="mx-auto max-w-5xl rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-8 text-center shadow-2xl">
                    <h2 className="text-3xl font-black md:text-5xl">
                        Planeje sua visita ao Parque Mundo Novo
                    </h2>

                    <p className="mx-auto mt-5 max-w-3xl text-lg text-white/75">
                        Garanta seu ingresso online e aproveite uma das experiências mais
                        completas de turismo em Urubici.
                    </p>

                    <Link
                        href="/ingressos"
                        className="mt-8 inline-block rounded-2xl bg-emerald-400 px-10 py-4 text-lg font-black text-emerald-950 transition hover:bg-emerald-300"
                    >
                        Comprar ingresso agora
                    </Link>
                </div>
            </section>
        </main>
    );
}