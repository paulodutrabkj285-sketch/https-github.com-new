"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
  calcularResumoFinanceiro,
  listarPedidosAdmin,
  observarPedidosAdmin,
  pedidoContaComoVenda,
  pedidoReembolsado,
  Pedido,
} from "@/lib/pedidos";

type PeriodoEntradas = "hoje" | "semana";

type CategoriaEntrada =
  | "todos"
  | "parque"
  | "elevador"
  | "camping";

type FiltroStatus =
  | "todos"
  | "pago"
  | "reembolsado"
  | "pendente"
  | "expirado"
  | "bloqueado"
  | "utilizado";

type EntradaRegistro = {
  key: string;
  pedidoId: string;
  nome: string;
  produto: string;
  categoria: Exclude<
    CategoriaEntrada,
    "todos"
  >;
  quantidade: number;
  codigo: string;
  funcionario: string;
  dataEntrada: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [mostrarValores, setMostrarValores] = useState(false);

  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  const [relatorioDia, setRelatorioDia] = useState<ReturnType<typeof gerarVendasDoDia>>();
  const [relatorioMes, setRelatorioMes] = useState<ReturnType<typeof gerarVendasDoMes>>();
  const [preparandoRelatorio, setPreparandoRelatorio] = useState<"dia" | "mês">();
  const [mostrarMaisDias, setMostrarMaisDias] = useState(false);

  useEffect(() => {
    function limparRelatorio() {
      setRelatorioDia(undefined);
      setRelatorioMes(undefined);
    }

    window.addEventListener("afterprint", limparRelatorio);
    return () => window.removeEventListener("afterprint", limparRelatorio);
  }, []);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    periodoEntradas,
    setPeriodoEntradas,
  ] =
    useState<PeriodoEntradas>(
      "hoje"
    );

  const [
    categoriaEntrada,
    setCategoriaEntrada,
  ] =
    useState<CategoriaEntrada>(
      "todos"
    );

  const [
    buscaPedidos,
    setBuscaPedidos,
  ] = useState("");

  const [
    filtroProduto,
    setFiltroProduto,
  ] = useState("todos");

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<FiltroStatus>(
      "todos"
    );

  const [
    dataInicial,
    setDataInicial,
  ] = useState("");

  const [
    dataFinal,
    setDataFinal,
  ] = useState("");

  const [
    limiteHistorico,
    setLimiteHistorico,
  ] = useState(25);

  useEffect(() => {
    return observarPedidosAdmin(
      (pedidosAtuais) => {
        setPedidos(pedidosAtuais.filter(pedido => pedido.testeEfi !== true));
        setCarregando(false);
      },
      (error) => {
        console.error("DASHBOARD: erro ao acompanhar pedidos:", error);
        setCarregando(false);
      }
    );
  }, []);

  useEffect(() => {
    setLimiteHistorico(25);
  }, [
    buscaPedidos,
    filtroProduto,
    filtroStatus,
    dataInicial,
    dataFinal,
  ]);

  const resumo =
    calcularResumoFinanceiro(
      pedidos
    );

  const maximoSituacaoPedidos = Math.max(
    resumo.totalPagos,
    resumo.totalPendentes,
    resumo.totalExpirados || 0,
    1
  );

  const desdeLancamento =
    gerarResumoDesdeLancamento(
      pedidos
    );

  const operacional =
    gerarDashboardOperacional(
      pedidos
    );

  const estatisticas =
    gerarEstatisticasProdutos(
      pedidos
    );

  const faturamentoPorDia =
    gerarFaturamentoPorDia(
      pedidos
    );

  const entradasHoje =
    gerarEntradasHoje(
      pedidos
    );

  const entradasSemana =
    gerarEntradasSemana(
      pedidos
    );

  const entradasPeriodo =
    periodoEntradas === "hoje"
      ? entradasHoje
      : entradasSemana;

  const entradasFiltradas =
    entradasPeriodo.filter(
      (entrada) =>
        categoriaEntrada ===
          "todos"
          ? true
          : entrada.categoria ===
          categoriaEntrada
    );

  const resumoEntradas =
    gerarResumoEntradas(
      entradasPeriodo
    );

  const pedidosFiltrados =
    filtrarPedidosHistorico(
      pedidos,
      {
        busca: buscaPedidos,
        produto:
          filtroProduto,
        status:
          filtroStatus,
        dataInicial,
        dataFinal,
      }
    );

  const pedidosVisiveis =
    pedidosFiltrados.slice(
      0,
      limiteHistorico
    );

  function formatarMoeda(valor: number) {
    const moeda = valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    if (mostrarValores) return moeda;

    return (
      <>
        <span className="print:hidden">R$ ••••••</span>
        <span className="hidden print:inline">{moeda}</span>
      </>
    );
  }

  const dicasFinanceiras = gerarDicasFinanceiras(resumo, desdeLancamento, formatarMoeda);

  function exportarCSV() {
    const cabecalho = [
      "Nome",
      "CPF / Documento",
      "Telefone",
      "Produto",
      "Quantidade",
      "Valor",
      "Pagamento",
      "Status Operacional",
      "Forma Pagamento",
      "Data",
      "Email",
      "Codigo Ingresso",
      "Pedido",
    ];

    const linhas =
      pedidosFiltrados.map(
        (pedido: any) => [
          pedido.nome || "",
          obterDocumentoPedido(
            pedido
          ),
          pedido.telefone ||
          "",
          pedido.produto ||
          "",
          obterQuantidade(
            pedido
          ),
          pedido.valorTotal ||
          "",
          pedido.statusPagamento ||
          "",
          pedidoReembolsado(pedido) ? "bloqueado" : pedido.statusOperacional || "",
          pedido.formaPagamento ||
          "",
          pedido.createdAt
            ? new Date(
              pedido.createdAt
            ).toLocaleString(
              "pt-BR"
            )
            : "",
          pedido.email || "",
          pedido.codigoIngresso ||
          "",
          pedido.id || "",
        ]
      );

    baixarCSV(
      [
        cabecalho.join(";"),
        ...linhas.map(
          (linha) =>
            linha.join(";")
        ),
      ].join("\n"),
      `vendas-parque-${new Date()
        .toLocaleDateString(
          "pt-BR"
        )
        .replace(
          /\//g,
          "-"
        )}.csv`
    );
  }

  function exportarEntradas() {
    const cabecalho = [
      "Cliente",
      "Produto",
      "Quantidade",
      "Codigo",
      "Funcionario",
      "Data Entrada",
    ];

    const linhas =
      entradasFiltradas.map(
        (entrada) => [
          entrada.nome,
          entrada.produto,
          entrada.quantidade,
          entrada.codigo,
          entrada.funcionario,
          entrada.dataEntrada,
        ]
      );

    baixarCSV(
      [
        cabecalho.join(";"),
        ...linhas.map(
          (linha) =>
            linha.join(";")
        ),
      ].join("\n"),
      `entradas-${periodoEntradas}-${categoriaEntrada}.csv`
    );
  }

  function limparFiltrosHistorico() {
    setBuscaPedidos("");
    setFiltroProduto(
      "todos"
    );
    setFiltroStatus(
      "todos"
    );
    setDataInicial("");
    setDataFinal("");
  }

  async function imprimirVendas(periodo: "dia" | "mês") {
    if (preparandoRelatorio) return;
    setPreparandoRelatorio(periodo);
    try {
      const pedidosAtuais = await listarPedidosAdmin({ consultarServidor: true });
      const agora = new Date();
      flushSync(() => {
        setRelatorioDia(periodo === "dia" ? gerarVendasDoDia(pedidosAtuais, agora) : undefined);
        setRelatorioMes(periodo === "mês" ? gerarVendasDoMes(pedidosAtuais, agora) : undefined);
      });
      window.print();
    } catch (error) {
      setRelatorioDia(undefined);
      setRelatorioMes(undefined);
      console.error(`Falha ao gerar o relatório de vendas do ${periodo}:`, error);
      window.alert(`Não foi possível gerar o relatório de vendas do ${periodo}.`);
    } finally {
      setPreparandoRelatorio(undefined);
    }
  }

  return (
    <>
    {relatorioDia && <RelatorioVendasDoDia relatorio={relatorioDia} />}
    {relatorioMes && <RelatorioVendasDoMes relatorio={relatorioMes} />}
    <main className={`min-h-screen bg-[#eef3ed] px-4 py-6 ${relatorioDia || relatorioMes ? "print:hidden" : ""}`}>
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-[#166534]">
              Dashboard Financeiro
            </h1>

            <p className="mt-2 text-gray-600">
              Acompanhamento
              operacional e
              financeiro das vendas
              online.
            </p>
          </div>

          <details className="group w-full md:w-auto md:max-w-[65%]">
            <summary className="ml-auto flex w-full cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-green-800 px-5 py-3 font-bold text-white shadow-md hover:bg-green-900 md:w-fit [&::-webkit-details-marker]:hidden">
              Ações do painel
              <span aria-hidden="true" className="group-open:rotate-180">▼</span>
            </summary>

            <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap md:justify-end">
              <Botao
                texto="Emitir cortesia"
                classe="bg-green-800 hover:bg-green-900"
                onClick={() => router.push("/admin/dashboard/emitir-cortesia")}
              />

              <Botao
                texto="🏢 Agências e Reservas"
                classe="bg-amber-600 hover:bg-amber-700"
                onClick={() =>
                  router.push(
                    "/admin/reservas-agencias"
                  )
                }
              />

              <Botao
                texto="📧 Envio de Ingressos"
                classe="bg-[#166534] hover:bg-green-800"
                onClick={() =>
                  router.push(
                    "/admin/envio-ingressos"
                  )
                }
              />

              <Botao
                texto="📄 Relatório Financeiro"
                classe="bg-green-700 hover:bg-green-800"
                onClick={() =>
                  window.print()
                }
              />

              <Botao
                texto={preparandoRelatorio === "dia" ? "Preparando relatório…" : "📄 Vendas do Dia"}
                classe="bg-blue-700 hover:bg-blue-800"
                onClick={() => imprimirVendas("dia")}
              />

              <Botao
                texto={preparandoRelatorio === "mês" ? "Preparando relatório…" : "📄 Vendas do Mês"}
                classe="bg-purple-700 hover:bg-purple-800"
                onClick={() => imprimirVendas("mês")}
              />

              <Botao
                texto="📋 Exportar Entradas"
                classe="bg-orange-600 hover:bg-orange-700"
                onClick={
                  exportarEntradas
                }
              />

              <Botao
                texto="📊 Exportar Excel"
                classe="bg-emerald-700 hover:bg-emerald-800"
                onClick={exportarCSV}
              />
            </div>
          </details>
        </div>

        <div className="hidden print:block">
          <h1 className="text-3xl font-bold text-[#166534]">
            Relatório
            Financeiro - Parque
            Mundo Novo
          </h1>

          <p className="mt-2 text-gray-600">
            Gerado em{" "}
            {new Date().toLocaleString(
              "pt-BR"
            )}
          </p>
        </div>

        {carregando ? (
          <p className="mt-8">
            Carregando...
          </p>
        ) : (
          <>

            <section className="mt-7 rounded-3xl border border-green-200 bg-gradient-to-br from-green-950 to-green-800 p-5 shadow-xl">

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-green-200">
                  Visão Geral
                </p>
                <button
                  type="button"
                  onClick={() => setMostrarValores((atual) => !atual)}
                  className="inline-flex items-center gap-2 rounded-lg border border-green-200/40 px-3 py-2 text-sm font-semibold text-green-50 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-200 print:hidden"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0">
                    {mostrarValores ? (
                      <>
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3.5-6 10-6 10 6 10 6a17 17 0 0 1-3.3 3.5M15.2 17.6a11 11 0 0 1-3.2.4c-6.5 0-10-6-10-6" />
                        <path d="m3 3 18 18" />
                      </>
                    )}
                  </svg>
                  {mostrarValores ? "Ocultar valores" : "Mostrar valores"}
                </button>
              </div>

              <h2 className="mt-1 text-2xl font-black text-white">
                Desde o lançamento
              </h2>

              <p className="mt-1 text-sm text-green-100/80">
                Somente vendas com
                pagamento confirmado.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">

                <CardDestaque
                  titulo="Total vendido"
                  valor={formatarMoeda(
                    desdeLancamento
                      .totalVendido
                  )}
                  icone="💰"
                />

                <CardDestaque
                  titulo="Pedidos pagos"
                  valor={
                    desdeLancamento
                      .pedidosPagos
                  }
                  icone="✅"
                />

                <CardDestaque
                  titulo="Ingressos vendidos"
                  valor={
                    desdeLancamento
                      .totalIngressos
                  }
                  icone="🎟️"
                />

                <CardDestaque
                  titulo="Ticket médio"
                  valor={formatarMoeda(
                    desdeLancamento
                      .ticketMedio
                  )}
                  icone="💳"
                />

                <CardDestaque
                  titulo="Vendido hoje"
                  valor={formatarMoeda(
                    operacional
                      .receitaHoje
                  )}
                  icone="📈"
                />

              </div>
            </section>

            <section className="mt-6">

              <h2 className="mb-4 text-2xl font-bold text-[#166534]">
                Vendas por categoria
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <CardProduto
                  titulo="Ingresso Parque"
                  icone="🌲"
                  quantidade={
                    desdeLancamento
                      .parque
                      .quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento
                      .parque
                      .receita
                  )}
                />

                <CardProduto
                  titulo="Elevador Panorâmico"
                  icone="🛗"
                  quantidade={
                    desdeLancamento
                      .elevador
                      .quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento
                      .elevador
                      .receita
                  )}
                  destaque
                />

                <CardProduto
                  titulo="Meia Entrada Idoso"
                  icone="👴"
                  quantidade={
                    desdeLancamento
                      .idoso
                      .quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento
                      .idoso
                      .receita
                  )}
                />

                <CardProduto
                  titulo="Camping"
                  icone="🏕️"
                  quantidade={
                    desdeLancamento
                      .camping
                      .quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento
                      .camping
                      .receita
                  )}
                />

              </div>
            </section>

            <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">

              <Card
                titulo="Pedidos registrados"
                valor={
                  resumo.totalPedidos
                }
              />

              <Card
                titulo="Pagos"
                valor={
                  resumo.totalPagos
                }
              />

              <Card
                titulo="Pendentes"
                valor={
                  resumo.totalPendentes
                }
              />

              <Card
                titulo="Expirados"
                valor={
                  (resumo as any)
                    .totalExpirados ||
                  0
                }
              />

            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

              <Card
                titulo="Faturamento bruto"
                valor={formatarMoeda(
                  resumo
                    .faturamentoBruto
                )}
              />

              <Card
                titulo={`Taxas estimadas (${resumo.taxaPercentual}%)`}
                valor={formatarMoeda(
                  resumo.valorTaxas
                )}
              />

              <Card
                titulo="Valor líquido estimado"
                valor={formatarMoeda(
                  resumo
                    .faturamentoLiquido
                )}
              />

            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

              <Card
                titulo="Visitantes Hoje"
                valor={
                  operacional
                    .visitantesHoje
                }
              />

              <Card
                titulo="Visitantes Mês"
                valor={
                  operacional
                    .visitantesMes
                }
              />

              <Card
                titulo="Receita Hoje"
                valor={formatarMoeda(
                  operacional
                    .receitaHoje
                )}
              />

              <Card
                titulo="Receita Mês"
                valor={formatarMoeda(
                  operacional
                    .receitaMes
                )}
              />

              <Card
                titulo="Ticket Médio"
                valor={formatarMoeda(
                  desdeLancamento
                    .ticketMedio
                )}
              />

            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">

              <h2 className="text-2xl font-bold text-[#166534]">
                Assistente Financeiro
              </h2>

              <div className="mt-5 grid gap-3">

                {dicasFinanceiras.map(
                  (
                    dica,
                    index
                  ) => (
                    <div
                      key={index}
                      className="rounded-xl border border-green-100 bg-green-50 p-4 text-gray-700"
                    >
                      {dica}
                    </div>
                  )
                )}

              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">

              <Card
                titulo="Produto mais vendido"
                valor={
                  estatisticas
                    .produtoMaisVendido
                }
              />

              <Card
                titulo="Participação Camping"
                valor={`${estatisticas.percentualCamping}%`}
              />

              <Card
                titulo="Ingressos do Elevador"
                valor={
                  desdeLancamento
                    .elevador
                    .quantidade
                }
              />

            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

              <div className="rounded-2xl bg-white p-5 shadow-md">

                <h2 className="text-2xl font-bold text-[#166534]">
                  Ingressos vendidos
                  por Produto
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Considera somente
                  pagamentos
                  confirmados.
                </p>

                <div className="mt-6 grid gap-4">

                  {estatisticas
                    .produtos
                    .length === 0 ? (
                    <p className="text-gray-500">
                      Ainda não há
                      vendas pagas.
                    </p>
                  ) : (
                    estatisticas
                      .produtos
                      .map(
                        (
                          produto
                        ) => (
                          <div
                            key={
                              produto.nome
                            }
                          >
                            <div className="mb-1 flex justify-between text-sm font-semibold">
                              <span>
                                {
                                  produto.nome
                                }
                              </span>

                              <span>
                                {
                                  produto.quantidade
                                }
                              </span>
                            </div>

                            <div className="h-4 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-[#166534]"
                                style={{
                                  width: `${produto.percentual}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )
                  )}

                </div>
              </div>

              <div className="flex h-[300px] flex-col self-start rounded-2xl bg-white p-5 shadow-md">

                <h2 className="text-2xl font-bold text-[#166534]">
                  Situação dos Pedidos
                </h2>

                <div className="mt-4 grid min-h-0 flex-1 grid-cols-3 gap-2 sm:gap-5">

                  <BarraStatus
                    titulo="Pagos"
                    quantidade={
                      resumo.totalPagos
                    }
                    maximo={maximoSituacaoPedidos}
                    classe="bg-green-600"
                    texto="text-green-700"
                  />

                  <BarraStatus
                    titulo="Pendentes"
                    quantidade={
                      resumo
                        .totalPendentes
                    }
                    maximo={maximoSituacaoPedidos}
                    classe="bg-yellow-500"
                    texto="text-yellow-700"
                  />

                  <BarraStatus
                    titulo="Expirados"
                    quantidade={
                      resumo.totalExpirados || 0
                    }
                    maximo={maximoSituacaoPedidos}
                    classe="bg-orange-500"
                    texto="text-orange-700"
                  />

                </div>
              </div>

            </section>

            <details
              className="group mt-8 rounded-2xl bg-white p-5 shadow-md"
              onToggle={evento => {
                if (!evento.currentTarget.open) setMostrarMaisDias(false);
              }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[#166534] [&::-webkit-details-marker]:hidden">
                <h2 className="text-2xl font-bold">Faturamento por Dia</h2>
                <span aria-hidden="true" className="group-open:rotate-180">▼</span>
              </summary>

              <p className="mt-2 text-sm text-gray-500">
                Somente pagamentos
                confirmados.
              </p>

              <div className="mt-4 grid gap-3">

                {faturamentoPorDia
                  .length === 0 ? (
                  <p className="text-gray-500">
                    Ainda não há
                    vendas pagas
                    suficientes.
                  </p>
                ) : (
                  (mostrarMaisDias ? faturamentoPorDia : faturamentoPorDia.slice(0, 7)).map(
                    (item) => (
                      <div
                        key={
                          item.data
                        }
                      >
                        <div className="mb-1 flex justify-between text-sm font-semibold">
                          <span>
                            {
                              item.data
                            }
                          </span>

                          <span>
                            {formatarMoeda(
                              item.valor
                            )}
                          </span>
                        </div>

                        <div className={`h-3 overflow-hidden rounded-full bg-gray-200 ${mostrarValores ? "" : "hidden print:block"}`}>
                          <div
                            className="h-full rounded-full bg-[#1f6b38]"
                            style={{
                              width: `${item.percentual}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )
                )}

              </div>
              {faturamentoPorDia.length > 7 && (
                <button
                  type="button"
                  className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-[#166534] hover:bg-green-50 print:hidden"
                  onClick={() => setMostrarMaisDias(atual => !atual)}
                >
                  {mostrarMaisDias ? "Mostrar menos" : "Ver mais dias"}
                </button>
              )}
            </details>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <h2 className="text-2xl font-bold text-[#166534]">
                    Controle de
                    Entradas
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Consulte as
                    entradas do dia
                    ou de toda a
                    semana.
                  </p>
                </div>

                <div className="flex gap-2 print:hidden">

                  <Aba
                    ativo={
                      periodoEntradas ===
                      "hoje"
                    }
                    texto="Hoje"
                    onClick={() =>
                      setPeriodoEntradas(
                        "hoje"
                      )
                    }
                  />

                  <Aba
                    ativo={
                      periodoEntradas ===
                      "semana"
                    }
                    texto="Esta semana"
                    onClick={() =>
                      setPeriodoEntradas(
                        "semana"
                      )
                    }
                  />

                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

                <CardEntrada
                  titulo="Total"
                  valor={
                    resumoEntradas
                      .total
                  }
                  icone="👥"
                />

                <CardEntrada
                  titulo="Parque"
                  valor={
                    resumoEntradas
                      .parque
                  }
                  icone="🌲"
                />

                <CardEntrada
                  titulo="Elevador"
                  valor={
                    resumoEntradas
                      .elevador
                  }
                  icone="🛗"
                />

                <CardEntrada
                  titulo="Camping"
                  valor={
                    resumoEntradas
                      .camping
                  }
                  icone="🏕️"
                />

              </div>

              <p className="mt-3 text-xs text-gray-500">
                Parque inclui
                Ingresso Parque e
                Meia Entrada Idoso.
                O Elevador usa a
                validação própria
                do aplicativo do
                elevador.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 print:hidden">

                {(
                  [
                    "todos",
                    "parque",
                    "elevador",
                    "camping",
                  ] as CategoriaEntrada[]
                ).map(
                  (
                    categoria
                  ) => (
                    <Aba
                      key={
                        categoria
                      }
                      ativo={
                        categoriaEntrada ===
                        categoria
                      }
                      texto={
                        categoria ===
                          "todos"
                          ? "Todos"
                          : categoria
                            .charAt(
                              0
                            )
                            .toUpperCase() +
                          categoria.slice(
                            1
                          )
                      }
                      onClick={() =>
                        setCategoriaEntrada(
                          categoria
                        )
                      }
                    />
                  )
                )}

                <button
                  onClick={
                    exportarEntradas
                  }
                  className="ml-auto rounded-xl bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700"
                >
                  Exportar período
                </button>

              </div>

              <div className="mt-5 overflow-x-auto">

                <table className="w-full min-w-[900px] border-collapse text-left">

                  <thead>
                    <tr className="border-b bg-gray-50 text-sm text-gray-600">

                      <th className="p-3">
                        Cliente
                      </th>

                      <th className="p-3">
                        Produto
                      </th>

                      <th className="p-3">
                        Qtd.
                      </th>

                      <th className="p-3">
                        Código
                      </th>

                      <th className="p-3">
                        Funcionário
                      </th>

                      <th className="p-3">
                        Entrada
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {entradasFiltradas
                      .length === 0 ? (
                      <tr>
                        <td
                          className="p-3 text-gray-500"
                          colSpan={6}
                        >
                          Nenhuma
                          entrada
                          encontrada
                          para esse
                          período e
                          filtro.
                        </td>
                      </tr>
                    ) : (
                      entradasFiltradas.map(
                        (
                          entrada
                        ) => (
                          <tr
                            key={
                              entrada.key
                            }
                            className="border-b text-sm"
                          >
                            <td className="p-3 font-semibold">
                              {entrada.nome ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {entrada.produto ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {
                                entrada.quantidade
                              }
                            </td>

                            <td className="p-3">
                              {entrada.codigo ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {entrada.funcionario ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {formatarDataHora(
                                entrada.dataEntrada
                              )}
                            </td>
                          </tr>
                        )
                      )
                    )}

                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                <div>
                  <h2 className="text-2xl font-bold text-[#166534]">
                    Histórico de
                    pedidos
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Busque vendas
                    antigas por
                    nome, CPF,
                    telefone,
                    documento,
                    código do
                    ingresso ou
                    número do
                    pedido.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
                  {
                    pedidosFiltrados.length
                  }{" "}
                  pedido
                  {pedidosFiltrados
                    .length !== 1
                    ? "s"
                    : ""}
                </span>

              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-6 print:hidden">

                <Campo
                  label="Buscar"
                  classe="lg:col-span-2"
                >
                  <input
                    value={
                      buscaPedidos
                    }
                    onChange={(
                      e
                    ) =>
                      setBuscaPedidos(
                        e.target
                          .value
                      )
                    }
                    placeholder="Nome, CPF, telefone, documento, código ou pedido"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-600"
                  />
                </Campo>

                <Campo label="Produto">

                  <select
                    value={
                      filtroProduto
                    }
                    onChange={(
                      e
                    ) =>
                      setFiltroProduto(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none focus:border-green-600"
                  >

                    <option value="todos">
                      Todos
                    </option>

                    <option value="Ingresso Parque">
                      Ingresso Parque
                    </option>

                    <option value="Meia Entrada Idoso">
                      Meia Entrada
                      Idoso
                    </option>

                    <option value="Elevador Panorâmico">
                      Elevador
                      Panorâmico
                    </option>

                    <option value="Camping">
                      Camping
                    </option>

                  </select>
                </Campo>

                <Campo label="Situação">

                  <select
                    value={
                      filtroStatus
                    }
                    onChange={(
                      e
                    ) =>
                      setFiltroStatus(
                        e.target
                          .value as
                        FiltroStatus
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none focus:border-green-600"
                  >

                    <option value="todos">
                      Todos
                    </option>

                    <option value="pago">
                      Pago
                    </option>

                    <option value="reembolsado">
                      Reembolsado
                    </option>

                    <option value="pendente">
                      Pendente
                    </option>

                    <option value="expirado">
                      Expirado
                    </option>

                    <option value="bloqueado">
                      Bloqueado
                    </option>

                    <option value="utilizado">
                      Utilizado
                    </option>

                  </select>
                </Campo>

                <Campo label="Data inicial">

                  <input
                    type="date"
                    value={
                      dataInicial
                    }
                    onChange={(
                      e
                    ) =>
                      setDataInicial(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-green-600"
                  />

                </Campo>

                <Campo label="Data final">

                  <input
                    type="date"
                    value={
                      dataFinal
                    }
                    onChange={(
                      e
                    ) =>
                      setDataFinal(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-green-600"
                  />

                </Campo>

              </div>

              <div className="mt-3 flex flex-wrap gap-2 print:hidden">

                <button
                  onClick={
                    limparFiltrosHistorico
                  }
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Limpar filtros
                </button>

                <button
                  onClick={
                    exportarCSV
                  }
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Exportar resultado
                </button>

              </div>

              <div className="mt-5 overflow-x-auto">

                <table className="w-full min-w-[1350px] border-collapse text-left">

                  <thead>
                    <tr className="border-b bg-gray-50 text-sm text-gray-600">

                      <th className="p-3">
                        Cliente
                      </th>

                      <th className="p-3">
                        Documento
                      </th>

                      <th className="p-3">
                        Telefone
                      </th>

                      <th className="p-3">
                        Produto
                      </th>

                      <th className="p-3">
                        Qtd.
                      </th>

                      <th className="p-3">
                        Valor
                      </th>

                      <th className="p-3">
                        Pagamento
                      </th>

                      <th className="p-3">
                        Operacional
                      </th>

                      <th className="p-3">
                        Data
                      </th>

                      <th className="p-3 print:hidden">
                        Ação
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {pedidosVisiveis
                      .length === 0 ? (
                      <tr>
                        <td
                          className="p-3 text-gray-500"
                          colSpan={10}
                        >
                          Nenhum pedido
                          encontrado com
                          esses filtros.
                        </td>
                      </tr>
                    ) : (
                      pedidosVisiveis.map(
                        (
                          pedido: any
                        ) => (
                          <tr
                            key={
                              pedido.id
                            }
                            className={`border-b text-sm ${(pedidoReembolsado(pedido) || pedido.statusOperacional === "bloqueado")
                              ? "bg-red-50"
                              : ""
                              }`}
                          >

                            <td className="p-3 font-semibold">

                              <div>
                                {pedido.nome ||
                                  "-"}
                              </div>

                              <div className="mt-1 text-xs font-normal text-gray-500">
                                {pedido.codigoIngresso ||
                                  pedido.id ||
                                  ""}
                              </div>

                            </td>

                            <td className="p-3">
                              {obterDocumentoPedido(
                                pedido
                              ) ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {pedido.telefone ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {pedido.produto ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {obterQuantidade(
                                pedido
                              )}
                            </td>

                            <td className="p-3">
                              {formatarMoeda(
                                Number(
                                  pedido.valorTotal ||
                                  0
                                )
                              )}
                            </td>

                            <td className="p-3">
                              <StatusPagamento
                                status={
                                  pedido.statusPagamento ||
                                  "pendente"
                                }
                              />
                            </td>

                            <td className="p-3">
                              <StatusOperacionalPedido
                                pedido={
                                  pedido
                                }
                              />
                            </td>

                            <td className="p-3">
                              {formatarData(
                                pedido.createdAt
                              )}
                            </td>

                            <td className="p-3 print:hidden">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/admin/pedidos/${pedido.id}`
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                              >
                                Abrir pedido
                              </button>
                            </td>

                          </tr>
                        )
                      )
                    )}

                  </tbody>
                </table>
              </div>

              {pedidosFiltrados
                .length >
                limiteHistorico && (
                  <div className="mt-5 flex justify-center print:hidden">
                    <button
                      onClick={() =>
                        setLimiteHistorico(
                          (
                            atual
                          ) =>
                            atual +
                            25
                        )
                      }
                      className="rounded-xl bg-[#166534] px-6 py-3 font-bold text-white hover:bg-green-800"
                    >
                      Mostrar mais
                      pedidos
                    </button>
                  </div>
                )}

              {pedidosFiltrados
                .length > 0 && (
                  <p className="mt-4 text-center text-xs text-gray-500">
                    Exibindo{" "}
                    {Math.min(
                      limiteHistorico,
                      pedidosFiltrados.length
                    )}{" "}
                    de{" "}
                    {
                      pedidosFiltrados.length
                    }{" "}
                    pedido(s).
                  </p>
                )}

            </section>

          </>
        )}

      </div>
    </main>
    </>
  );
}

const produtosVendasDoDia = {
  parque: "Parque",
  elevador: "Elevador",
  idoso: "Meia Entrada Idoso",
  camping: "Camping",
};

type ProdutoVenda = keyof typeof produtosVendasDoDia;
type ItemVenda = { produto: ProdutoVenda | "outro"; quantidade: number; valor: number };

function obterItensVenda(pedido: Pedido): ItemVenda[] {
  const categoria = pedido.tipo === "idoso" || pedido.produto === "Meia Entrada Idoso"
    ? "idoso"
    : pedido.tipo === "carrinho" ? "parque" : categoriaPrincipalDoPedido(pedido);
  const itens = pedido.itensCarrinho?.filter(item => item.quantidade > 0);
  if (itens?.length) {
    return itens.map(item => ({
      produto: item.tipo === "parque" && categoria === "idoso" ? "idoso" : item.tipo,
      quantidade: item.quantidade,
      valor: item.valorTotal,
    }));
  }

  const quantidadeElevador = Number(pedido.quantidadeElevador || pedido.qtdElevador || 0);
  if ((categoria === "parque" || categoria === "idoso") && quantidadeElevador > 0) {
    const quantidadeParque = Number(pedido.quantidadeParque || pedido.quantidade);
    const valorParqueEstimado = Number(pedido.valorParque ?? pedido.valorUnitario * quantidadeParque);
    const valorElevadorEstimado = pedido.valorUnitarioElevador == null
      ? Math.max(0, pedido.valorTotal - valorParqueEstimado)
      : pedido.valorUnitarioElevador * quantidadeElevador;
    const valorElevador = Number(pedido.valorElevador ?? valorElevadorEstimado);
    return [
      { produto: categoria, quantidade: quantidadeParque, valor: Number(pedido.valorParque ?? pedido.valorTotal - valorElevador) },
      { produto: "elevador", quantidade: quantidadeElevador, valor: valorElevador },
    ];
  }

  return [{
    produto: categoria,
    quantidade: categoria === "elevador" && quantidadeElevador ? quantidadeElevador : obterQuantidade(pedido),
    valor: pedido.valorTotal,
  }];
}

const fusoRelatorio = "America/Sao_Paulo";
const formatarDataVenda = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: fusoRelatorio });
const formatarHoraVenda = new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", timeZone: fusoRelatorio });
const moedaRelatorio = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatarValor = (centavos: number) => moedaRelatorio.format(centavos / 100);

function gerarVendasDoDia(pedidos: Pedido[], agora: Date) {
  const data = formatarDataVenda.format(agora);
  return {
    data,
    ...gerarVendasConfirmadas(pedidos, confirmacao => formatarDataVenda.format(confirmacao) === data),
  };
}

function gerarVendasDoMes(pedidos: Pedido[], agora: Date) {
  const formatarMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: fusoRelatorio,
  });
  const mes = formatarMes.format(agora);
  const vendasDoMes = gerarVendasConfirmadas(pedidos, confirmacao =>
    confirmacao <= agora.getTime() && formatarMes.format(confirmacao) === mes
  );
  return { mes, ...vendasDoMes };
}

function gerarVendasConfirmadas(pedidos: Pedido[], noPeriodo: (confirmacao: number) => boolean) {
  const recebimentos = { pix: 0, cartao: 0 };
  const produtos = {
    parque: { quantidade: 0, receita: 0 },
    elevador: { quantidade: 0, receita: 0 },
    idoso: { quantidade: 0, receita: 0 },
    camping: { quantidade: 0, receita: 0 },
  };

  const vendas = pedidos.flatMap((pedido: Pedido & {
    pagamentoConfirmadoEm?: string;
    pagoEm?: string;
    dataPagamento?: string;
  }) => {
    const forma = pedido.formaPagamento;
    if (!pedidoContaComoVenda(pedido) || pedido.cortesia || pedido.testeEfi ||
      (forma !== "pix" && forma !== "cartao")) return [];

    const confirmacao = [pedido.pagamentoConfirmadoEm, pedido.pagoEm, pedido.dataPagamento,
      forma === "pix" ? pedido.pixHorario : undefined]
      .map(valor => Date.parse(valor ?? ""))
      .find(Number.isFinite);
    if (confirmacao === undefined || !noPeriodo(confirmacao)) return [];

    const valorPago = Math.round(Number(pedido.valorPago ?? pedido.valorTotal) * 100);
    const itens = obterItensVenda(pedido);
    const pesos = itens.map(item => Math.max(0, Math.round(item.valor * 100)) || 0);
    const somaPesos = pesos.reduce((soma, peso) => soma + peso, 0);
    recebimentos[forma] += valorPago;

    // Rateia o valor pago pelos preços registrados nos itens, mantendo o total em centavos.
    let pesoAcumulado = 0;
    let receitaAcumulada = 0;
    itens.forEach((item, indice) => {
      pesoAcumulado += somaPesos ? pesos[indice] : 1;
      const receitaAteItem = Math.round(valorPago * pesoAcumulado / (somaPesos || itens.length));
      if (item.produto !== "outro") {
        produtos[item.produto].quantidade += item.quantidade;
        produtos[item.produto].receita += receitaAteItem - receitaAcumulada;
      }
      receitaAcumulada = receitaAteItem;
    });

    return [{
      id: pedido.id,
      confirmacao,
      horario: formatarHoraVenda.format(confirmacao),
      forma: forma === "pix" ? "Pix" : "Cartão",
      valorPago,
      itens: itens.map(item => ({
        nome: item.produto === "outro" ? pedido.produto : produtosVendasDoDia[item.produto],
        quantidade: item.quantidade,
      })),
    }];
  }).sort((a, b) => a.confirmacao - b.confirmacao);

  return { recebimentos, produtos, vendas };
}

function RelatorioVendasDoDia({ relatorio }: { relatorio: ReturnType<typeof gerarVendasDoDia> }) {
  const { data, recebimentos, produtos, vendas } = relatorio;
  const tabela = "w-full table-fixed border-collapse [&_td]:border-b [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:border-b [&_th]:border-gray-500 [&_th]:px-2 [&_th]:py-1 [&_tr]:break-inside-avoid";
  const titulo = "mb-1 text-sm font-bold uppercase break-after-avoid";

  return (
    <article className="hidden text-[10pt] leading-snug text-black print:block">
      <section className="mb-4 break-inside-avoid">
        <h1 className={titulo}>Resumo do dia</h1>
        <dl className="grid grid-cols-5 gap-x-3">
          <div><dt>Data</dt><dd className="font-semibold">{data}</dd></div>
          <div><dt>Total vendido</dt><dd className="font-semibold">{formatarValor(recebimentos.pix + recebimentos.cartao)}</dd></div>
          <div><dt>Pedidos pagos</dt><dd className="font-semibold">{vendas.length}</dd></div>
          <div><dt>Recebido via Pix</dt><dd className="font-semibold">{formatarValor(recebimentos.pix)}</dd></div>
          <div><dt>Recebido via cartão</dt><dd className="font-semibold">{formatarValor(recebimentos.cartao)}</dd></div>
        </dl>
      </section>

      <section className="mb-4 break-inside-avoid">
        <h2 className={titulo}>Vendas por produto</h2>
        <table className={tabela}>
          <thead>
            <tr><th className="w-1/2 text-left">Produto</th><th className="text-right">Quantidade vendida</th><th className="text-right">Receita</th></tr>
          </thead>
          <tbody>
            {(Object.keys(produtos) as ProdutoVenda[]).map(produto => (
              <tr key={produto}>
                <td>{produtosVendasDoDia[produto]}</td>
                <td className="text-right">{produtos[produto].quantidade}</td>
                <td className="text-right">{formatarValor(produtos[produto].receita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className={titulo}>Detalhamento das vendas do dia</h2>
        <table className={tabela}>
          <thead>
            <tr>
              <th className="w-[13%] text-left">Horário</th>
              <th className="w-[25%] text-left">Pedido ID</th>
              <th className="w-[25%] text-left">Produto</th>
              <th className="w-[10%] text-right">Qtd.</th>
              <th className="w-[15%] text-right">Valor pago</th>
              <th className="w-[12%] text-left">Forma</th>
            </tr>
          </thead>
          {vendas.map(venda => (
            <tbody key={venda.id} className="break-inside-avoid">
              {venda.itens.map((item, indice) => (
                <tr key={indice}>
                  {indice === 0 && <>
                    <td rowSpan={venda.itens.length}>{venda.horario}</td>
                    <td rowSpan={venda.itens.length} className="[overflow-wrap:anywhere]">{venda.id}</td>
                  </>}
                  <td>{item.nome}</td>
                  <td className="text-right">{item.quantidade}</td>
                  {indice === 0 && <>
                    <td rowSpan={venda.itens.length} className="whitespace-nowrap text-right">{formatarValor(venda.valorPago)}</td>
                    <td rowSpan={venda.itens.length}>{venda.forma}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          ))}
          {vendas.length === 0 && <tbody><tr><td colSpan={6}>Nenhum pedido pago no dia.</td></tr></tbody>}
        </table>
      </section>
    </article>
  );
}

function RelatorioVendasDoMes({ relatorio }: { relatorio: ReturnType<typeof gerarVendasDoMes> }) {
  const { mes, recebimentos, produtos, vendas } = relatorio;
  const total = recebimentos.pix + recebimentos.cartao;
  const totalIngressos = vendas.reduce((soma, venda) =>
    soma + venda.itens.reduce((quantidade, item) => quantidade + item.quantidade, 0), 0
  );
  const pedidosPix = vendas.filter(venda => venda.forma === "Pix").length;
  const tabela = "w-full border-collapse [&_td]:border-b [&_td]:border-gray-300 [&_td]:px-1 [&_td]:py-1 [&_td]:align-top [&_th]:border-b [&_th]:border-gray-500 [&_th]:px-1 [&_th]:py-1 [&_tr]:break-inside-avoid";
  const titulo = "mb-1 break-after-avoid text-[11pt] font-bold";

  return (
    <article className="hidden text-[9pt] leading-snug text-black print:block">
      <section className="mb-3 break-inside-avoid">
        <h1 className={titulo}>Resumo do mês · {mes}</h1>
        <dl className="grid grid-cols-3 gap-x-3 gap-y-1">
          <div><dt>Total vendido</dt><dd className="font-semibold">{formatarValor(total)}</dd></div>
          <div><dt>Pedidos pagos</dt><dd className="font-semibold">{vendas.length}</dd></div>
          <div><dt>Ingressos</dt><dd className="font-semibold">{totalIngressos}</dd></div>
          <div><dt>Ticket médio</dt><dd className="font-semibold">{formatarValor(vendas.length ? total / vendas.length : 0)}</dd></div>
          <div><dt>Recebido via Pix</dt><dd className="font-semibold">{formatarValor(recebimentos.pix)}</dd></div>
          <div><dt>Recebido via cartão</dt><dd className="font-semibold">{formatarValor(recebimentos.cartao)}</dd></div>
        </dl>
      </section>

      <section className="mb-3 break-inside-avoid">
        <h2 className={titulo}>Vendas por produto do mês</h2>
        <table className={tabela}>
          <thead>
            <tr><th className="text-left">Produto</th><th className="text-right">Quantidade</th><th className="text-right">Receita</th></tr>
          </thead>
          <tbody>
            {(Object.keys(produtos) as ProdutoVenda[]).map(produto => (
              <tr key={produto}>
                <td>{produto === "elevador" ? "Elevador Panorâmico" : produtosVendasDoDia[produto]}</td>
                <td className="text-right">{produtos[produto].quantidade}</td>
                <td className="text-right">{formatarValor(produtos[produto].receita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-3 break-inside-avoid">
        <h2 className={titulo}>Formas de pagamento</h2>
        <table className={tabela}>
          <thead>
            <tr><th className="text-left">Forma</th><th className="text-right">Pedidos</th><th className="text-right">Valor recebido</th></tr>
          </thead>
          <tbody>
            <tr><td>Pix</td><td className="text-right">{pedidosPix}</td><td className="text-right">{formatarValor(recebimentos.pix)}</td></tr>
            <tr><td>Cartão</td><td className="text-right">{vendas.length - pedidosPix}</td><td className="text-right">{formatarValor(recebimentos.cartao)}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className={titulo}>Detalhamento das vendas do mês</h2>
        <table className={`${tabela} table-fixed`}>
          <thead>
            <tr>
              <th className="w-[12%] text-left">Data</th>
              <th className="w-[10%] text-left">Horário</th>
              <th className="w-[22%] text-left">Pedido ID</th>
              <th className="w-[23%] text-left">Produto(s)</th>
              <th className="w-[8%] text-right">Qtd.</th>
              <th className="w-[16%] text-right">Valor pago</th>
              <th className="w-[9%] text-left">Forma</th>
            </tr>
          </thead>
          {vendas.map(venda => (
            <tbody key={venda.id} className="break-inside-avoid">
              {venda.itens.map((item, indice) => (
                <tr key={indice}>
                  {indice === 0 && <>
                    <td rowSpan={venda.itens.length} className="whitespace-nowrap">{formatarDataVenda.format(venda.confirmacao)}</td>
                    <td rowSpan={venda.itens.length} className="whitespace-nowrap">{venda.horario}</td>
                    <td rowSpan={venda.itens.length} className="[overflow-wrap:anywhere]">{venda.id}</td>
                  </>}
                  <td>{item.nome}</td>
                  <td className="text-right">{item.quantidade}</td>
                  {indice === 0 && <>
                    <td rowSpan={venda.itens.length} className="whitespace-nowrap text-right">{formatarValor(venda.valorPago)}</td>
                    <td rowSpan={venda.itens.length}>{venda.forma}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          ))}
          {vendas.length === 0 && <tbody><tr><td colSpan={7}>Nenhum pedido pago no mês.</td></tr></tbody>}
        </table>
      </section>
    </article>
  );
}

function Botao({
  texto,
  classe,
  onClick,
}: {
  texto: string;
  classe: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-3 font-bold text-white shadow-md ${classe}`}
    >
      {texto}
    </button>
  );
}

function Campo({
  label,
  classe = "",
  children,
}: {
  label: string;
  classe?: string;
  children: ReactNode;
}) {
  return (
    <div className={classe}>
      <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
        {label}
      </label>

      {children}
    </div>
  );
}

function Aba({
  ativo,
  texto,
  onClick,
}: {
  ativo: boolean;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-bold ${ativo
        ? "bg-[#166534] text-white"
        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
    >
      {texto}
    </button>
  );
}

function Card({
  titulo,
  valor,
}: {
  titulo: string;
  valor: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">

      <p className="text-sm font-semibold text-gray-500">
        {titulo}
      </p>

      <h2 className="mt-3 text-2xl font-bold text-[#166534]">
        {valor}
      </h2>

    </div>
  );
}

function CardDestaque({
  titulo,
  valor,
  icone,
}: {
  titulo: string;
  valor: ReactNode;
  icone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">

      <p className="text-2xl">
        {icone}
      </p>

      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-green-100">
        {titulo}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {valor}
      </p>

    </div>
  );
}

function CardProduto({
  titulo,
  quantidade,
  receita,
  icone,
  destaque = false,
}: {
  titulo: string;
  quantidade: number;
  receita: ReactNode;
  icone: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-md ${destaque
        ? "border-cyan-200 bg-gradient-to-br from-cyan-50 to-white"
        : "border-gray-100 bg-white"
        }`}
    >

      <div className="flex items-center justify-between">

        <span className="text-3xl">
          {icone}
        </span>

        {destaque && (
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">
            ELEVADOR
          </span>
        )}

      </div>

      <h3 className="mt-4 font-black text-gray-800">
        {titulo}
      </h3>

      <p className="mt-3 text-3xl font-black text-[#166534]">
        {quantidade}
      </p>

      <p className="text-xs font-semibold text-gray-500">
        vendido
        {quantidade !== 1
          ? "s"
          : ""}
      </p>

      <div className="mt-4 border-t pt-3">

        <p className="text-xs text-gray-500">
          Receita
        </p>

        <p className="font-black text-gray-800">
          {receita}
        </p>

      </div>

    </div>
  );
}

function CardEntrada({
  titulo,
  valor,
  icone,
}: {
  titulo: string;
  valor: number;
  icone: string;
}) {
  return (
    <div className="rounded-2xl border border-green-100 bg-green-50 p-4">

      <div className="flex items-center justify-between">

        <p className="text-sm font-bold text-gray-600">
          {titulo}
        </p>

        <span className="text-xl">
          {icone}
        </span>

      </div>

      <p className="mt-2 text-3xl font-black text-[#166534]">
        {valor}
      </p>

      <p className="text-xs text-gray-500">
        visitante
        {valor !== 1
          ? "s"
          : ""}
      </p>

    </div>
  );
}

function BarraStatus({
  titulo,
  quantidade,
  maximo,
  classe,
  texto,
}: {
  titulo: string;
  quantidade: number;
  maximo: number;
  classe: string;
  texto: string;
}) {
  return (
    <div className="flex min-h-0 flex-col items-center text-center">
      <div className="flex min-h-0 w-full flex-1 items-end justify-center">
        <div
          aria-hidden="true"
          className={`w-full max-w-20 rounded-t-2xl ${classe}`}
          style={{ height: `${(quantidade / maximo) * 100}%` }}
        />
      </div>

      <p className={`mt-2 text-sm font-bold ${texto}`}>{titulo}</p>
      <span className="font-semibold tabular-nums">{quantidade}</span>
    </div>
  );
}

function StatusPagamento({
  status,
}: {
  status: string;
}) {
  let classes =
    "bg-yellow-100 text-yellow-800";

  if (status === "pago") {
    classes =
      "bg-green-100 text-green-800";
  }

  if (
    status ===
    "expirado"
  ) {
    classes =
      "bg-orange-100 text-orange-800";
  }

  if (
    status ===
    "cancelado" ||
    status === "reembolsado" ||
    status ===
    "valor_divergente"
  ) {
    classes =
      "bg-red-100 text-red-800";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${classes}`}
    >
      {status === "reembolsado" ? "Reembolsado" : status}
    </span>
  );
}

function StatusOperacionalPedido({
  pedido,
}: {
  pedido: any;
}) {
  if (
    pedidoReembolsado(pedido) || pedido.statusOperacional === "bloqueado"
  ) {
    return (
      <StatusChip
        texto="Bloqueado"
        classe="bg-red-100 text-red-800"
      />
    );
  }

  if (
    pedido.statusOperacional ===
    "utilizado"
  ) {
    return (
      <StatusChip
        texto="utilizado"
        classe="bg-blue-100 text-blue-800"
      />
    );
  }

  if (
    pedido.elevadorValidado ===
    true
  ) {
    return (
      <StatusChip
        texto="elevador utilizado"
        classe="bg-cyan-100 text-cyan-800"
      />
    );
  }

  if (
    pedido.statusOperacional ===
    "expirado" ||
    pedido.statusPagamento ===
    "expirado"
  ) {
    return (
      <StatusChip
        texto="expirado"
        classe="bg-orange-100 text-orange-800"
      />
    );
  }

  if (
    pedido.statusPagamento !==
    "pago"
  ) {
    return (
      <StatusChip
        texto="aguardando"
        classe="bg-yellow-100 text-yellow-800"
      />
    );
  }

  return (
    <StatusChip
      texto="disponível"
      classe="bg-green-100 text-green-800"
    />
  );
}

function StatusChip({
  texto,
  classe,
}: {
  texto: string;
  classe: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${classe}`}
    >
      {texto}
    </span>
  );
}

function obterQuantidade(
  pedido: any
) {
  if (
    pedido.produto ===
    "Camping" ||
    pedido.tipo ===
    "camping"
  ) {
    return Number(
      pedido.quantidadePessoas ||
      pedido.quantidade ||
      1
    );
  }

  return Number(
    pedido.quantidade ||
    pedido.quantidadePessoas ||
    1
  );
}

function obterDocumentoPedido(
  pedido: any
) {
  if (
    pedido.tipoDocumento ===
    "estrangeiro"
  ) {
    return (
      pedido.documento ||
      pedido.documentoEstrangeiro ||
      ""
    );
  }

  return (
    pedido.cpf ||
    pedido.documento ||
    ""
  );
}

function normalizarTexto(
  valor: unknown
) {
  return String(
    valor || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function formatarData(
  valor?: string
) {
  if (!valor) {
    return "-";
  }

  const data =
    new Date(valor);

  return Number.isNaN(
    data.getTime()
  )
    ? "-"
    : data.toLocaleDateString(
      "pt-BR"
    );
}

function formatarDataHora(
  valor?: string
) {
  if (!valor) {
    return "-";
  }

  const data =
    new Date(valor);

  return Number.isNaN(
    data.getTime()
  )
    ? "-"
    : data.toLocaleString(
      "pt-BR"
    );
}

function baixarCSV(
  conteudo: string,
  nomeArquivo: string
) {
  const blob =
    new Blob(
      [
        "\ufeff" +
        conteudo,
      ],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    nomeArquivo;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(url);
}

function ehHoje(
  valor?: string
) {
  if (!valor) {
    return false;
  }

  const hoje =
    new Date();

  const data =
    new Date(valor);

  return (
    data.getDate() ===
    hoje.getDate() &&
    data.getMonth() ===
    hoje.getMonth() &&
    data.getFullYear() ===
    hoje.getFullYear()
  );
}

function ehMesAtual(
  valor?: string
) {
  if (!valor) {
    return false;
  }

  const hoje =
    new Date();

  const data =
    new Date(valor);

  return (
    data.getMonth() ===
    hoje.getMonth() &&
    data.getFullYear() ===
    hoje.getFullYear()
  );
}

function ehSemanaAtual(
  valor?: string
) {
  if (!valor) {
    return false;
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return false;
  }

  const agora =
    new Date();

  const inicio =
    new Date(agora);

  const diaSemana =
    inicio.getDay();

  inicio.setHours(
    0,
    0,
    0,
    0
  );

  inicio.setDate(
    inicio.getDate() -
    (diaSemana === 0
      ? 6
      : diaSemana - 1)
  );

  const fim =
    new Date(inicio);

  fim.setDate(
    fim.getDate() + 6
  );

  fim.setHours(
    23,
    59,
    59,
    999
  );

  return (
    data >= inicio &&
    data <= fim
  );
}

function categoriaPrincipalDoPedido(
  pedido: any
):
  | Exclude<
    CategoriaEntrada,
    "todos"
  >
  | "outro" {
  if (
    pedido.produto ===
    "Camping" ||
    pedido.tipo ===
    "camping"
  ) {
    return "camping";
  }

  if (
    pedido.produto ===
    "Ingresso Parque" ||
    pedido.produto ===
    "Meia Entrada Idoso" ||
    pedido.tipo ===
    "ingresso" ||
    pedido.tipo ===
    "idoso"
  ) {
    return "parque";
  }

  if (
    pedido.produto ===
    "Elevador Panorâmico" ||
    pedido.tipo ===
    "elevador"
  ) {
    return "elevador";
  }

  return "outro";
}

function obterQuantidadePrincipal(
  pedido: any
) {
  if (
    pedido.produto ===
    "Camping" ||
    pedido.tipo ===
    "camping"
  ) {
    return Number(
      pedido.quantidadeValidada ||
      pedido.quantidadePessoas ||
      pedido.quantidade ||
      1
    );
  }

  return Number(
    pedido.quantidadeValidada ||
    pedido.quantidade ||
    1
  );
}

function obterQuantidadeElevador(
  pedido: any
) {
  return Number(
    pedido.elevadorQuantidadeValidada ||
    pedido.qtdElevador ||
    pedido.quantidade ||
    1
  );
}

function gerarRegistrosEntradas(
  pedidos: Pedido[]
) {
  const registros:
    EntradaRegistro[] = [];

  pedidos.forEach(
    (pedido: any) => {
      const elevadorStandalone =
        pedido.produto ===
        "Elevador Panorâmico" ||
        pedido.tipo ===
        "elevador";

      if (
        elevadorStandalone
      ) {
        if (
          pedido.elevadorValidado ===
          true &&
          pedido.elevadorValidadoEm
        ) {
          registros.push({
            key: `${pedido.id}-elevador`,
            pedidoId:
              pedido.id,
            nome:
              pedido.nome ||
              "",
            produto:
              "Elevador Panorâmico",
            categoria:
              "elevador",
            quantidade:
              obterQuantidadeElevador(
                pedido
              ),
            codigo:
              pedido.codigoIngresso ||
              "",
            funcionario:
              pedido.elevadorValidadoPor ||
              "",
            dataEntrada:
              pedido.elevadorValidadoEm,
          });
        } else if (
          pedido.statusOperacional ===
          "utilizado" &&
          (
            pedido.utilizadoEm ||
            pedido.validadoEm
          )
        ) {
          registros.push({
            key: `${pedido.id}-elevador-legado`,
            pedidoId:
              pedido.id,
            nome:
              pedido.nome ||
              "",
            produto:
              "Elevador Panorâmico",
            categoria:
              "elevador",
            quantidade:
              obterQuantidadeElevador(
                pedido
              ),
            codigo:
              pedido.codigoIngresso ||
              "",
            funcionario:
              pedido.validadoPor ||
              "",
            dataEntrada:
              pedido.utilizadoEm ||
              pedido.validadoEm,
          });
        }

        return;
      }

      if (
        pedido.statusOperacional ===
        "utilizado" &&
        (
          pedido.utilizadoEm ||
          pedido.validadoEm
        )
      ) {
        const categoria =
          categoriaPrincipalDoPedido(
            pedido
          );

        if (
          categoria !==
          "outro" &&
          categoria !==
          "elevador"
        ) {
          registros.push({
            key: `${pedido.id}-principal`,
            pedidoId:
              pedido.id,
            nome:
              pedido.nome ||
              "",
            produto:
              pedido.produto ||
              "",
            categoria,
            quantidade:
              obterQuantidadePrincipal(
                pedido
              ),
            codigo:
              pedido.codigoIngresso ||
              "",
            funcionario:
              pedido.validadoPor ||
              "",
            dataEntrada:
              pedido.utilizadoEm ||
              pedido.validadoEm,
          });
        }
      }

      if (
        pedido.elevadorValidado ===
        true &&
        pedido.elevadorValidadoEm
      ) {
        registros.push({
          key: `${pedido.id}-elevador`,
          pedidoId:
            pedido.id,
          nome:
            pedido.nome ||
            "",
          produto:
            "Elevador Panorâmico",
          categoria:
            "elevador",
          quantidade:
            obterQuantidadeElevador(
              pedido
            ),
          codigo:
            pedido.codigoIngresso ||
            "",
          funcionario:
            pedido.elevadorValidadoPor ||
            "",
          dataEntrada:
            pedido.elevadorValidadoEm,
        });
      }
    }
  );

  return registros.sort(
    (
      a,
      b
    ) =>
      new Date(
        b.dataEntrada
      ).getTime() -
      new Date(
        a.dataEntrada
      ).getTime()
  );
}

function gerarEntradasHoje(
  pedidos: Pedido[]
) {
  return gerarRegistrosEntradas(
    pedidos
  ).filter(
    (entrada) =>
      ehHoje(
        entrada.dataEntrada
      )
  );
}

function gerarEntradasSemana(
  pedidos: Pedido[]
) {
  return gerarRegistrosEntradas(
    pedidos
  ).filter(
    (entrada) =>
      ehSemanaAtual(
        entrada.dataEntrada
      )
  );
}

function gerarResumoEntradas(
  entradas: EntradaRegistro[]
) {
  return entradas.reduce(
    (
      resumo,
      entrada
    ) => {
      resumo.total +=
        entrada.quantidade;

      resumo[
        entrada.categoria
      ] +=
        entrada.quantidade;

      return resumo;
    },
    {
      total: 0,
      parque: 0,
      elevador: 0,
      camping: 0,
    }
  );
}

function filtrarPedidosHistorico(
  pedidos: Pedido[],
  filtros: {
    busca: string;
    produto: string;
    status: FiltroStatus;
    dataInicial: string;
    dataFinal: string;
  }
) {
  const busca =
    normalizarTexto(
      filtros.busca
    );

  return pedidos.filter(
    (pedido: any) => {
      if (busca) {
        const texto =
          normalizarTexto(
            [
              pedido.nome,
              pedido.cpf,
              pedido.documento,
              pedido.documentoEstrangeiro,
              pedido.telefone,
              pedido.codigoIngresso,
              pedido.qrCodeIngresso,
              pedido.id,
              pedido.email,
            ].join(" ")
          );

        if (
          !texto.includes(
            busca
          )
        ) {
          return false;
        }
      }

      if (
        filtros.produto !==
        "todos" &&
        pedido.produto !==
        filtros.produto
      ) {
        return false;
      }

      if (
        filtros.status ===
        "bloqueado" &&
        !pedidoReembolsado(pedido) &&
        pedido.statusOperacional !==
        "bloqueado"
      ) {
        return false;
      }

      if (
        filtros.status ===
        "utilizado" &&
        pedido.statusOperacional !==
        "utilizado" &&
        pedido.elevadorValidado !==
        true
      ) {
        return false;
      }

      if (
        ![
          "todos",
          "bloqueado",
          "utilizado",
        ].includes(
          filtros.status
        ) &&
        pedido.statusPagamento !==
        filtros.status
      ) {
        return false;
      }

      if (
        filtros.dataInicial ||
        filtros.dataFinal
      ) {
        if (
          !pedido.createdAt
        ) {
          return false;
        }

        const data =
          new Date(
            pedido.createdAt
          );

        if (
          Number.isNaN(
            data.getTime()
          )
        ) {
          return false;
        }

        if (
          filtros.dataInicial &&
          data <
          new Date(
            `${filtros.dataInicial}T00:00:00`
          )
        ) {
          return false;
        }

        if (
          filtros.dataFinal &&
          data >
          new Date(
            `${filtros.dataFinal}T23:59:59.999`
          )
        ) {
          return false;
        }
      }

      return true;
    }
  );
}

function gerarResumoDesdeLancamento(
  pedidos: Pedido[]
) {
  const pagos = pedidos.filter(pedidoContaComoVenda);

  const totalVendido =
    pagos.reduce(
      (
        total,
        pedido
      ) =>
        total +
        Number(
          pedido.valorTotal ||
          0
        ),
      0
    );

  const totalIngressos =
    pagos.reduce(
      (
        total,
        pedido
      ) =>
        total +
        obterQuantidade(
          pedido
        ),
      0
    );

  const ticketMedio =
    pagos.length
      ? totalVendido /
      pagos.length
      : 0;

  function resumoProduto(
    nome: string
  ) {
    const lista =
      pagos.filter(
        (pedido) =>
          pedido.produto ===
          nome
      );

    return {
      quantidade:
        lista.reduce(
          (
            total,
            pedido
          ) =>
            total +
            obterQuantidade(
              pedido
            ),
          0
        ),

      receita:
        lista.reduce(
          (
            total,
            pedido
          ) =>
            total +
            Number(
              pedido.valorTotal ||
              0
            ),
          0
        ),
    };
  }

  return {
    totalVendido,
    totalIngressos,
    pedidosPagos:
      pagos.length,
    ticketMedio,

    parque:
      resumoProduto(
        "Ingresso Parque"
      ),

    elevador:
      resumoProduto(
        "Elevador Panorâmico"
      ),

    idoso:
      resumoProduto(
        "Meia Entrada Idoso"
      ),

    camping:
      resumoProduto(
        "Camping"
      ),
  };
}

function gerarDashboardOperacional(
  pedidos: Pedido[]
) {
  const utilizados =
    pedidos.filter(
      (pedido: any) =>
        pedido.statusOperacional ===
        "utilizado"
    );

  const visitantesHoje =
    utilizados
      .filter(
        (pedido: any) =>
          ehHoje(
            pedido.utilizadoEm ||
            pedido.validadoEm
          )
      )
      .reduce(
        (
          total,
          pedido
        ) =>
          total +
          obterQuantidade(
            pedido
          ),
        0
      );

  const visitantesMes =
    utilizados
      .filter(
        (pedido: any) =>
          ehMesAtual(
            pedido.utilizadoEm ||
            pedido.validadoEm
          )
      )
      .reduce(
        (
          total,
          pedido
        ) =>
          total +
          obterQuantidade(
            pedido
          ),
        0
      );

  const pagos = pedidos.filter(pedidoContaComoVenda);

  const receitaHoje =
    pagos
      .filter(
        (pedido) =>
          ehHoje(
            pedido.createdAt
          )
      )
      .reduce(
        (
          total,
          pedido
        ) =>
          total +
          Number(
            pedido.valorTotal ||
            0
          ),
        0
      );

  const receitaMes =
    pagos
      .filter(
        (pedido) =>
          ehMesAtual(
            pedido.createdAt
          )
      )
      .reduce(
        (
          total,
          pedido
        ) =>
          total +
          Number(
            pedido.valorTotal ||
            0
          ),
        0
      );

  return {
    visitantesHoje,
    visitantesMes,
    receitaHoje,
    receitaMes,
  };
}

function gerarEstatisticasProdutos(
  pedidos: Pedido[]
) {
  const contagem:
    Record<
      string,
      number
    > = {};

  pedidos
    .filter(pedidoContaComoVenda)
    .forEach(
      (pedido) => {
        const nome =
          pedido.produto ||
          "Não informado";

        contagem[nome] =
          (
            contagem[nome] ||
            0
          ) +
          obterQuantidade(
            pedido
          );
      }
    );

  const total =
    Object.values(
      contagem
    ).reduce(
      (
        soma,
        quantidade
      ) =>
        soma +
        quantidade,
      0
    );

  const produtos =
    Object.entries(
      contagem
    )
      .map(
        ([
          nome,
          quantidade,
        ]) => ({
          nome,
          quantidade,
          percentual:
            total
              ? Math.round(
                (
                  quantidade /
                  total
                ) *
                100
              )
              : 0,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.quantidade -
          a.quantidade
      );

  const camping =
    contagem[
    "Camping"
    ] || 0;

  return {
    produtoMaisVendido:
      produtos[0]
        ?.nome ||
      "Sem vendas",

    percentualCamping:
      total
        ? Math.round(
          (
            camping /
            total
          ) *
          100
        )
        : 0,

    produtos,
  };
}

function gerarFaturamentoPorDia(
  pedidos: Pedido[]
) {
  const agrupado:
    Record<
      string,
      number
    > = {};

  pedidos
    .filter(pedidoContaComoVenda)
    .forEach(
      (pedido) => {
        if (
          !pedido.createdAt
        ) {
          return;
        }

        const data =
          new Date(
            pedido.createdAt
          ).toLocaleDateString(
            "pt-BR"
          );

        agrupado[data] =
          (
            agrupado[
            data
            ] || 0
          ) +
          Number(
            pedido.valorTotal ||
            0
          );
      }
    );

  const lista =
    Object.entries(
      agrupado
    )
      .map(
        ([
          data,
          valor,
        ]) => ({
          data,
          valor,
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          const [
            diaA,
            mesA,
            anoA,
          ] =
            a.data
              .split("/")
              .map(
                Number
              );

          const [
            diaB,
            mesB,
            anoB,
          ] =
            b.data
              .split("/")
              .map(
                Number
              );

          return (
            new Date(
              anoB,
              mesB - 1,
              diaB
            ).getTime() -
            new Date(
              anoA,
              mesA - 1,
              diaA
            ).getTime()
          );
        }
      );

  const maior =
    Math.max(
      ...lista.map(
        (item) =>
          item.valor
      ),
      1
    );

  return lista.map(
    (item) => ({
      ...item,

      percentual:
        Math.round(
          (
            item.valor /
            maior
          ) *
          100
        ),
    })
  );
}

function gerarDicasFinanceiras(
  resumo: any,
  lancamento: ReturnType<typeof gerarResumoDesdeLancamento>,
  formatarMoeda: (valor: number) => ReactNode
) {
  const dicas: ReactNode[] = [];

  if (
    resumo.totalPendentes >
    10
  ) {
    dicas.push(
      `Existem ${resumo.totalPendentes} pedidos pendentes dentro do prazo. Recomenda-se acompanhar as conversões de pagamento.`
    );
  }

  if (
    (
      resumo.totalExpirados ||
      0
    ) > 0
  ) {
    dicas.push(
      `${resumo.totalExpirados} pedido(s) tiveram o prazo do Pix expirado e não estão sendo considerados como faturamento.`
    );
  }

  if (
    resumo.totalPagos ===
    0
  ) {
    dicas.push(
      "Ainda não há pedidos pagos registrados."
    );
  }

  if (
    lancamento.elevador
      .quantidade > 0
  ) {
    dicas.push(
      <>
        O Elevador Panorâmico já vendeu {lancamento.elevador.quantidade} ingresso(s), gerando {formatarMoeda(lancamento.elevador.receita)}.
      </>
    );
  } else {
    dicas.push(
      "O Elevador Panorâmico ainda não possui vendas pagas registradas."
    );
  }

  dicas.push(
    <>Ticket médio atual das compras pagas: {formatarMoeda(lancamento.ticketMedio)}.</>
  );

  dicas.push(
    "Recomendação: realizar fechamento semanal comparando pedidos pagos, Pix, cartão e valores efetivamente recebidos."
  );

  return dicas;
}
