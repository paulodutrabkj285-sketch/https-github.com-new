"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  calcularResumoFinanceiro,
  listarPedidos,
  Pedido,
} from "@/lib/pedidos";

export default function DashboardPage() {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        const lista = await listarPedidos();
        setPedidos(lista);
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

  const resumo = calcularResumoFinanceiro(pedidos);

  const desdeLancamento =
    gerarResumoDesdeLancamento(pedidos);

  const operacional =
    gerarDashboardOperacional(pedidos);

  const estatisticas =
    gerarEstatisticasProdutos(pedidos);

  const faturamentoPorDia =
    gerarFaturamentoPorDia(pedidos);

  const entradasHoje =
    gerarEntradasHoje(pedidos);

  const visitantesEntradasHoje =
    entradasHoje.reduce(
      (total, pedido) =>
        total + obterQuantidade(pedido),
      0
    );

  const dicasFinanceiras =
    gerarDicasFinanceiras(
      resumo,
      pedidos,
      desdeLancamento
    );

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function imprimirRelatorio() {
    window.print();
  }

  function exportarCSV() {
    const cabecalho = [
      "Nome",
      "Produto",
      "Quantidade",
      "Valor",
      "Pagamento",
      "Forma Pagamento",
      "Data",
      "Email",
      "Telefone",
      "Codigo Ingresso",
    ];

    const linhas = pedidos.map(
      (pedido: any) => [
        pedido.nome || "",
        pedido.produto || "",
        obterQuantidade(pedido),
        pedido.valorTotal || "",
        pedido.statusPagamento || "",
        pedido.formaPagamento || "",
        pedido.createdAt
          ? new Date(
            pedido.createdAt
          ).toLocaleDateString("pt-BR")
          : "",
        pedido.email || "",
        pedido.telefone || "",
        pedido.codigoIngresso || "",
      ]
    );

    const csv = [
      cabecalho.join(";"),
      ...linhas.map((linha) =>
        linha.join(";")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `vendas-parque-${new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-")}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportarEntradasHoje() {
    const cabecalho = [
      "Cliente",
      "Produto",
      "Quantidade",
      "Codigo",
      "Funcionario",
      "Data Entrada",
    ];

    const linhas =
      entradasHoje.map(
        (pedido: any) => [
          pedido.nome || "",
          pedido.produto || "",
          obterQuantidade(pedido),
          pedido.codigoIngresso || "",
          pedido.validadoPor || "",
          pedido.utilizadoEm ||
          pedido.validadoEm ||
          "",
        ]
      );

    const csv = [
      cabecalho.join(";"),
      ...linhas.map((linha) =>
        linha.join(";")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "entradas-hoje.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-6">
      <div className="mx-auto max-w-7xl">

        {/* ======================================
            CABEÇALHO
        ====================================== */}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-[#166534]">
              Dashboard Financeiro
            </h1>

            <p className="mt-2 text-gray-600">
              Acompanhamento operacional e
              financeiro das vendas online.
            </p>
          </div>

          <section className="flex flex-wrap gap-3">

            {/* NOVO BOTÃO DAS AGÊNCIAS */}

            <button
              onClick={() =>
                router.push(
                  "/admin/reservas-agencias"
                )
              }
              className="rounded-xl bg-amber-600 px-5 py-3 font-bold text-white shadow-md hover:bg-amber-700"
            >
              🏢 Agências e Reservas
            </button>

            <button
              onClick={() =>
                router.push(
                  "/admin/envio-ingressos"
                )
              }
              className="rounded-xl bg-[#166534] px-5 py-3 font-bold text-white shadow-md hover:bg-green-800"
            >
              📧 Envio de Ingressos
            </button>

            <button
              onClick={imprimirRelatorio}
              className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white"
            >
              📄 Relatório Financeiro
            </button>

            <button
              onClick={imprimirRelatorio}
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
            >
              📄 Vendas do Dia
            </button>

            <button
              onClick={imprimirRelatorio}
              className="rounded-xl bg-purple-700 px-5 py-3 font-bold text-white"
            >
              📄 Vendas do Mês
            </button>

            <button
              onClick={exportarEntradasHoje}
              className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white"
            >
              📋 Exportar Entradas
            </button>

            <button
              onClick={exportarCSV}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
            >
              📊 Exportar Excel
            </button>
          </section>
        </div>

        {/* ======================================
            IMPRESSÃO
        ====================================== */}

        <div className="hidden print:block">
          <h1 className="text-3xl font-bold text-[#166534]">
            Relatório Financeiro -
            Parque Mundo Novo
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

            {/* ======================================
                DESDE O LANÇAMENTO
            ====================================== */}

            <section className="mt-7 rounded-3xl border border-green-200 bg-gradient-to-br from-green-950 to-green-800 p-5 shadow-xl">
              <div className="mb-5">
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
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <CardDestaque
                  titulo="Total vendido"
                  valor={formatarMoeda(
                    desdeLancamento.totalVendido
                  )}
                  icone="💰"
                />

                <CardDestaque
                  titulo="Pedidos pagos"
                  valor={
                    desdeLancamento.pedidosPagos
                  }
                  icone="✅"
                />

                <CardDestaque
                  titulo="Ingressos vendidos"
                  valor={
                    desdeLancamento.totalIngressos
                  }
                  icone="🎟️"
                />

                <CardDestaque
                  titulo="Ticket médio"
                  valor={formatarMoeda(
                    desdeLancamento.ticketMedio
                  )}
                  icone="💳"
                />

                <CardDestaque
                  titulo="Vendido hoje"
                  valor={formatarMoeda(
                    operacional.receitaHoje
                  )}
                  icone="📈"
                />
              </div>
            </section>

            {/* ======================================
                VENDAS POR PRODUTO
            ====================================== */}

            <section className="mt-6">
              <h2 className="mb-4 text-2xl font-bold text-[#166534]">
                Vendas por categoria
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <CardProduto
                  titulo="Ingresso Parque"
                  icone="🌲"
                  quantidade={
                    desdeLancamento.parque.quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento.parque.receita
                  )}
                />

                <CardProduto
                  titulo="Elevador Panorâmico"
                  icone="🛗"
                  quantidade={
                    desdeLancamento.elevador.quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento.elevador.receita
                  )}
                  destaque
                />

                <CardProduto
                  titulo="Meia Entrada Idoso"
                  icone="👴"
                  quantidade={
                    desdeLancamento.idoso.quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento.idoso.receita
                  )}
                />

                <CardProduto
                  titulo="Camping"
                  icone="🏕️"
                  quantidade={
                    desdeLancamento.camping.quantidade
                  }
                  receita={formatarMoeda(
                    desdeLancamento.camping.receita
                  )}
                />
              </div>
            </section>

            {/* ======================================
                STATUS DOS PEDIDOS
            ====================================== */}

            <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card
                titulo="Pedidos registrados"
                valor={resumo.totalPedidos}
              />

              <Card
                titulo="Pagos"
                valor={resumo.totalPagos}
              />

              <Card
                titulo="Pendentes"
                valor={resumo.totalPendentes}
              />

              <Card
                titulo="Expirados"
                valor={
                  (resumo as any)
                    .totalExpirados || 0
                }
              />
            </section>

            {/* ======================================
                FINANCEIRO
            ====================================== */}

            <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card
                titulo="Faturamento bruto"
                valor={formatarMoeda(
                  resumo.faturamentoBruto
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
                  resumo.faturamentoLiquido
                )}
              />
            </section>

            {/* ======================================
                OPERAÇÃO
            ====================================== */}

            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card
                titulo="Visitantes Hoje"
                valor={
                  operacional.visitantesHoje
                }
              />

              <Card
                titulo="Visitantes Mês"
                valor={
                  operacional.visitantesMes
                }
              />

              <Card
                titulo="Receita Hoje"
                valor={formatarMoeda(
                  operacional.receitaHoje
                )}
              />

              <Card
                titulo="Receita Mês"
                valor={formatarMoeda(
                  operacional.receitaMes
                )}
              />

              <Card
                titulo="Ticket Médio"
                valor={formatarMoeda(
                  desdeLancamento.ticketMedio
                )}
              />
            </section>

            {/* ======================================
                ASSISTENTE
            ====================================== */}

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <h2 className="text-2xl font-bold text-[#166534]">
                Assistente Financeiro
              </h2>

              <div className="mt-5 grid gap-3">
                {dicasFinanceiras.map(
                  (dica, index) => (
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

            {/* ======================================
                INDICADORES
            ====================================== */}

            <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card
                titulo="Produto mais vendido"
                valor={
                  estatisticas.produtoMaisVendido
                }
              />

              <Card
                titulo="Participação Camping"
                valor={`${estatisticas.percentualCamping}%`}
              />

              <Card
                titulo="Ingressos do Elevador"
                valor={
                  desdeLancamento.elevador.quantidade
                }
              />
            </section>

            {/* ======================================
                GRÁFICOS
            ====================================== */}

            <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

              <div className="rounded-2xl bg-white p-5 shadow-md">
                <h2 className="text-2xl font-bold text-[#166534]">
                  Ingressos vendidos por Produto
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Considera somente
                  pagamentos confirmados.
                </p>

                <div className="mt-6 grid gap-4">
                  {estatisticas.produtos.length ===
                    0 ? (
                    <p className="text-gray-500">
                      Ainda não há vendas
                      pagas.
                    </p>
                  ) : (
                    estatisticas.produtos.map(
                      (produto) => (
                        <div
                          key={produto.nome}
                        >
                          <div className="mb-1 flex justify-between text-sm font-semibold">
                            <span>
                              {produto.nome}
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
                      resumo.totalPendentes
                    }
                    classe="bg-yellow-500"
                    texto="text-yellow-700"
                  />

                  <BarraStatus
                    titulo="Expirados"
                    quantidade={
                      (resumo as any)
                        .totalExpirados || 0
                    }
                    classe="bg-orange-500"
                    texto="text-orange-700"
                  />
                </div>
              </div>
            </section>

            {/* ======================================
                FATURAMENTO POR DIA
            ====================================== */}

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <h2 className="text-2xl font-bold text-[#166534]">
                Faturamento por Dia
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Somente pagamentos
                confirmados.
              </p>

              <div className="mt-6 grid gap-4">
                {faturamentoPorDia.length ===
                  0 ? (
                  <p className="text-gray-500">
                    Ainda não há vendas
                    pagas suficientes.
                  </p>
                ) : (
                  faturamentoPorDia.map(
                    (item) => (
                      <div
                        key={item.data}
                      >
                        <div className="mb-1 flex justify-between text-sm font-semibold">
                          <span>
                            {item.data}
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

            {/* ======================================
                ENTRADAS DE HOJE
            ====================================== */}

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">

              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#166534]">
                  Entradas de Hoje
                </h2>

                <span className="rounded-full bg-green-100 px-4 py-2 font-bold text-green-800">
                  {visitantesEntradasHoje}{" "}
                  visitante
                  {visitantesEntradasHoje !==
                    1
                    ? "s"
                    : ""}
                </span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
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
                    {entradasHoje.length ===
                      0 ? (
                      <tr>
                        <td
                          className="p-3 text-gray-500"
                          colSpan={6}
                        >
                          Nenhuma entrada
                          registrada hoje.
                        </td>
                      </tr>
                    ) : (
                      entradasHoje.map(
                        (pedido: any) => (
                          <tr
                            key={pedido.id}
                            className="border-b text-sm"
                          >
                            <td className="p-3 font-semibold">
                              {pedido.nome}
                            </td>

                            <td className="p-3">
                              {
                                pedido.produto
                              }
                            </td>

                            <td className="p-3">
                              {obterQuantidade(
                                pedido
                              )}
                            </td>

                            <td className="p-3">
                              {pedido.codigoIngresso ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {pedido.validadoPor ||
                                "-"}
                            </td>

                            <td className="p-3">
                              {pedido.utilizadoEm ||
                                pedido.validadoEm
                                ? new Date(
                                  pedido.utilizadoEm ||
                                  pedido.validadoEm
                                ).toLocaleString(
                                  "pt-BR"
                                )
                                : "-"}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ======================================
                ÚLTIMOS PEDIDOS
            ====================================== */}

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <h2 className="mb-4 text-2xl font-bold text-[#166534]">
                Últimos pedidos
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
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
                        Valor
                      </th>

                      <th className="p-3">
                        Pagamento
                      </th>

                      <th className="p-3">
                        Data
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pedidos
                      .slice(0, 10)
                      .map((pedido) => (
                        <tr
                          key={pedido.id}
                          className="border-b text-sm"
                        >
                          <td className="p-3 font-semibold">
                            {pedido.nome}
                          </td>

                          <td className="p-3">
                            {pedido.produto}
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
                            {pedido.createdAt
                              ? new Date(
                                pedido.createdAt
                              ).toLocaleDateString(
                                "pt-BR"
                              )
                              : "-"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

/* ==========================================
   COMPONENTES
========================================== */

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

  if (status === "expirado") {
    classes =
      "bg-orange-100 text-orange-800";
  }

  if (
    status === "cancelado" ||
    status === "valor_divergente"
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

/* ==========================================
   AUXILIARES
========================================== */

function obterQuantidade(
  pedido: any
) {
  return Number(
    pedido.quantidade ||
    pedido.quantidadePessoas ||
    1
  );
}

function ehHoje(
  valor?: string
) {
  if (!valor) return false;

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
  if (!valor) return false;

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

/* ==========================================
   RESUMO DESDE O LANÇAMENTO
========================================== */

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
      (total, pedido) =>
        total +
        Number(
          pedido.valorTotal || 0
        ),
      0
    );

  const totalIngressos =
    pagos.reduce(
      (total, pedido) =>
        total +
        obterQuantidade(pedido),
      0
    );

  const ticketMedio =
    pagos.length > 0
      ? totalVendido /
      pagos.length
      : 0;

  function resumoProduto(
    nomeProduto: string
  ) {
    const lista =
      pagos.filter(
        (pedido) =>
          pedido.produto ===
          nomeProduto
      );

    return {
      quantidade:
        lista.reduce(
          (total, pedido) =>
            total +
            obterQuantidade(
              pedido
            ),
          0
        ),

      receita:
        lista.reduce(
          (total, pedido) =>
            total +
            Number(
              pedido.valorTotal ||
              0
            ),
          0
        ),

      pedidos:
        lista.length,
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

/* ==========================================
   ENTRADAS DE HOJE
========================================== */

function gerarEntradasHoje(
  pedidos: Pedido[]
) {
  return pedidos.filter(
    (pedido: any) => {
      if (
        pedido.statusOperacional !==
        "utilizado"
      ) {
        return false;
      }

      const dataEntrada =
        pedido.utilizadoEm ||
        pedido.validadoEm;

      return ehHoje(
        dataEntrada
      );
    }
  );
}

/* ==========================================
   OPERACIONAL
========================================== */

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
        (total, pedido) =>
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
        (total, pedido) =>
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
      .filter((pedido) =>
        ehHoje(
          pedido.createdAt
        )
      )
      .reduce(
        (total, pedido) =>
          total +
          Number(
            pedido.valorTotal ||
            0
          ),
        0
      );

  const receitaMes =
    pagos
      .filter((pedido) =>
        ehMesAtual(
          pedido.createdAt
        )
      )
      .reduce(
        (total, pedido) =>
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

/* ==========================================
   ESTATÍSTICAS POR PRODUTO
========================================== */

function gerarEstatisticasProdutos(
  pedidos: Pedido[]
) {
  const pagos =
    pedidos.filter(
      (pedido) =>
        pedido.statusPagamento ===
        "pago"
    );

  const contagem:
    Record<string, number> = {};

  pagos.forEach(
    (pedido) => {
      const nome =
        pedido.produto ||
        "Não informado";

      contagem[nome] =
        (contagem[nome] ||
          0) +
        obterQuantidade(
          pedido
        );
    }
  );

  const totalIngressos =
    Object.values(
      contagem
    ).reduce(
      (total, quantidade) =>
        total +
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
            totalIngressos >
              0
              ? Math.round(
                (quantidade /
                  totalIngressos) *
                100
              )
              : 0,
        })
      )
      .sort(
        (a, b) =>
          b.quantidade -
          a.quantidade
      );

  const produtoMaisVendido =
    produtos[0]?.nome ||
    "Sem vendas";

  const quantidadeCamping =
    contagem[
    "Camping"
    ] || 0;

  const percentualCamping =
    totalIngressos > 0
      ? Math.round(
        (quantidadeCamping /
          totalIngressos) *
        100
      )
      : 0;

  return {
    produtoMaisVendido,

    percentualCamping,

    produtos,
  };
}

/* ==========================================
   FATURAMENTO POR DIA
========================================== */

function gerarFaturamentoPorDia(
  pedidos: Pedido[]
) {
  const agrupado:
    Record<string, number> =
    {};

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
          (agrupado[data] ||
            0) +
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
        ([data, valor]) => ({
          data,
          valor,
        })
      )
      .sort(
        (a, b) => {
          const [
            diaA,
            mesA,
            anoA,
          ] = a.data
            .split("/")
            .map(Number);

          const [
            diaB,
            mesB,
            anoB,
          ] = b.data
            .split("/")
            .map(Number);

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

  const maiorValor =
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
          (item.valor /
            maiorValor) *
          100
        ),
    })
  );
}

/* ==========================================
   DICAS FINANCEIRAS
========================================== */

function gerarDicasFinanceiras(
  resumo: any,
  pedidos: Pedido[],
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
    (resumo.totalExpirados ||
      0) > 0
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
      `O Elevador Panorâmico já vendeu ${lancamento.elevador.quantidade} ingresso(s), gerando ${lancamento.elevador.receita.toLocaleString(
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