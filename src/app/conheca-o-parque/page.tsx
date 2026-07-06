import Link from "next/link";

export const metadata = {
    title: "Conheça o Parque | Parque Mundo Novo",
    description:
        "Conheça o Parque Mundo Novo: cachoeiras, mirantes, elevador panorâmico, camping, restaurante, café e natureza.",
};

const fotos = [
    "/fotos/conheca/foto1.png",
    "/fotos/conheca/foto2.png",
    "/fotos/conheca/foto3.png",
    "/fotos/conheca/foto4.png",
    "/fotos/conheca/foto5.png",
    "/fotos/conheca/foto6.png",
    "/fotos/conheca/foto7.png",
    "/fotos/conheca/foto8.png",

];

export default function ConhecaOParquePage() {
    return (
        <main className="min-h-screen bg-[#07130d] text-white">
            <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 text-center">
                <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/videos/parque2.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                />

                <div className="absolute inset-0 bg-black/25" />

                <div className="relative z-10 max-w-4xl">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300 drop-shadow-lg">
                        Parque Mundo Novo
                    </p>

                    <h1 className="text-4xl font-black leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] md:text-7xl">
                        Conheça o Parque Mundo Novo
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-white drop-shadow-lg md:text-2xl">
                        Natureza, cachoeiras, mirantes, camping, gastronomia e experiências
                        inesquecíveis em um só lugar.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="/ingressos"
                            className="rounded-full bg-emerald-500 px-8 py-4 text-lg font-bold text-black shadow-xl transition hover:bg-emerald-400"
                        >
                            Comprar Ingressos
                        </Link>

                        <a
                            href="#videos"
                            className="rounded-full border border-white/40 bg-black/20 px-8 py-4 text-lg font-bold text-white shadow-xl backdrop-blur transition hover:bg-black/35"
                        >
                            Ver Vídeos
                        </a>
                    </div>
                </div>
            </section>

            <section className="px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Viva essa experiência
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Um destino para toda a família
                        </h2>

                        <p className="mx-auto mt-5 max-w-3xl text-lg text-white/75">
                            O Parque Mundo Novo reúne aventura, tranquilidade e contato com a
                            natureza, com atrações para quem quer descansar, explorar,
                            fotografar e viver momentos especiais.
                        </p>
                    </div>

                    <div id="videos" className="grid gap-8 md:grid-cols-2">
                        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
                            <video
                                className="aspect-[9/16] max-h-[720px] w-full rounded-[1.5rem] object-cover"
                                src="/videos/parque1.mp4"
                                controls
                                playsInline
                                preload="metadata"
                            />

                            <div className="p-4">
                                <h3 className="text-2xl font-black">Conheça o Parque</h3>
                                <p className="mt-2 text-white/70">
                                    Um passeio pelas belezas naturais e principais experiências do
                                    Parque Mundo Novo.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
                            <video
                                className="aspect-[9/16] max-h-[720px] w-full rounded-[1.5rem] object-cover"
                                src="/videos/parque2.mp4"
                                controls
                                playsInline
                                preload="metadata"
                            />

                            <div className="p-4">
                                <h3 className="text-2xl font-black">Experiência Mundo Novo</h3>
                                <p className="mt-2 text-white/70">
                                    Natureza, paisagens, trilhas, mirantes e momentos únicos para
                                    guardar na memória.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-[#07130d] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Galeria
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Momentos no Parque Mundo Novo
                        </h2>

                        <p className="mx-auto mt-5 max-w-3xl text-lg text-white/75">
                            Veja algumas imagens do parque e das experiências que esperam por
                            você.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {fotos.map((foto, index) => (
                            <div
                                key={foto}
                                className={`group relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl ${index === 0 ? "lg:col-span-2 lg:row-span-2" : ""
                                    }`}
                            >
                                <img
                                    src={foto}
                                    alt={`Foto do Parque Mundo Novo ${index + 1}`}
                                    className="h-full min-h-[280px] w-full object-cover transition duration-700 group-hover:scale-110"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#0b1f14] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-black md:text-5xl">
                            Atrações do Parque
                        </h2>

                        <p className="mx-auto mt-4 max-w-2xl text-white/70">
                            Cachoeiras, mirantes, camping, gastronomia e experiências para
                            toda a família.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            "Cachoeiras",
                            "Elevador Panorâmico",
                            "Pedra Furada",
                            "Camping",
                            "Mirantes",
                            "Balanço do Infinito",
                            "Restaurante",
                            "Café El Torrador",
                        ].map((item) => (
                            <div
                                key={item}
                                className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl transition hover:-translate-y-1 hover:bg-white/15"
                            >
                                <h3 className="text-xl font-black">{item}</h3>
                                <p className="mt-3 text-sm text-white/65">
                                    Uma experiência especial dentro do Parque Mundo Novo.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-6 py-20">
                <div className="mx-auto max-w-5xl rounded-[2rem] border border-emerald-400/30 bg-emerald-500/10 p-8 text-center shadow-2xl md:p-14">
                    <h2 className="text-3xl font-black md:text-5xl">
                        Venha viver essa experiência
                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl text-lg text-white/75">
                        Compre seu ingresso online, receba por e-mail e WhatsApp, e
                        apresente o QR Code na entrada do parque.
                    </p>

                    <Link
                        href="/ingressos"
                        className="mt-8 inline-flex rounded-full bg-emerald-500 px-9 py-4 text-lg font-black text-black transition hover:bg-emerald-400"
                    >
                        Comprar Ingressos
                    </Link>
                </div>
            </section>
        </main>
    );
}