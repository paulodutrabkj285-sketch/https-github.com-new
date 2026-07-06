"use client";

import Link from "next/link";
import { useState } from "react";

const fotos = [
    "/fotos/conheca/foto1.png",
    "/fotos/conheca/foto2.png",
    "/fotos/conheca/foto3.png",
    "/fotos/conheca/foto4.png",
    "/fotos/conheca/foto5.png",
    "/fotos/conheca/foto6.png",
    "/fotos/conheca/foto7.png",
    "/fotos/conheca/foto8.png",
    "/fotos/conheca/foto9.png",
    "/fotos/conheca/foto10.png",
    "/fotos/conheca/foto11.png",
    "/fotos/conheca/foto12.png",
];

const videos = [
    {
        titulo: "Conheça o Parque",
        descricao: "Um passeio pelas belezas naturais e principais experiências do Parque Mundo Novo.",
        src: "/videos/parque1.mp4",
    },
    {
        titulo: "Experiência Mundo Novo",
        descricao: "Natureza, paisagens, trilhas, mirantes e momentos únicos para guardar na memória.",
        src: "/videos/parque2.mp4",
    },
    {
        titulo: "Natureza e Aventura",
        descricao: "Descubra novos ângulos, paisagens incríveis e tudo o que espera por você no parque.",
        src: "/videos/parque3.mp4",
    },
];

const atracoes = [
    "Cachoeiras",
    "Elevador Panorâmico",
    "Pedra Furada",
    "Camping",
    "Mirantes",
    "Balanço do Infinito",
    "Restaurante",
    "Bistrô",
    "Café El Torrador",
    "Pet Friendly",
];

const numeros = [
    "🌲 Natureza",
    "🌊 Cachoeiras",
    "🚠 Elevador Panorâmico",
    "🏕 Camping",
    "🐶 Pet Friendly",
    "☕ Café",
    "🍽 Restaurante",
    "👨‍👩‍👧‍👦 Para toda família",
];

export default function ConhecaOParquePage() {
    const [fotoAberta, setFotoAberta] = useState<number | null>(null);

    function proximaFoto() {
        if (fotoAberta === null) return;
        setFotoAberta((fotoAberta + 1) % fotos.length);
    }

    function fotoAnterior() {
        if (fotoAberta === null) return;
        setFotoAberta((fotoAberta - 1 + fotos.length) % fotos.length);
    }

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

                <div className="relative z-10 max-w-5xl">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300 drop-shadow-lg">
                        Parque Mundo Novo
                    </p>

                    <h1 className="text-4xl font-black leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] md:text-7xl">
                        Conheça o Parque Mundo Novo
                    </h1>

                    <p className="mx-auto mt-6 max-w-3xl text-lg text-white drop-shadow-lg md:text-2xl">
                        Cachoeiras, mirantes, elevador panorâmico, camping, gastronomia e
                        natureza em um dos destinos mais especiais de Urubici/SC.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
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

                        <a
                            href="#galeria"
                            className="rounded-full border border-white/40 bg-black/20 px-8 py-4 text-lg font-bold text-white shadow-xl backdrop-blur transition hover:bg-black/35"
                        >
                            Ver Fotos
                        </a>
                    </div>
                </div>
            </section>

            <section className="bg-[#07130d] px-6 py-16">
                <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {numeros.map((item) => (
                        <div
                            key={item}
                            className="rounded-3xl border border-white/10 bg-white/10 p-5 text-center text-lg font-black shadow-xl backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </section>

            <section id="videos" className="px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Vídeos
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Viva essa experiência
                        </h2>

                        <p className="mx-auto mt-5 max-w-3xl text-lg text-white/75">
                            Veja um pouco das paisagens, atrações e momentos que fazem do
                            Parque Mundo Novo um destino especial.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-3">
                        {videos.map((video) => (
                            <div
                                key={video.src}
                                className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur"
                            >
                                <video
                                    className="aspect-[9/16] max-h-[720px] w-full rounded-[1.5rem] bg-black object-cover"
                                    src={video.src}
                                    controls
                                    playsInline
                                    preload="metadata"
                                />

                                <div className="p-4">
                                    <h3 className="text-2xl font-black">{video.titulo}</h3>
                                    <p className="mt-2 text-white/70">{video.descricao}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="galeria" className="bg-[#07130d] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Galeria
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Momentos no Parque Mundo Novo
                        </h2>

                        <p className="mx-auto mt-5 max-w-3xl text-lg text-white/75">
                            Clique nas fotos para visualizar em tela cheia.
                        </p>
                    </div>

                    <div className="grid auto-rows-[220px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {fotos.map((foto, index) => (
                            <button
                                key={foto}
                                type="button"
                                onClick={() => setFotoAberta(index)}
                                className={`group relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl outline-none transition hover:-translate-y-1 ${index === 0
                                        ? "sm:col-span-2 sm:row-span-2"
                                        : index === 5 || index === 8
                                            ? "lg:col-span-2"
                                            : ""
                                    }`}
                            >
                                <img
                                    src={foto}
                                    alt={`Foto do Parque Mundo Novo ${index + 1}`}
                                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-80" />

                                <div className="absolute bottom-4 left-4 rounded-full bg-black/40 px-4 py-2 text-sm font-bold text-white backdrop-blur">
                                    Foto {index + 1}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#0b1f14] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-12 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
                            Atrações
                        </p>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            O que você encontra no parque
                        </h2>

                        <p className="mx-auto mt-5 max-w-3xl text-lg text-white/70">
                            Cachoeiras, mirantes, camping, gastronomia e experiências para
                            toda a família.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                        {atracoes.map((item) => (
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
                        Compre seu ingresso online, receba por e-mail e apresente o QR Code
                        impresso ou pelo celular na entrada do parque.
                    </p>

                    <Link
                        href="/ingressos"
                        className="mt-8 inline-flex rounded-full bg-emerald-500 px-9 py-4 text-lg font-black text-black transition hover:bg-emerald-400"
                    >
                        Comprar Ingressos
                    </Link>
                </div>
            </section>

            {fotoAberta !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
                    <button
                        type="button"
                        onClick={() => setFotoAberta(null)}
                        className="absolute right-5 top-5 rounded-full bg-white/10 px-5 py-3 text-lg font-black text-white backdrop-blur transition hover:bg-white/20"
                    >
                        ✕
                    </button>

                    <button
                        type="button"
                        onClick={fotoAnterior}
                        className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 px-5 py-4 text-3xl font-black text-white backdrop-blur transition hover:bg-white/20 md:block"
                    >
                        ‹
                    </button>

                    <img
                        src={fotos[fotoAberta]}
                        alt={`Foto ampliada do Parque Mundo Novo ${fotoAberta + 1}`}
                        className="max-h-[88vh] max-w-[92vw] rounded-3xl object-contain shadow-2xl"
                    />

                    <button
                        type="button"
                        onClick={proximaFoto}
                        className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 px-5 py-4 text-3xl font-black text-white backdrop-blur transition hover:bg-white/20 md:block"
                    >
                        ›
                    </button>

                    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur">
                        <button type="button" onClick={fotoAnterior} className="md:hidden">
                            ‹ Anterior
                        </button>

                        <span>
                            {fotoAberta + 1} / {fotos.length}
                        </span>

                        <button type="button" onClick={proximaFoto} className="md:hidden">
                            Próxima ›
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}