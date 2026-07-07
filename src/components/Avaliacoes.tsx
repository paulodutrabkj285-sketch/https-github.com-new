const avaliacoes = [
    {
        nome: "Alfeu Sassi",
        origem: "Google Local Guide",
        tipo: "Google",
        texto:
            "Uma experiência de tirar o fôlego, na visita à cascata e nas trilhas. O passeio do elevador panorâmico é uma aventura à parte, pois leva à base da cascata que proporciona um banho de lavar a alma.",
    },
    {
        nome: "Analía Camacho Pimentel",
        origem: "Google Local Guide",
        tipo: "Google",
        texto:
            "Um lugar lindo com muitas atividades para aproveitar. É muito acessível para idosos.",
    },
    {
        nome: "Roosevelt B.",
        origem: "Google Local Guide",
        tipo: "Google",
        texto: "Lindo. Muito organizado. Nem o tempo fechado atrapalhou a visita.",
    },
    {
        nome: "@dicasdeviagemdamel",
        origem: "Instagram",
        tipo: "Instagram",
        texto: "Lugar incrível! 👏👏👏",
    },
    {
        nome: "@carla_susin",
        origem: "Instagram",
        tipo: "Instagram",
        texto: "Este lugar consegue ser especial o ano inteiro ❤️",
    },
    {
        nome: "@humbertolangone",
        origem: "Instagram",
        tipo: "Instagram",
        texto: "Paisagem espetacular com trilha sonora espetacular.",
    },
    {
        nome: "@__alinepeteer1987",
        origem: "Instagram",
        tipo: "Instagram",
        texto: "Linda em todos os sentidos 😍",
    },
];

export default function Avaliacoes() {
    return (
        <section className="bg-[#07130d] px-6 py-20">
            <div className="mx-auto max-w-7xl">
                <div className="mb-12 text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                        Avaliações
                    </p>

                    <h2 className="mt-4 text-3xl font-black md:text-5xl">
                        Quem visita recomenda
                    </h2>

                    <p className="mx-auto mt-5 max-w-3xl text-lg text-white/75">
                        Avaliações reais de visitantes que viveram a experiência no Parque
                        Mundo Novo.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {avaliacoes.map((item) => (
                        <div
                            key={item.nome}
                            className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.12]"
                        >
                            <div className="text-xl text-yellow-300">★★★★★</div>

                            <p className="mt-5 min-h-[96px] text-base leading-relaxed text-white/85">
                                “{item.texto}”
                            </p>

                            <div className="mt-6 border-t border-white/10 pt-5">
                                <p className="text-lg font-black text-white">{item.nome}</p>

                                <p className="mt-1 text-sm font-bold text-emerald-300">
                                    {item.tipo === "Google" ? "🟢" : "📷"} {item.origem}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}