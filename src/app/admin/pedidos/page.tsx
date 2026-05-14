"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Pedido = {
  id: string;
  produto?: string;
  tipo?: string;
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  dataVisita?: string;
  dataEntrada?: string;
  noites?: number;
  quantidadePessoas?: number;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;

  statusPagamento?: string;
  statusOperacional?: string;

  pagbankCheckoutId?: string;
  pagbankReferenceId?: string;
  pagbankPayUrl?: string;
  pagbankStatus?: string;

  codigoIngresso?: string;
  qrCodeIngresso?: string;

  createdAt?: string;
  updatedAt?: string;
};

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtroProduto, setFiltroProduto] = useState("todos");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [filtroOperacional, setFiltroOperacional] = useState("todos");
  const [filtroData, setFiltroData] = useState("");

  useEffect(() => {
    async function carregarPedidos() {
      try {
        const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const lista: Pedido[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPedidos(lista);
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        alert("Não foi possível carregar os pedidos.");
      } finally {
        setCarregando(false);
      }
    }

    carregarPedidos();
  }, []);

  const produtosUnicos = useMemo(() => {
    const lista = pedidos
      .map((pedido) => pedido.produto)
      .filter((produto): produto is string => Boolean(produto));

    return [...new Set(lista)];
  }, [pedidos]);

  const statusPagamentoUnicos = useMemo(() => {
    const lista = pedidos
      .map((pedido) => pedido.statusPagamento)
      .filter((status): status is string => Boolean(status));

    return [...new Set(lista)];
  }, [pedidos]);

  const statusOperacionalUnicos = useMemo(() => {
    const lista = pedidos
      .map((pedido) => pedido.statusOperacional)
      .filter((status): status is string => Boolean(status));

    return [...new Set(lista)];
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      const produtoOk =
        filtroProduto === "todos" || pedido.produto === filtroProduto;

      const pagamentoOk =
        filtroPagamento === "todos" ||
        pedido.statusPagamento === filtroPagamento;

      const operacionalOk =
        filtroOperacional === "todos" ||
        pedido.statusOperacional === filtroOperacional;

      const dataPedido = pedido.dataEntrada || pedido.dataVisita || "";
      const dataOk = !filtroData || dataPedido === filtroData;

      return produtoOk && pagamentoOk && operacionalOk && dataOk;
    });
  }, [pedidos, filtroProduto, filtroPagamento, filtroOperacional, filtroData]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #edf7ed, #ffffff)",
        padding: "34px 20px 50px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
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
                Painel de Pedidos
              </h1>

              <p
                style={{
                  fontSize: "clamp(18px, 2vw, 22px)",
                  color: "#f3f4f6",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Visualize e filtre os pedidos salvos no Firestore.
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            border: "1px solid #dbe5db",
            marginBottom: "24px",
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
            Filtros
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "16px",
            }}
          >
            <div>
              <label style={labelStyle}>Filtrar por produto</label>
              <select
                value={filtroProduto}
                onChange={(e) => setFiltroProduto(e.target.value)}
                style={selectStyle}
              >
                <option value="todos">Todos</option>
                {produtosUnicos.map((produto) => (
                  <option key={produto} value={produto}>
                    {produto}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status do pagamento</label>
              <select
                value={filtroPagamento}
                onChange={(e) => setFiltroPagamento(e.target.value)}
                style={selectStyle}
              >
                <option value="todos">Todos</option>
                {statusPagamentoUnicos.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status operacional</label>
              <select
                value={filtroOperacional}
                onChange={(e) => setFiltroOperacional(e.target.value)}
                style={selectStyle}
              >
                <option value="todos">Todos</option>
                {statusOperacionalUnicos.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Filtrar por data</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => {
                setFiltroProduto("todos");
                setFiltroPagamento("todos");
                setFiltroOperacional("todos");
                setFiltroData("");
              }}
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "#e5e7eb",
                color: "#111827",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Limpar filtros
            </button>
          </div>
        </section>

        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            border: "1px solid #dbe5db",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#166534",
                margin: 0,
              }}
            >
              Lista de pedidos
            </h2>

            <div
              style={{
                fontSize: "15px",
                color: "#4b5563",
                fontWeight: 600,
              }}
            >
              Total filtrado: {pedidosFiltrados.length}
            </div>
          </div>

          {carregando ? (
            <p style={{ color: "#4b5563" }}>Carregando pedidos...</p>
          ) : pedidosFiltrados.length === 0 ? (
            <p style={{ color: "#4b5563" }}>
              Nenhum pedido encontrado para os filtros selecionados.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1280px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6" }}>
                    <th style={thStyle}>Produto</th>
                    <th style={thStyle}>Nome</th>
                    <th style={thStyle}>Data visita</th>
                    <th style={thStyle}>Data entrada</th>
                    <th style={thStyle}>Qtd</th>
                    <th style={thStyle}>Noites</th>
                    <th style={thStyle}>Pessoas</th>
                    <th style={thStyle}>Valor total</th>
                    <th style={thStyle}>Pagamento</th>
                    <th style={thStyle}>Operacional</th>
                    <th style={thStyle}>Código ingresso</th>
                    <th style={thStyle}>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosFiltrados.map((pedido) => (
                    <tr key={pedido.id}>
                      <td style={tdStyle}>{pedido.produto || "-"}</td>
                      <td style={tdStyle}>{pedido.nome || "-"}</td>
                      <td style={tdStyle}>{pedido.dataVisita || "-"}</td>
                      <td style={tdStyle}>{pedido.dataEntrada || "-"}</td>
                      <td style={tdStyle}>{pedido.quantidade ?? "-"}</td>
                      <td style={tdStyle}>{pedido.noites ?? "-"}</td>
                      <td style={tdStyle}>{pedido.quantidadePessoas ?? "-"}</td>
                      <td style={tdStyle}>
                        {pedido.valorTotal !== undefined
                          ? `R$ ${pedido.valorTotal},00`
                          : "-"}
                      </td>
                      <td style={tdStyle}>
                        <span style={statusPagamentoStyle(pedido.statusPagamento || "")}>
                          {pedido.statusPagamento || "-"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={statusOperacionalStyle(pedido.statusOperacional || "")}>
                          {pedido.statusOperacional || "-"}
                        </span>
                      </td>
                      <td style={tdStyle}>{pedido.codigoIngresso || "-"}</td>
                      <td style={tdStyle}>{formatarDataHora(pedido.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatarDataHora(valor?: string) {
  if (!valor) return "-";

  const data = new Date(valor);

  if (isNaN(data.getTime())) return valor;

  return data.toLocaleString("pt-BR");
}

function statusPagamentoStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "capitalize",
  };

  if (status === "pendente") {
    return {
      ...base,
      backgroundColor: "#fef3c7",
      color: "#92400e",
    };
  }

  if (status === "pago") {
    return {
      ...base,
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "em_analise") {
    return {
      ...base,
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (status === "cancelado" || status === "expirado") {
    return {
      ...base,
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    ...base,
    backgroundColor: "#e5e7eb",
    color: "#374151",
  };
}

function statusOperacionalStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "capitalize",
  };

  if (status === "ativo") {
    return {
      ...base,
      backgroundColor: "#ecfccb",
      color: "#3f6212",
    };
  }

  if (status === "utilizado") {
    return {
      ...base,
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "remarcado") {
    return {
      ...base,
      backgroundColor: "#ede9fe",
      color: "#6d28d9",
    };
  }

  if (status === "credito") {
    return {
      ...base,
      backgroundColor: "#fef3c7",
      color: "#92400e",
    };
  }

  if (status === "cancelado") {
    return {
      ...base,
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    ...base,
    backgroundColor: "#e5e7eb",
    color: "#374151",
  };
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
  color: "#374151",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: "16px",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: "16px",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #d1d5db",
  color: "#111827",
  fontSize: "14px",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#374151",
  fontSize: "14px",
};