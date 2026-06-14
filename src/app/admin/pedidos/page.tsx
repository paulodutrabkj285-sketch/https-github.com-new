"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
  statusPagamento?: string;
  statusOperacional?: string;
  codigoIngresso?: string;
  qrCodeIngresso?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminPedidosPage() {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
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
    const textoBusca = busca.trim().toLowerCase();

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

      const buscaOk =
        !textoBusca ||
        (pedido.nome || "").toLowerCase().includes(textoBusca) ||
        (pedido.cpf || "").toLowerCase().includes(textoBusca) ||
        (pedido.email || "").toLowerCase().includes(textoBusca) ||
        (pedido.telefone || "").toLowerCase().includes(textoBusca) ||
        (pedido.codigoIngresso || "").toLowerCase().includes(textoBusca) ||
        (pedido.produto || "").toLowerCase().includes(textoBusca) ||
        (pedido.id || "").toLowerCase().includes(textoBusca);

      return produtoOk && pagamentoOk && operacionalOk && dataOk && buscaOk;
    });
  }, [
    pedidos,
    busca,
    filtroProduto,
    filtroPagamento,
    filtroOperacional,
    filtroData,
  ]);

  function formatarMoeda(valor?: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(valor?: string) {
    if (!valor) return "-";

    const partes = valor.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return new Date(valor).toLocaleDateString("pt-BR");
  }

  function limparFiltros() {
    setBusca("");
    setFiltroProduto("todos");
    setFiltroPagamento("todos");
    setFiltroOperacional("todos");
    setFiltroData("");
  }

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
                Visualize, pesquise e filtre os pedidos salvos no Firestore.
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

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              Buscar por nome, CPF, e-mail, telefone, código PMN ou produto
            </label>

            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Exemplo: Paulo, 12345678900, PMN-12345..."
              style={inputStyle}
            />
          </div>

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
              <label style={labelStyle}>Data da visita/entrada</label>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <button
            onClick={limparFiltros}
            style={{
              marginTop: "18px",
              backgroundColor: "#166534",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "12px 18px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Limpar filtros
          </button>
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
              marginBottom: "18px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontSize: "26px",
                fontWeight: "bold",
                color: "#166534",
                margin: 0,
              }}
            >
              Pedidos encontrados: {pedidosFiltrados.length}
            </h2>

            <p style={{ margin: 0, color: "#64748b", fontWeight: "bold" }}>
              Total geral: {pedidos.length}
            </p>
          </div>

          {carregando ? (
            <p>Carregando pedidos...</p>
          ) : pedidosFiltrados.length === 0 ? (
            <p>Nenhum pedido encontrado com os filtros selecionados.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "980px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9" }}>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle}>Produto</th>
                    <th style={thStyle}>Código</th>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Qtd.</th>
                    <th style={thStyle}>Valor</th>
                    <th style={thStyle}>Pagamento</th>
                    <th style={thStyle}>Operacional</th>
                    <th style={thStyle}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {pedidosFiltrados.map((pedido) => (
                    <tr key={pedido.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={tdStyle}>
                        <strong>{pedido.nome || "-"}</strong>
                        <br />
                        <span style={{ color: "#64748b", fontSize: "13px" }}>
                          {pedido.email || "-"}
                        </span>
                        <br />
                        <span style={{ color: "#64748b", fontSize: "13px" }}>
                          CPF: {pedido.cpf || "-"}
                        </span>
                      </td>

                      <td style={tdStyle}>{pedido.produto || "-"}</td>

                      <td style={tdStyle}>
                        <strong>{pedido.codigoIngresso || "-"}</strong>
                      </td>

                      <td style={tdStyle}>
                        {formatarData(pedido.dataEntrada || pedido.dataVisita)}
                      </td>

                      <td style={tdStyle}>{pedido.quantidade || 0}</td>

                      <td style={tdStyle}>
                        {formatarMoeda(Number(pedido.valorTotal || 0))}
                      </td>

                      <td style={tdStyle}>
                        <StatusBadge tipo="pagamento" status={pedido.statusPagamento} />
                      </td>

                      <td style={tdStyle}>
                        <StatusBadge tipo="operacional" status={pedido.statusOperacional} />
                      </td>

                      <td style={tdStyle}>
                        <button
                          onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
                          style={{
                            backgroundColor: "#166534",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "10px",
                            padding: "10px 14px",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          Ver detalhes
                        </button>
                      </td>
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

function StatusBadge({
  status,
  tipo,
}: {
  status?: string;
  tipo: "pagamento" | "operacional";
}) {
  const valor = status || (tipo === "pagamento" ? "pendente" : "ativo");

  let backgroundColor = "#e2e8f0";
  let color = "#334155";

  if (valor === "pago" || valor === "ativo") {
    backgroundColor = "#dcfce7";
    color = "#166534";
  }

  if (valor === "pendente") {
    backgroundColor = "#fef9c3";
    color = "#854d0e";
  }

  if (valor === "utilizado" || valor === "bloqueado" || valor === "valor_divergente") {
    backgroundColor = "#fee2e2";
    color = "#991b1b";
  }

  return (
    <span
      style={{
        display: "inline-block",
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor,
        color,
        textTransform: "uppercase",
      }}
    >
      {valor}
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: "bold",
  color: "#334155",
  marginBottom: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "16px",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "16px",
  backgroundColor: "#ffffff",
};

const thStyle: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  color: "#334155",
  fontSize: "14px",
  borderBottom: "1px solid #cbd5e1",
};

const tdStyle: React.CSSProperties = {
  padding: "14px",
  verticalAlign: "top",
  color: "#1f2937",
  fontSize: "14px",
};