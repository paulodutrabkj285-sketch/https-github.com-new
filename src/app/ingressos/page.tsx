"use client";

import { useRouter } from "next/navigation";

export default function IngressosPage() {
  const router = useRouter();

  const cards = [
    {
      titulo: "Ingresso Parque",
      descricao: "Entrada para visitar o parque na data escolhida.",
      preco: "R$ 60,00",
      rota: "/ingressos/parque",
    },
    {
      titulo: "Meia Entrada Idoso",
      descricao: "Ingresso com valor reduzido para idosos, com comprovação na entrada.",
      preco: "R$ 30,00",
      rota: "/ingressos/idoso",
    },
    {
      titulo: "Camping",
      descricao: "Hospedagem no camping do parque. 1ª diária por pessoa com valor integral.",
      preco: "R$ 100,00",
      rota: "/ingressos/camping",
    },
    {
      titulo: "Elevador Panorâmico",
      descricao: "Experiência vendida separadamente com possibilidade de remarcação.",
      preco: "R$ 75,00",
      rota: "/ingressos/elevador",
    },
  ];

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl rounded-3xl bg-[#5f7f61] p-6 text-white shadow-lg sm:p-8 lg:p-10">
        <img
          src="/logo-final.png"
          alt="Parque Mundo Novo"
          className="mb-5 w-24 rounded-2xl sm:w-32 lg:w-36"
        />

        <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
          Parque Mundo Novo
        </h1>

        <p className="mt-3 text-base sm:text-xl">
          Compre seu ingresso online com praticidade.
        </p>
      </section>

      <section className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item, index) => (
          <div
            key={index}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-md"
          >
            <h2 className="text-2xl font-bold text-[#1f6b38]">
              {item.titulo}
            </h2>

            <p className="mt-4 flex-1 text-base leading-relaxed text-gray-700">
              {item.descricao}
            </p>

            <h3 className="mt-6 text-2xl font-bold text-gray-900">
              {item.preco}
            </h3>

            <button
              onClick={() => router.push(item.rota)}
              className="mt-5 w-full rounded-xl bg-[#1f6b38] px-4 py-4 text-base font-bold text-white transition hover:bg-[#18572d]"
            >
              Comprar
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}