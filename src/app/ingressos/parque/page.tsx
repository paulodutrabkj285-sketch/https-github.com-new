"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { criarPedido } from "@/lib/pedidos";

export default function ParquePage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [dataVisita, setDataVisita] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [salvando, setSalvando] = useState(false);

  const valorUnitario = 60;

  const valorTotal = useMemo(() => {
    return quantidade * valorUnitario;
  }, [quantidade]);

  async function continuarParaResumo() {
    if (!nome || !cpf || !telefone || !email || !dataVisita) {
      alert("Preencha todos os campos antes de continuar.");
      return;
    }

    try {
      setSalvando(true);

      const pedidoId = await criarPedido({
        produto: "Ingresso Parque",
        tipo: "ingresso",
        nome,
        cpf,
        telefone,
        email,
        dataVisita,
        quantidade,
        valorUnitario,
        valorTotal,

        statusPagamento: "pendente",
        statusOperacional: "ativo",

        pagbankCheckoutId: "",
        pagbankReferenceId: "",
        pagbankPayUrl: "",
        pagbankStatus: "",

        codigoIngresso: "",
        qrCodeIngresso: "",
      });

      const params = new URLSearchParams({
        pedidoId,
        produto: "Ingresso Parque",
        tipo: "ingresso",
        nome,
        cpf,
        telefone,
        email,
        dataVisita,
        quantidade: String(quantidade),
        valorUnitario: String(valorUnitario),
        valorTotal: String(valorTotal),
      });

      router.push(`/checkout/resumo?${params.toString()}`);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Não foi possível salvar o pedido. Verifique o Firebase e tente novamente.");
    } finally {
      setSalvando(false);
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
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
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
                  fontSize: "clamp(34px, 5vw, 60px)",
                  lineHeight: 1.1,
                  fontWeight: "bold",
                  color: "#ffffff",
                  margin: "0 0 14px 0",
                }}
              >
                Ingresso Parque
              </h1>

              <p
                style={{
                  fontSize: "clamp(18px, 2vw, 22px)",
                  color: "#f3f4f6",
                  lineHeight: 1.5,
                  margin: "0 0 10px 0",
                }}
              >
                Preencha os dados abaixo para simular a compra do ingresso de entrada do Parque Mundo Novo.
              </p>

              <p
                style={{
                  fontSize: "15px",
                  color: "#d1d5db",
                  margin: 0,
                }}
              >
                O QR Code do ingresso será gerado somente após a confirmação do pagamento.
              </p>
            </div>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              border: "1px solid #dbe5db",
            }}
          >
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#166534",
                marginBottom: "20px",
              }}
            >
              Dados do comprador
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <label style={labelStyle}>Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite seu nome"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Digite seu CPF"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Digite seu telefone"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Data da visita</label>
                <input
                  type="date"
                  value={dataVisita}
                  onChange={(e) => setDataVisita(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Quantidade de ingressos</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                    style={contadorButtonStyle}
                  >
                    -
                  </button>

                  <div
                    style={{
                      minWidth: "60px",
                      textAlign: "center",
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#111827",
                    }}
                  >
                    {quantidade}
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => q + 1)}
                    style={contadorButtonStyle}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              padding: "24px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              border: "1px solid #dbe5db",
              position: "sticky",
              top: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#166534",
                marginBottom: "20px",
              }}
            >
              Resumo
            </h2>

            <div style={{ display: "grid", gap: "12px", color: "#374151" }}>
              <p>
                <strong>Produto:</strong> Ingresso Parque
              </p>
              <p>
                <strong>Valor unitário:</strong> R$ 60,00
              </p>
              <p>
                <strong>Quantidade:</strong> {quantidade}
              </p>
              <p>
                <strong>Data da visita:</strong> {dataVisita || "Não informada"}
              </p>
            </div>

            <hr style={{ margin: "20px 0", borderColor: "#e5e7eb" }} />

            <p
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "20px",
              }}
            >
              Total: R$ {valorTotal},00
            </p>

            <button
              type="button"
              onClick={continuarParaResumo}
              disabled={salvando}
              style={{
                width: "100%",
                padding: "14px 18px",
                border: "none",
                borderRadius: "14px",
                backgroundColor: "#15803d",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: salvando ? "not-allowed" : "pointer",
                opacity: salvando ? 0.7 : 1,
              }}
            >
              {salvando ? "Salvando pedido..." : "Continuar para pagamento"}
            </button>

            <p
              style={{
                marginTop: "14px",
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              O ingresso só será liberado após o pagamento ser confirmado.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: "16px",
  boxSizing: "border-box",
};

const contadorButtonStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#166534",
  color: "#ffffff",
  fontSize: "24px",
  cursor: "pointer",
};