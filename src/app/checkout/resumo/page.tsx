"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ResumoPage() {
  const searchParams = useSearchParams();

  const pedidoId = searchParams.get("pedidoId") || "";
  const produto = searchParams.get("produto") || "";
  const tipo = searchParams.get("tipo") || "";
  const nome = searchParams.get("nome") || "";
  const cpf = searchParams.get("cpf") || "";
  const telefone = searchParams.get("telefone") || "";
  const email = searchParams.get("email") || "";
  const dataVisita = searchParams.get("dataVisita") || "";
  const dataEntrada = searchParams.get("dataEntrada") || "";
  const quantidade = searchParams.get("quantidade") || "1";
  const quantidadePessoas = searchParams.get("quantidadePessoas") || "";
  const diarias = searchParams.get("diarias") || searchParams.get("noites") || "";
  const valorUnitario = searchParams.get("valorUnitario") || "0";
  const valorTotal = searchParams.get("valorTotal") || "0";

  const isCamping = tipo === "camping";

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
                Resumo do Pedido
              </h1>

              <p
                style={{
                  fontSize: "clamp(18px, 2vw, 22px)",
                  color: "#f3f4f6",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Confira os dados antes de seguir para o pagamento.
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
              marginBottom: "20px",
            }}
          >
            Dados da compra
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <Info label="ID do pedido" value={pedidoId} />
            <Info label="Produto" value={produto} />
            <Info label="Tipo" value={tipo} />
            <Info label="Nome" value={nome} />
            <Info label="CPF" value={cpf} />
            <Info label="Telefone" value={telefone} />
            <Info label="E-mail" value={email} />

            {isCamping ? (
              <>
                <Info label="Data de entrada" value={dataEntrada} />
                <Info label="Quantidade de pessoas" value={quantidadePessoas} />
                <Info label="Diárias" value={diarias} />
                <Info label="Valor por pessoa" value={`R$ ${valorUnitario},00`} />
                <Info label="Valor total" value={`R$ ${valorTotal},00`} />
                <Info label="Regra" value="1ª diária R$ 100 + demais R$ 80" />
              </>
            ) : (
              <>
                <Info label="Data da visita" value={dataVisita} />
                <Info label="Quantidade" value={quantidade} />
                <Info label="Valor unitário" value={`R$ ${valorUnitario},00`} />
                <Info label="Valor total" value={`R$ ${valorTotal},00`} />
              </>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={voltarParaPagina(tipo)}
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
              href={`/checkout/pagamento?pedidoId=${pedidoId}`}
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

function voltarParaPagina(tipo: string) {
  if (tipo === "ingresso") return "/ingressos/parque";
  if (tipo === "idoso") return "/ingressos/idoso";
  if (tipo === "elevador") return "/ingressos/elevador";
  if (tipo === "camping") return "/ingressos/camping";
  return "/ingressos";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#6b7280",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "#111827",
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}