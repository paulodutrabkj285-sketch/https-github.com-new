"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocsFromServer, onSnapshot, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { classificarAcessoManutencao, quantidadeElevadorNoPedido } from "@/lib/preco-elevador";
import { auth, db } from "@/lib/firebase";
import { documentosPedidosVisiveisNoAdmin, pedidoReembolsado } from "@/lib/pedidos";
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

type AcessoManutencao = {
  id: string; tipo: "pedido" | "reserva"; nome: string; email: string; telefone: string;
  data: string; codigo: string; quantidade: number | null; pagamento: string; operacional: string;
  cortesia: boolean; saldo: number | null; validade: string; motivo: string; pedidoId?: string;
};

export default function AdminPedidosPage() {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState(false);
  const [consultandoManutencao, setConsultandoManutencao] = useState(false);
  const [afetados, setAfetados] = useState<AcessoManutencao[] | null>(null);
  const [erroManutencao, setErroManutencao] = useState("");
  useEffect(() => onAuthStateChanged(auth, (usuario) => {
    setSessao(Boolean(usuario));
    if (!usuario) setAfetados(null);
  }), []);

  async function consultarManutencao() {
    const uid = auth.currentUser?.uid;
    if (!uid || consultandoManutencao) return;
    setConsultandoManutencao(true);
    setErroManutencao("");
    setAfetados(null);
    try {
      // Leitura completa sob demanda: inclui documentos legados sem datas e
      // ingressos anteriores ainda válidos. Não cria listener adicional.
      const [pedidosSnap, reservasSnap] = await Promise.all([
        getDocsFromServer(collection(db, "pedidos")),
        getDocsFromServer(collection(db, "reservas_agencias")),
      ]);
      const pedidosPorId = new Map(pedidosSnap.docs.map(d => [d.id, d.data()]));
      const idsReservas = new Set(reservasSnap.docs.filter(d => quantidadeElevadorNoPedido(d.data()) !== 0).map(d => d.id));
      const pedidosVinculados = new Set(reservasSnap.docs.filter(d => idsReservas.has(d.id)).map(d => String(d.data().pedidoId || "")).filter(Boolean));
      const resultado: AcessoManutencao[] = [];
      for (const d of pedidosSnap.docs) {
        const p = d.data();
        const analise = classificarAcessoManutencao(p);
        if (!analise || idsReservas.has(String(p.reservaAgenciaId || "")) || pedidosVinculados.has(d.id)) continue;
        resultado.push({
          id: d.id, tipo: "pedido", nome: String(p.nome || "-"), email: String(p.email || ""), telefone: String(p.telefone || ""),
          data: analise.visita, codigo: String(p.codigoIngressoElevador || p.qrCodeIngressoElevador || p.codigoIngresso || "-"),
          quantidade: analise.quantidade, saldo: analise.saldo, validade: analise.validade, motivo: analise.motivo,
          pagamento: String(p.statusPagamento || "pendente"), operacional: String(p.statusOperacional || "ativo"),
          cortesia: p.cortesia === true,
        });
      }
      for (const d of reservasSnap.docs) {
        const r = d.data();
        const quantidade = quantidadeElevadorNoPedido(r);
        if (quantidade === 0) continue;
        const pedidoId = String(r.pedidoId || "");
        const p = pedidosPorId.get(pedidoId);
        const pagamento = String(p?.statusPagamento === "reembolsado" || r.statusPagamento === "reembolsado" ? "reembolsado" : p?.statusPagamento || r.statusPagamento || "pendente");
        const analise = classificarAcessoManutencao({ ...r, statusPagamento: pagamento }, true);
        if (!analise) continue;
        // Uma reserva e seu pedido de pagamento representam o mesmo grupo.
        resultado.push({
          id: d.id, tipo: "reserva", nome: String(r.agenciaNome || r.agenciaResponsavel || "-"),
          email: String(r.agenciaEmail || p?.email || ""), telefone: String(r.agenciaWhatsapp || p?.telefone || ""),
          data: analise.visita, codigo: String(r.codigoGrupo || "-"), quantidade: analise.quantidade,
          saldo: analise.saldo, validade: analise.validade, motivo: analise.motivo, pagamento,
          operacional: String(r.statusOperacional || "reservado"), cortesia: p?.cortesia === true, pedidoId: pedidoId || undefined,
        });
      }
      if (auth.currentUser?.uid === uid) setAfetados(resultado.sort((a,b) => a.data.localeCompare(b.data)));
    } catch (error) {
      console.error("Consulta manutenção:", error);
      setErroManutencao("Não foi possível consultar todos os registros. Confira a conexão e as permissões e tente novamente. Nenhum resultado parcial foi exibido.");
    } finally {
      setConsultandoManutencao(false);
    }
  }

  const pagosAfetados = (afetados || []).filter(p => p.pagamento === "pago" && !p.cortesia && ["agendado", "validade_aberta"].includes(p.motivo));
  const quantidadePagaConhecida = pagosAfetados.reduce((soma, p) => soma + (p.saldo ?? 0), 0);
  const [filtroManutencao, setFiltroManutencao] = useState("todos");
  const registrosExibidos = (afetados || []).filter(p => filtroManutencao === "todos" ||
    (filtroManutencao === "revisar" ? p.motivo.startsWith("revisar") : p.motivo === filtroManutencao));
  const nomesMotivo: Record<string, string> = {
    agendado: "Agendado a partir de 12/12", validade_aberta: "Data anterior / validade aberta",
    revisar_validade: "Conferir validade", revisar_bloqueio: "Conferir bloqueio/cancelamento",
  };

  const [busca, setBusca] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("todos");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [filtroOperacional, setFiltroOperacional] = useState("todos");
  const [filtroData, setFiltroData] = useState("");

  useEffect(() => {
    const consulta = query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
    return onSnapshot(consulta, (snapshot) => {
      const lista = documentosPedidosVisiveisNoAdmin(snapshot).map((doc) => {
        const pedido: Pedido = { ...doc.data(), id: doc.id };
        return pedidoReembolsado(pedido) ? { ...pedido, statusOperacional: "bloqueado" } : pedido;
      });
      setPedidos(lista);
      setCarregando(false);
    }, (error) => {
      console.error("Erro ao carregar pedidos:", error);
      alert("Não foi possível carregar os pedidos.");
      setCarregando(false);
    });
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

        {sessao && (
          <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm sm:p-6">
            <h2 className="text-xl font-black">Manutenção do Elevador — acessos possíveis a partir de 12/12/2026</h2>
            <p className="mt-2 text-sm">Consulte todos os ingressos e reservas com saldo no elevador, inclusive compras anteriores ainda válidas, combos e casos antigos que exigem conferência. Nenhum pedido será alterado.</p>
            <button type="button" disabled={consultandoManutencao} onClick={consultarManutencao}
              className="mt-4 rounded-xl bg-amber-800 px-4 py-3 font-bold text-white disabled:opacity-50">
              {consultandoManutencao ? "Consultando Firestore..." : "Consultar ingressos e reservas afetados"}
            </button>
            {erroManutencao && <p role="alert" className="mt-3 font-bold text-red-800">{erroManutencao}</p>}
            {afetados !== null && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold">Pagos no período / validade aberta</p><p className="text-2xl font-black">{pagosAfetados.length}</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold">Saldo pago conhecido no período</p><p className="text-2xl font-black">{quantidadePagaConhecida}</p>{pagosAfetados.some(p => p.saldo === null) && <p className="text-xs">Há registros sem quantidade informada.</p>}</div>
                  <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold">Outros registros / revisar</p><p className="text-2xl font-black">{afetados.length - pagosAfetados.length}</p></div>
                </div>
                <p className="text-xs">A validade é estimada em seis meses da compra, ou da visita para reservas e pedidos legados sem data de compra. O validador exclusivo não confere a validade; por isso casos antigos ou sem data aparecem para revisão. Ingressos totalmente usados e reembolsados são excluídos. A consulta lê as duas coleções completas somente quando solicitada.</p>
                <label className="block text-sm font-bold">Exibir
                  <select value={filtroManutencao} onChange={e => setFiltroManutencao(e.target.value)} className="ml-2 rounded-lg border bg-white p-2">
                    <option value="todos">Todos</option><option value="agendado">Agendados a partir de 12/12</option>
                    <option value="validade_aberta">Validade aberta</option><option value="revisar">Casos para revisar</option>
                  </select>
                </label>
                {registrosExibidos.length === 0 ? <p className="font-semibold">Nenhum registro encontrado neste filtro.</p> : (
                  <div className="overflow-x-auto rounded-xl bg-white">
                    <table className="w-full min-w-[800px] text-left text-sm text-gray-900">
                      <thead className="bg-amber-100"><tr>{["Visita", "Validade estimada", "Cliente / agência", "Código", "Saldo / comprado", "Pagamento", "Operacional", "Situação"].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead>
                      <tbody>{registrosExibidos.map(p => <tr key={p.tipo + p.id} className="border-b border-gray-200">
                        <td className="p-3 whitespace-nowrap">{formatarData(p.data)}</td>
                        <td className="p-3 whitespace-nowrap">{formatarData(p.validade)}</td>
                        <td className="p-3"><strong>{p.nome}</strong><div>{p.telefone}</div><div>{p.email}</div></td>
                        <td className="p-3 font-bold">{p.codigo}</td>
                        <td className="p-3">{p.saldo ?? "Conferir"} / {p.quantidade ?? "?"}</td>
                        <td className="p-3">{p.cortesia ? "Cortesia" : p.pagamento}</td>
                        <td className="p-3">{p.operacional}</td>
                        <td className="p-3">{nomesMotivo[p.motivo]}<div className="text-xs text-gray-600">{p.tipo === "reserva" ? "Agência / guia" : "Pedido"}</div></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

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

  if (valor === "utilizado" || valor === "bloqueado" || valor === "valor_divergente" || valor === "reembolsado") {
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