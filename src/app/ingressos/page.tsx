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
    <main style={{ background: "#eef3ed", minHeight: "100vh", padding: "20px", fontFamily: "Arial" }}>
      <div style={{ background: "#5f7f61", borderRadius: "30px", padding: "30px", color: "white", marginBottom: "30px" }}>
        <img
          src="/logo-final.png"
          alt="Parque Mundo Novo"
          style={{ width: "140px", borderRadius: "20px", marginBottom: "20px" }}
        />

        <h1 style={{ fontSize: "48px", marginBottom: "10px" }}>
          Parque Mundo Novo
        </h1>

        <p style={{ fontSize: "22px" }}>
          Compre seu ingresso online com praticidade.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
        {cards.map((item, index) => (
          <div key={index} style={{ background: "white", borderRadius: "20px", padding: "25px", boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}>
            <h2 style={{ color: "#1f6b38", marginBottom: "15px", fontSize: "32px" }}>
              {item.titulo}
            </h2>

            <p style={{ color: "#333", lineHeight: "1.6", minHeight: "120px" }}>
              {item.descricao}
            </p>

            <h3 style={{ marginTop: "20px", fontSize: "32px" }}>
              {item.preco}
            </h3>

            <button
              onClick={() => router.push(item.rota)}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "15px",
                borderRadius: "12px",
                border: "none",
                background: "#1f6b38",
                color: "white",
                fontWeight: "bold",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              Comprar
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}