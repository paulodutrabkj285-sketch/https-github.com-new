"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  calcularResumoFinanceiro,
  listarPedidos,
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

  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

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
    async function carregarDados() {
      try {
        setPedidos(
          await listarPedidos()
        );
      } catch (error) {
        console.error(
          "DASHBOARD: erro ao carregar pedidos:",
          error
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
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

  const dicasFinanceiras =
    gerarDicasFinanceiras(
      resumo,
      desdeLancamento
    );

  const formatarMoeda = (
    valor: number
  ) =>
    valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );

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
          pedido.statusOperacional ||
          "",
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

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-6">
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

          <div className="flex flex-wrap gap-3">

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
              texto="📄 Vendas do Dia"
              classe="bg-blue-700 hover:bg-blue-800"
              onClick={() =>
                window.print()
              }
            />

            <Botao
              texto="📄 Vendas do Mês"
              classe="bg-purple-700 hover:bg-purple-800"
              onClick={() =>
                window.print()
              }
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

              <p className="text-sm font-black uppercase tracking-[0.2em] text-green-200">
                Visão Geral
              </p>

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

              <div className="rounded-2xl bg-white p-5 shadow-md">

                <h2 className="text-2xl font-bold text-[#166534]">
                  Situação dos Pedidos
                </h2>

                <div className="mt-8 flex items-end gap-5">

                  <BarraStatus
                    titulo="Pagos"
                    quantidade={
                      resumo.totalPagos
                    }
                    classe="bg-green-600"
                    texto="text-green-700"
                  />

                  <BarraStatus
                    titulo="Pendentes"
                    quantidade={
                      resumo
                        .totalPendentes
                    }
                    classe="bg-yellow-500"
                    texto="text-yellow-700"
                  />

                  <BarraStatus
                    titulo="Expirados"
                    quantidade={
                      (resumo as any)
                        .totalExpirados ||
                      0
                    }
                    classe="bg-orange-500"
                    texto="text-orange-700"
                  />

                </div>
              </div>

            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">

              <h2 className="text-2xl font-bold text-[#166534]">
                Faturamento por Dia
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Somente pagamentos
                confirmados.
              </p>

              <div className="mt-6 grid gap-4">

                {faturamentoPorDia
                  .length === 0 ? (
                  <p className="text-gray-500">
                    Ainda não há
                    vendas pagas
                    suficientes.
                  </p>
                ) : (
                  faturamentoPorDia.map(
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

                        <div className="h-5 overflow-hidden rounded-full bg-gray-200">
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
            </section>

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
                            className={`border-b text-sm ${pedido.statusOperacional ===
                              "bloqueado"
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
  valor: string | number;
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
  valor: string | number;
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
  receita: string;
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
  classe,
  texto,
}: {
  titulo: string;
  quantidade: number;
  classe: string;
  texto: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center">

      <div
        className={`w-full max-w-20 rounded-t-2xl ${classe}`}
        style={{
          height: `${Math.max(
            quantidade * 15,
            30
          )}px`,
        }}
      />

      <p
        className={`mt-3 text-sm font-bold ${texto}`}
      >
        {titulo}
      </p>

      <span className="font-semibold">
        {quantidade}
      </span>

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
      {status}
    </span>
  );
}

function StatusOperacionalPedido({
  pedido,
}: {
  pedido: any;
}) {
  if (
    pedido.statusOperacional ===
    "bloqueado"
  ) {
    return (
      <StatusChip
        texto="bloqueado"
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
  const pagos =
    pedidos.filter(
      (pedido) =>
        pedido.statusPagamento ===
        "pago"
    );

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

  const pagos =
    pedidos.filter(
      (pedido) =>
        pedido.statusPagamento ===
        "pago"
    );

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
    .filter(
      (pedido) =>
        pedido.statusPagamento ===
        "pago"
    )
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
    .filter(
      (pedido) =>
        pedido.statusPagamento ===
        "pago"
    )
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
  lancamento: ReturnType<
    typeof gerarResumoDesdeLancamento
  >
) {
  const dicas:
    string[] = [];

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
      `O Elevador Panorâmico já vendeu ${lancamento.elevador
        .quantidade
      } ingresso(s), gerando ${lancamento.elevador.receita.toLocaleString(
        "pt-BR",
        {
          style:
            "currency",
          currency:
            "BRL",
        }
      )}.`
    );
  } else {
    dicas.push(
      "O Elevador Panorâmico ainda não possui vendas pagas registradas."
    );
  }

  dicas.push(
    `Ticket médio atual das compras pagas: ${lancamento.ticketMedio.toLocaleString(
      "pt-BR",
      {
        style:
          "currency",
        currency:
          "BRL",
      }
    )}.`
  );

  dicas.push(
    "Recomendação: realizar fechamento semanal comparando pedidos pagos, Pix, cartão e valores efetivamente recebidos."
  );

  return dicas;
}