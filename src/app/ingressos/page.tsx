"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function IngressosPage() {
  const router = useRouter();

  const [imagemAtual, setImagemAtual] = useState(0);
  const [mostrarLocalizacao, setMostrarLocalizacao] = useState(false);

  const linkMaps =
    "https://maps.google.com/maps?vet=10CAAQoqAOahcKEwiA3azy-YeVAxUAAAAAHQAAAAAQBg..i&pvq=CgwvZy8xcHYyZl9kaGIiFwoRcGFycXVlIG11bmRvIG5vdm8QAhgD&lqi=ChlwYXJxdWUgbXVuZG8gbm92byB1cnViaWNpY2mSAQpmYWlyZ3JvdW5k&fvr=1&cs=0&um=1&ie=UTF-8&fb=1&gl=br&sa=X&ftid=0x952046a2f62d7365:0x34bd4695f0794ad2";

  const imagens = [
    { url: "/fotos/fundo-geral.jpg", posicao: "center 35%" },
    { url: "/fotos/cachoeira-alta.png", posicao: "center 18%" },
    { url: "/fotos/cachoeira-lago.png", posicao: "center 25%" },
  ];

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

          <div className="mt-4">
            <span className="rounded-full border border-yellow-400/30 bg-yellow-500/20 px-4 py-2 text-sm font-semibold text-yellow-100 shadow">
              ⭐ 4,5/5 no Google • +1.600 avaliações
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white shadow">
              🕒 Todos os dias das 08h às 18h
            </span>

            <button
              type="button"
              onClick={() => setMostrarLocalizacao((valor) => !valor)}
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-white/25"
            >
              📍 {mostrarLocalizacao ? "Ocultar localização" : "Ver localização"}
            </button>
          </div>

          {mostrarLocalizacao && (
            <div className="mt-5 rounded-2xl border border-white/20 bg-black/30 p-4 text-white">
              <p className="font-bold">Parque Mundo Novo</p>

              <p className="mt-1 text-sm text-white/85">
                SC-110 KM 34 - Urubici/SC
              </p>

              <p className="mt-1 text-sm text-white/85">
                Clique no botão abaixo para abrir a rota no Google Maps.
              </p>

              <a
                href={linkMaps}
                target="_blank"
                className="mt-4 inline-block rounded-xl bg-green-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-green-500"
              >
                📍 Como chegar pelo Google Maps
              </a>
            </div>
          )}
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

        <footer className="mt-16 rounded-3xl bg-emerald-950/90 p-8 text-white shadow-2xl backdrop-blur-sm">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-4 text-xl font-bold">Parque Mundo Novo</h3>

              <p className="text-white/85">
                Parque ecológico localizado em Urubici, na Serra Catarinense.
              </p>

              <p className="mt-3 text-white/85">
                ⭐ 4,5/5 no Google • +1.600 avaliações
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-xl font-bold">Contato</h3>

              <p>📍 SC-110 KM 34 - Urubici/SC</p>

              <p className="mt-2">📧 contato@parquemundonovosc.com.br</p>

              <p className="mt-2">🕒 Todos os dias das 08h às 18h</p>

              <a
                href={linkMaps}
                target="_blank"
                className="mt-4 inline-block rounded-xl bg-green-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-green-500"
              >
                📍 Como chegar
              </a>
            </div>

            <div>
              <h3 className="mb-4 text-xl font-bold">Redes Sociais</h3>

              <a
                href="https://www.instagram.com/parquemundonovo"
                target="_blank"
                className="block hover:text-green-300"
              >
                📸 Instagram
              </a>

              <a
                href="https://www.facebook.com"
                target="_blank"
                className="mt-2 block hover:text-green-300"
              >
                📘 Facebook
              </a>
            </div>
          </div>

          <hr className="my-6 border-white/20" />

          <div className="text-center text-sm text-white/80">
            <p>© 2026 Parque Mundo Novo - Todos os direitos reservados</p>

            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <a href="/politica-privacidade" className="underline">
                Política de Privacidade
              </a>

              <a href="/termos-de-uso" className="underline">
                Termos de Uso
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}