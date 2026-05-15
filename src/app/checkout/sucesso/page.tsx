"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SucessoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setPedidoId(params.get("pedidoId") || "");
    setStatus(params.get("status") || "Pagamento aprovado");
  }, []);

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
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#15803d", marginBottom: "20px" }}>
          Compra realizada com sucesso!
        </h1>

        <p>Seu ingresso foi gerado.</p>

        {pedidoId && (
          <p>
            <strong>Pedido:</strong> {pedidoId}
          </p>
        )}

        <p>
          <strong>Status:</strong> {status}
        </p>

        <div
          style={{
            margin: "30px auto",
            width: "220px",
            height: "220px",
            background: "#f3f4f6",
            border: "2px dashed #9ca3af",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
            fontWeight: "bold",
          }}
        >
          QR CODE
        </div>

        <Link
          href="/"
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
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}