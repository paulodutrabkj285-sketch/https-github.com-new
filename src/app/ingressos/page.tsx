"use client";

import { useRouter } from "next/navigation";

export default function IngressosPage() {
  const router = useRouter();

  const cards = [
    {
      titulo: "Ingresso Parque",
      descricao: "Entrada para visitar o parque, trilhas, cachoeiras e mirantes.",
      preco: "R$ 60,00",
      rota: "/ingressos/parque",
      imagem: "/fotos/ingresso-parque.jpg",
    },
    {
      titulo: "Meia Entrada Idoso",
      descricao: "Valor especial mediante documento comprobatório.",
      preco: "R$ 30,00",
      rota: "/ingressos/idoso",
      imagem: "/fotos/idoso-cachoeira.jpg",
    },
    {
      titulo: "Camping",
      descricao: "Hospedagem no camping com estrutura, natureza e tranquilidade.",
      preco: "R$ 100,00",
      rota: "/ingressos/camping",
      imagem: "/fotos/camping.jpg",
    },
    {
      titulo: "Elevador Panorâmico",
      descricao: "Experiência vendida separadamente com vista panorâmica.",
      preco: "R$ 75,00",
      rota: "/ingressos/elevador",
      imagem: "/fotos/elevador.jpg",
    },
  ];

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed px-4 py-8 sm:px-6 lg:px-10"
      style={{
        backgroundImage: "url('/fotos/fundo-geral.jpg')",
      }}
    >
      <div className="min-h-screen rounded-3xl bg-black/20 px-4 py-6">
        <section className="mx-auto max-w-6xl rounded-3xl bg-[#12351f]/90 p-6 text-white shadow-2xl backdrop-blur-sm sm:p-8 lg:p-10">
          <img
            src="/logo-final.png"
            alt="Parque Mundo Novo"
            className="mb-5 w-24 rounded-2xl sm:w-32 lg:w-36"
          />

          <h1 className="text-4xl font-extrabold sm:text-5xl lg:text-6xl">
            Parque Mundo Novo
          </h1>

          <p className="mt-3 text-lg sm:text-2xl">
            Compre seu ingresso online com praticidade e segurança.
          </p>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item) => (
            <div
              key={item.titulo}
              onClick={() => router.push(item.rota)}
              className="group relative flex h-[460px] cursor-pointer overflow-hidden rounded-3xl shadow-2xl"
            >
              <img
                src={item.imagem}
                alt={item.titulo}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />

              <div className="relative z-10 flex h-full w-full flex-col justify-end p-5">
                <h2 className="text-3xl font-extrabold text-white drop-shadow-lg">
                  {item.titulo}
                </h2>

                <p className="mt-3 text-base leading-relaxed text-white drop-shadow-md">
                  {item.descricao}
                </p>

                <h3 className="mt-5 text-3xl font-extrabold text-white drop-shadow-lg">
                  {item.preco}
                </h3>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(item.rota);
                  }}
                  className="mt-5 w-full rounded-xl bg-[#15803d] px-4 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#16a34a]"
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