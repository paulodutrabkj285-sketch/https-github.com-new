"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function PagamentoPage() {
  const searchParams = useSearchParams();
  const [metodo, setMetodo] = useState<"pix" | "cartao" | "">("");
  const [carregando, setCarregando] = useState(false);

  const pedidoId = searchParams.get("pedidoId") || "";
  const produto = searchParams.get("produto") || "";
  const nome = searchParams.get("nome") || "";
  const cpf = searchParams.get("cpf") || "";
  const telefone = searchParams.get("telefone") || "";
  const email = searchParams.get("email") || "";
  const valorTotal = searchParams.get("valorTotal") || "0";
  const quantidade = searchParams.get("quantidade") || "1";

  async function irParaPagBank() {
    if (!metodo) {
      alert("Escolha Pix ou Cartão.");
      return;
    }

    if (!pedidoId) {
      alert("Pedido não encontrado.");
      return;
    }

    try {
      setCarregando(true);

      const resposta = await fetch("/api/pagbank/criar-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pedidoId,
          produto,
          nome,
          cpf,
          telefone,
          email,
          valorTotal,
          quantidade,
          metodo,
        }),
      });

      const data = await resposta.json();

      if (!resposta.ok || !data?.payUrl) {
        console.error(data);
        alert("Não foi possível gerar o checkout do PagBank.");
        return;
      }

      window.location.href = data.payUrl;
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o PagBank.");
    } finally {
      setCarregando(false);
    }
  }

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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: "28px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "22px",
                padding: "10px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "160px",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                style={{
                  width: "100%",
                  maxWidth: "140px",
                  height: "auto",
                  display: "block",
                  borderRadius: "12px",
                }}
              />
            </div>

            <div>
              <h1
                style={{
                  fontSize: "clamp(32px, 4.4vw, 56px)",
                  lineHeight: 1.1,
                  fontWeight: "bold",
                  color: "#ffffff",
                  margin: "0 0 16px 0",
                }}
              >
                Pagamento
              </h1>

              <p
                style={{
                  fontSize: "clamp(18px, 2vw, 22px)",
                  color: "#f3f4f6",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Escolha a forma de pagamento. O QR Code do ingresso só será gerado após a confirmação do pagamento.
              </p>
            </div>
          </div>
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
              marginBottom: "12px",
            }}
          >
            Forma de pagamento
          </h2>

          <p style={{ marginTop: 0, marginBottom: "20px", color: "#4b5563" }}>
            ID do pedido: <strong>{pedidoId || "-"}</strong>
          </p>

          <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
            <button
              type="button"
              onClick={() => setMetodo("pix")}
              style={{
                padding: "18px 20px",
                borderRadius: "16px",
                border: metodo === "pix" ? "2px solid #15803d" : "1px solid #d1d5db",
                backgroundColor: metodo === "pix" ? "#ecfdf3" : "#ffffff",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#111827" }}>
                Pix
              </div>
              <div style={{ marginTop: "6px", color: "#4b5563" }}>
                Pagamento instantâneo via checkout do PagBank.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMetodo("cartao")}
              style={{
                padding: "18px 20px",
                borderRadius: "16px",
                border: metodo === "cartao" ? "2px solid #15803d" : "1px solid #d1d5db",
                backgroundColor: metodo === "cartao" ? "#ecfdf3" : "#ffffff",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#111827" }}>
                Cartão
              </div>
              <div style={{ marginTop: "6px", color: "#4b5563" }}>
                Crédito ou débito via checkout seguro do PagBank.
              </div>
            </button>
          </div>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <Link
              href={`/checkout/resumo?pedidoId=${pedidoId}`}
              style={{
                padding: "14px 20px",
                borderRadius: "14px",
                textDecoration: "none",
                backgroundColor: "#e5e7eb",
                color: "#111827",
                fontWeight: "bold",
              }}
            >
              Voltar ao resumo
            </Link>

            <button
              type="button"
              onClick={irParaPagBank}
              disabled={!metodo || carregando}
              style={{
                padding: "14px 20px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: "#15803d",
                color: "#ffffff",
                fontWeight: "bold",
                cursor: !metodo || carregando ? "not-allowed" : "pointer",
                opacity: !metodo || carregando ? 0.5 : 1,
              }}
            >
              {carregando ? "Gerando checkout..." : "Ir para o PagBank"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}