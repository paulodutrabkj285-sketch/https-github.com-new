"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SucessoPage() {
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get("pedidoId") || "";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #edf7ed, #ffffff)",
        padding: "34px 20px 50px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #5a7a60, #4f6f57)",
            borderRadius: "28px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            textAlign: "center",
          }}
        >
          <img
            src="/logo-final.png"
            alt="Logo Parque Mundo Novo"
            style={{
              width: "100%",
              maxWidth: "120px",
              height: "auto",
              display: "block",
              margin: "0 auto 20px",
              borderRadius: "12px",
            }}
          />

          <h1
            style={{
              fontSize: "clamp(32px, 4.4vw, 56px)",
              lineHeight: 1.1,
              fontWeight: "bold",
              color: "#ffffff",
              margin: "0 0 16px 0",
            }}
          >
            Pagamento concluído
          </h1>

          <p
            style={{
              fontSize: "clamp(18px, 2vw, 22px)",
              color: "#f3f4f6",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Quando a integração estiver completa, essa confirmação virá automaticamente do PagBank.
          </p>
        </section>

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            border: "1px solid #dbe5db",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#166534",
              marginTop: 0,
              marginBottom: "18px",
            }}
          >
            Pedido confirmado
          </h2>

          <p
            style={{
              fontSize: "18px",
              color: "#4b5563",
              marginBottom: "10px",
            }}
          >
            ID do pedido:
          </p>

          <p
            style={{
              fontSize: "30px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "24px",
              wordBreak: "break-word",
            }}
          >
            {pedidoId || "-"}
          </p>

          <div
            style={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "18px",
              marginBottom: "24px",
            }}
          >
            <p style={{ color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
              Depois, essa tela vai mostrar automaticamente o código do ingresso e o QR Code gerado somente após o pagamento confirmado.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/ingressos"
              style={{
                padding: "14px 20px",
                borderRadius: "14px",
                textDecoration: "none",
                backgroundColor: "#15803d",
                color: "#ffffff",
                fontWeight: "bold",
              }}
            >
              Voltar para ingressos
            </Link>

            <Link
              href="/admin/pedidos"
              style={{
                padding: "14px 20px",
                borderRadius: "14px",
                textDecoration: "none",
                backgroundColor: "#e5e7eb",
                color: "#111827",
                fontWeight: "bold",
              }}
            >
              Ver pedidos no admin
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}