"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResumoPage() {
  const [dados, setDados] = useState({
    pedidoId: "",
    produto: "",
    nome: "",
    cpf: "",
    telefone: "",
    email: "",
    dataVisita: "",
    dataEntrada: "",
    quantidade: "1",
    noites: "",
    quantidadePessoas: "",
    valorUnitario: "0",
    valorTotal: "0",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setDados({
      pedidoId: params.get("pedidoId") || "",
      produto: params.get("produto") || "",
      nome: params.get("nome") || "",
      cpf: params.get("cpf") || "",
      telefone: params.get("telefone") || "",
      email: params.get("email") || "",
      dataVisita: params.get("dataVisita") || "",
      dataEntrada: params.get("dataEntrada") || "",
      quantidade: params.get("quantidade") || "1",
      noites: params.get("noites") || params.get("diarias") || "",
      quantidadePessoas: params.get("quantidadePessoas") || "",
      valorUnitario: params.get("valorUnitario") || "0",
      valorTotal: params.get("valorTotal") || "0",
    });
  }, []);

  const queryPagamento = new URLSearchParams({
    pedidoId: dados.pedidoId,
    produto: dados.produto,
    nome: dados.nome,
    cpf: dados.cpf,
    telefone: dados.telefone,
    email: dados.email,
    valorTotal: dados.valorTotal,
    quantidade: dados.quantidade,
  }).toString();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #edf7ed, #ffffff)",
        padding: "34px 20px 50px",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #5a7a60, #4f6f57)",
            borderRadius: "28px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(32px, 4.4vw, 56px)",
              fontWeight: "bold",
              color: "#ffffff",
              margin: "0 0 12px 0",
            }}
          >
            Resumo do pedido
          </h1>

          <p style={{ color: "#f3f4f6", fontSize: "20px", margin: 0 }}>
            Confira os dados antes de continuar para o pagamento.
          </p>
        </section>

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            border: "1px solid #dbe5db",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#166534",
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            Dados da compra
          </h2>

          <div style={{ display: "grid", gap: "12px", color: "#374151" }}>
            <p><strong>Pedido:</strong> {dados.pedidoId || "-"}</p>
            <p><strong>Produto:</strong> {dados.produto || "-"}</p>
            <p><strong>Nome:</strong> {dados.nome || "-"}</p>
            <p><strong>CPF:</strong> {dados.cpf || "-"}</p>
            <p><strong>Telefone:</strong> {dados.telefone || "-"}</p>
            <p><strong>E-mail:</strong> {dados.email || "-"}</p>

            {dados.dataVisita && (
              <p><strong>Data da visita:</strong> {dados.dataVisita}</p>
            )}

            {dados.dataEntrada && (
              <p><strong>Data de entrada:</strong> {dados.dataEntrada}</p>
            )}

            <p><strong>Quantidade:</strong> {dados.quantidade}</p>

            {dados.noites && (
              <p><strong>Noites/diárias:</strong> {dados.noites}</p>
            )}

            {dados.quantidadePessoas && (
              <p><strong>Pessoas:</strong> {dados.quantidadePessoas}</p>
            )}
          </div>

          <hr style={{ margin: "22px 0", borderColor: "#e5e7eb" }} />

          <p
            style={{
              fontSize: "30px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "24px",
            }}
          >
            Total: R$ {Number(dados.valorTotal).toFixed(2).replace(".", ",")}
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <Link
              href="/ingressos"
              style={{
                padding: "14px 20px",
                borderRadius: "14px",
                textDecoration: "none",
                backgroundColor: "#e5e7eb",
                color: "#111827",
                fontWeight: "bold",
              }}
            >
              Voltar
            </Link>

            <Link
              href={`/checkout/pagamento?${queryPagamento}`}
              style={{
                padding: "14px 20px",
                borderRadius: "14px",
                textDecoration: "none",
                backgroundColor: "#15803d",
                color: "#ffffff",
                fontWeight: "bold",
              }}
            >
              Ir para pagamento
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}