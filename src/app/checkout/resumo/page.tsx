"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResumoPage() {
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState("0");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setTipo(params.get("tipo") || "");
    setQuantidade(params.get("quantidade") || "1");
    setValor(params.get("valor") || "0");
  }, []);

  const queryPagamento = new URLSearchParams({
    tipo,
    quantidade,
    valor,
  }).toString();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f2f1f",
        color: "#ffffff",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "#ffffff",
          color: "#1f2937",
          borderRadius: "20px",
          padding: "30px",
        }}
      >
        <h1 style={{ color: "#14532d", marginBottom: "20px" }}>
          Resumo da compra
        </h1>

        <p>
          <strong>Ingresso:</strong> {tipo || "Não informado"}
        </p>

        <p>
          <strong>Quantidade:</strong> {quantidade}
        </p>

        <p>
          <strong>Valor:</strong> R$ {valor}
        </p>

        <div style={{ marginTop: "30px" }}>
          <Link
            href={`/checkout/pagamento?${queryPagamento}`}
            style={{
              padding: "14px 20px",
              borderRadius: "14px",
              textDecoration: "none",
              backgroundColor: "#15803d",
              color: "#ffffff",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            Ir para pagamento
          </Link>
        </div>
      </div>
    </main>
  );
}