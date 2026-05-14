"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { criarPedido } from "@/lib/pedidos";

export default function CampingPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [diarias, setDiarias] = useState(1);
  const [quantidadePessoas, setQuantidadePessoas] = useState(1);
  const [salvando, setSalvando] = useState(false);

  const valorPrimeiraDiaria = 100;
  const valorDemaisDiarias = 80;

  const valorPorPessoa = useMemo(() => {
    if (diarias <= 1) return valorPrimeiraDiaria;
    return valorPrimeiraDiaria + (diarias - 1) * valorDemaisDiarias;
  }, [diarias]);

  const valorTotal = useMemo(() => {
    return valorPorPessoa * quantidadePessoas;
  }, [valorPorPessoa, quantidadePessoas]);

  async function continuarParaResumo() {
    if (!nome || !cpf || !telefone || !email || !dataEntrada) {
      alert("Preencha todos os campos antes de continuar.");
      return;
    }

    try {
      setSalvando(true);

      const pedidoId = await criarPedido({
        produto: "Camping",
        tipo: "camping",
        nome,
        cpf,
        telefone,
        email,
        dataEntrada,
        noites: diarias,
        quantidadePessoas,
        quantidade: 1,
        valorUnitario: valorPorPessoa,
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
        produto: "Camping",
        tipo: "camping",
        nome,
        cpf,
        telefone,
        email,
        dataEntrada,
        diarias: String(diarias),
        noites: String(diarias),
        quantidadePessoas: String(quantidadePessoas),
        quantidade: "1",
        valorUnitario: String(valorPorPessoa),
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
                  fontSize: "clamp(32px, 4.4vw, 56px)",
                  lineHeight: 1.1,
                  fontWeight: "bold",
                  color: "#ffffff",
                  margin: "0 0 16px 0",
                }}
              >
                Camping
              </h1>

              <p
                style={{
                  fontSize: "clamp(18px, 2vw, 22px)",
                  color: "#f3f4f6",
                  lineHeight: 1.5,
                  margin: "0 0 10px 0",
                }}
              >
                Preencha os dados abaixo para simular a reserva do camping do Parque Mundo Novo.
              </p>

              <p
                style={{
                  fontSize: "15px",
                  color: "#d1d5db",
                  margin: 0,
                }}
              >
                O QR Code da reserva será gerado somente após a confirmação do pagamento.
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
                marginBottom: "12px",
              }}
            >
              Dados da reserva
            </h2>

            <div
              style={{
                backgroundColor: "#f9fafb",
                color: "#374151",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "20px",
                lineHeight: 1.6,
              }}
            >
              Incluso: ingresso 24h por pessoa, banheiro com chuveiro quente,
              área de churrasqueira, acesso às áreas inclusas na entrada do
              parque e carregador para carro elétrico.
            </div>

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
                <label style={labelStyle}>Data de entrada</label>
                <input
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Quantidade de pessoas</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantidadePessoas((q) => Math.max(1, q - 1))
                    }
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
                    {quantidadePessoas}
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuantidadePessoas((q) => q + 1)}
                    style={contadorButtonStyle}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Quantidade de diárias (24h)</label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setDiarias((q) => Math.max(1, q - 1))}
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
                    {diarias}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDiarias((q) => q + 1)}
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
                <strong>Produto:</strong> Camping
              </p>
              <p>
                <strong>Data de entrada:</strong> {dataEntrada || "Não informada"}
              </p>
              <p>
                <strong>Pessoas:</strong> {quantidadePessoas}
              </p>
              <p>
                <strong>Diárias:</strong> {diarias}
              </p>
              <p>
                <strong>Valor por pessoa:</strong> R$ {valorPorPessoa},00
              </p>
              <p>
                <strong>Regra:</strong> 1ª diária R$ 100,00 + demais R$ 80,00
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
              A reserva só será liberada após o pagamento ser confirmado.
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