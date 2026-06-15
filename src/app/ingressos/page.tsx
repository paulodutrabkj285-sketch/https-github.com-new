"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function IngressosPage() {
  const router = useRouter();

  const linkMaps =
    "https://maps.google.com/maps?vet=10CAAQoqAOahcKEwiA3azy-YeVAxUAAAAAHQAAAAAQBg..i&pvq=CgwvZy8xcHYyZl9kaGIiFwoRcGFycXVlIG11bmRvIG5vdm8QAhgD&lqi=ChlwYXJxdWUgbXVuZG8gbm92byB1cnViaWNpSOrj_qbolYCACFopEAAQARACGAAYARgCGAMiGXBhcnF1ZSBtdW5kbyBub3ZvIHVydWJpY2mSAQpmYWlyZ3JvdW5k&fvr=1&cs=0&um=1&ie=UTF-8&fb=1&gl=br&sa=X&ftid=0x952046a2f62d7365:0x34bd4695f0794ad2";

  const imagens = [
    { url: "/fotos/fundo-geral.jpg", posicao: "center 35%" },
    { url: "/fotos/cachoeira-alta.png", posicao: "center 18%" },
    { url: "/fotos/cachoeira-lago.png", posicao: "center 25%" },
  ];

  const [imagemAtual, setImagemAtual] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setImagemAtual((prev) => (prev + 1) % imagens.length);
    }, 7000);

    return () => clearInterval(intervalo);
  }, [imagens.length]);

  const ingressos = [
    {
      titulo: "Ingresso Parque",
      descricao: "Entrada para visitar o parque, trilhas, cachoeiras e mirantes.",
      preco: "R$ 60,00",
      imagem: "/fotos/ingresso-parque.jpg",
      rota: "/ingressos/parque",
    },
    {
      titulo: "Meia Entrada Idoso",
      descricao: "Valor especial para idosos mediante documento comprobatório.",
      preco: "R$ 30,00",
      imagem: "/fotos/idoso-cachoeira.jpg",
      rota: "/ingressos/idoso",
    },
    {
      titulo: "Camping",
      descricao: "Hospedagem no camping com natureza, tranquilidade e estrutura.",
      preco: "A partir de R$ 100,00",
      imagem: "/fotos/camping.jpg",
      rota: "/ingressos/camping",
    },
    {
      titulo: "Elevador Panorâmico",
      descricao: "Experiência vendida separadamente com vista panorâmica.",
      preco: "R$ 75,00",
      imagem: "/fotos/elevador-novo.jpg",
      rota: "/ingressos/elevador",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-10 text-white">
      {imagens.map((img, index) => (
        <div
          key={img.url}
          className={`absolute inset-0 bg-no-repeat transition-opacity duration-[2000ms] ${imagemAtual === index ? "opacity-100" : "opacity-0"
            }`}
          style={{
            backgroundImage: `url('${img.url}')`,
            backgroundSize: "cover",
            backgroundPosition: img.posicao,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <section className="rounded-3xl border border-white/20 bg-emerald-950/70 p-8 shadow-2xl backdrop-blur-sm">
          <img
            src="/logo-final.png"
            alt="Logo Parque Mundo Novo"
            className="mb-6 h-28 w-28 rounded-2xl bg-white/10 object-contain p-3"
          />

          <h1 className="text-4xl font-bold drop-shadow-lg md:text-6xl">
            Parque Mundo Novo
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-white/90 drop-shadow-md md:text-2xl">
            Compre seu ingresso online com praticidade e segurança.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl backdrop-blur-sm">
          <h2 className="text-2xl font-black text-[#166534]">
            📍 Localização e funcionamento
          </h2>

          <p className="mt-3 text-base font-semibold text-gray-800">
            Parque Mundo Novo
          </p>

          <p className="mt-2 text-gray-700">
            Funcionamento diário das <strong>08h00 às 18h00</strong>.
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Clique no botão abaixo para abrir a rota no Google Maps.
          </p>

          <a
            href={linkMaps}
            target="_blank"
            className="mt-5 inline-block rounded-2xl bg-green-700 px-6 py-4 font-bold text-white shadow-lg transition hover:bg-green-600"
          >
            📍 Como chegar pelo Google Maps
          </a>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ingressos.map((item) => (
            <div
              key={item.titulo}
              className="group relative min-h-[430px] overflow-hidden rounded-3xl border border-white/20 bg-black/40 shadow-2xl"
            >
              <img
                src={item.imagem}
                alt={item.titulo}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

              <div className="relative z-10 flex h-full min-h-[430px] flex-col justify-end p-6">
                <h2 className="text-2xl font-bold leading-tight drop-shadow-lg">
                  {item.titulo}
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-white/90 drop-shadow-md">
                  {item.descricao}
                </p>

                <p className="mt-6 text-2xl font-bold drop-shadow-lg">
                  {item.preco}
                </p>

                <button
                  onClick={() => router.push(item.rota)}
                  className="mt-6 rounded-xl bg-green-600 px-5 py-4 font-bold text-white shadow-lg transition hover:bg-green-500 active:scale-95"
                >
                  Comprar ingresso
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}