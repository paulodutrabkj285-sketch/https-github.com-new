"use client";

import { useEffect, useState } from "react";
import {
  calcularResumoFinanceiro,
  listarPedidos,
  Pedido,
} from "@/lib/pedidos";

export default function DashboardPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        const lista = await listarPedidos();
        setPedidos(lista);
      } catch (error) {
        console.error(error);
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  const resumo = calcularResumoFinanceiro(pedidos);
  const dicasFinanceiras = gerarDicasFinanceiras(resumo, pedidos);
  const estatisticas = gerarEstatisticasProdutos(pedidos);
  const faturamentoPorDia = gerarFaturamentoPorDia(pedidos);
  const entradasHoje = gerarEntradasHoje(pedidos);

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
      "Data",
      "Email",
      "Telefone",
      "Codigo Ingresso",
    ];

    const linhas = pedidos.map((pedido: any) => [
      pedido.nome || "",
      pedido.produto || "",
      pedido.quantidade || "",
      pedido.valorTotal || "",
      pedido.statusPagamento || "",
      pedido.createdAt
        ? new Date(pedido.createdAt).toLocaleDateString("pt-BR")
        : "",
      pedido.email || "",
      pedido.telefone || "",
      pedido.codigoIngresso || "",
    ]);

    const csv = [
      cabecalho.join(";"),
      ...linhas.map((linha) => linha.join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `vendas-parque-${new Date()
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-")}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportarEntradasHoje() {
    const cabecalho = [
      "Cliente",
      "CPF",
      "Produto",
      "Codigo",
      "Funcionario",
      "Data Entrada",
    ];

    const linhas = entradasHoje.map((pedido: any) => [
      pedido.nome || "",
      pedido.cpf || "",
      pedido.produto || "",
      pedido.codigoIngresso || "",
      pedido.validadoPor || "",
      pedido.utilizadoEm || pedido.validadoEm || "",
    ]);

    const csv = [
      cabecalho.join(";"),
      ...linhas.map((linha) => linha.join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "entradas-hoje.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              Acompanhamento operacional e financeiro das vendas online.
            </p>
          </div>

          <section className="flex flex-wrap gap-3">
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

        <div className="hidden print:block">
          <h1 className="text-3xl font-bold text-[#166534]">
            Relatório Financeiro - Parque Mundo Novo
          </h1>
          <p className="mt-2 text-gray-600">
            Gerado em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>

        {carregando ? (
          <p className="mt-8">Carregando...</p>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card titulo="Pedidos" valor={resumo.totalPedidos} />
              <Card titulo="Pagos" valor={resumo.totalPagos} />
              <Card titulo="Pendentes" valor={resumo.totalPendentes} />
              <Card
                titulo="Ingressos vendidos"
                valor={resumo.quantidadeIngressos}
              />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card
                titulo="Faturamento bruto"
                valor={formatarMoeda(resumo.faturamentoBruto)}
              />
              <Card
                titulo={`Taxas estimadas (${resumo.taxaPercentual}%)`}
                valor={formatarMoeda(resumo.valorTaxas)}
              />
              <Card
                titulo="Valor líquido estimado"
                valor={formatarMoeda(resumo.faturamentoLiquido)}
              />
            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <h2 className="text-2xl font-bold text-[#166534]">
                Assistente Financeiro IA
              </h2>

              <div className="mt-5 grid gap-3">
                {dicasFinanceiras.map((dica, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-green-100 bg-green-50 p-4 text-gray-700"
                  >
                    {dica}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card
                titulo="Produto mais vendido"
                valor={estatisticas.produtoMaisVendido}
              />
              <Card
                titulo="Participação Camping"
                valor={`${estatisticas.percentualCamping}%`}
              />
              <Card
                titulo="Pedidos do Elevador"
                valor={estatisticas.totalElevador}
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-md">
                <h2 className="text-2xl font-bold text-[#166534]">
                  Vendas por Produto
                </h2>

                <div className="mt-6 grid gap-4">
                  {estatisticas.produtos.map((produto) => (
                    <div key={produto.nome}>
                      <div className="mb-1 flex justify-between text-sm font-semibold">
                        <span>{produto.nome}</span>
                        <span>{produto.quantidade}</span>
                      </div>

                      <div className="h-4 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#166534]"
                          style={{ width: `${produto.percentual}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-md">
                <h2 className="text-2xl font-bold text-[#166534]">
                  Pagos x Pendentes
                </h2>

                <div className="mt-8 flex items-end gap-8">
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className="w-24 rounded-t-2xl bg-green-600"
                      style={{
                        height: `${Math.max(resumo.totalPagos * 15, 30)}px`,
                      }}
                    />

                    <p className="mt-3 font-bold text-green-700">Pagos</p>
                    <span>{resumo.totalPagos}</span>
                  </div>

                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className="w-24 rounded-t-2xl bg-yellow-500"
                      style={{
                        height: `${Math.max(resumo.totalPendentes * 15, 30)}px`,
                      }}
                    />

                    <p className="mt-3 font-bold text-yellow-700">Pendentes</p>
                    <span>{resumo.totalPendentes}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <h2 className="text-2xl font-bold text-[#166534]">
                Faturamento por Dia
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Baseado nos pedidos registrados.
              </p>

              <div className="mt-6 grid gap-4">
                {faturamentoPorDia.length === 0 ? (
                  <p className="text-gray-500">
                    Ainda não há pedidos suficientes para gerar o gráfico.
                  </p>
                ) : (
                  faturamentoPorDia.map((item) => (
                    <div key={item.data}>
                      <div className="mb-1 flex justify-between text-sm font-semibold">
                        <span>{item.data}</span>
                        <span>{formatarMoeda(item.valor)}</span>
                      </div>

                      <div className="h-5 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#1f6b38]"
                          style={{ width: `${item.percentual}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#166534]">
                  Entradas de Hoje
                </h2>

                <span className="rounded-full bg-green-100 px-4 py-2 font-bold text-green-800">
                  {entradasHoje.length} visitantes
                </span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b bg-gray-50 text-sm text-gray-600">
                      <th className="p-3">Cliente</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3">Código</th>
                      <th className="p-3">Funcionário</th>
                      <th className="p-3">Entrada</th>
                    </tr>
                  </thead>

                  <tbody>
                    {entradasHoje.length === 0 ? (
                      <tr>
                        <td className="p-3 text-gray-500" colSpan={6}>
                          Nenhuma entrada registrada hoje.
                        </td>
                      </tr>
                    ) : (
                      entradasHoje.map((pedido: any) => (
                        <tr key={pedido.id} className="border-b text-sm">
                          <td className="p-3 font-semibold">{pedido.nome}</td>
                          <td className="p-3">{pedido.cpf || "-"}</td>
                          <td className="p-3">{pedido.produto}</td>
                          <td className="p-3">{pedido.codigoIngresso}</td>
                          <td className="p-3">{pedido.validadoPor || "-"}</td>
                          <td className="p-3">
                            {pedido.utilizadoEm || pedido.validadoEm
                              ? new Date(
                                pedido.utilizadoEm || pedido.validadoEm
                              ).toLocaleString("pt-BR")
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <h2 className="mb-4 text-2xl font-bold text-[#166534]">
                Últimos pedidos
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left">
                  <thead>
                    <tr className="border-b bg-gray-50 text-sm text-gray-600">
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3">Qtd.</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Pagamento</th>
                      <th className="p-3">Data</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pedidos.slice(0, 10).map((pedido) => (
                      <tr key={pedido.id} className="border-b text-sm">
                        <td className="p-3 font-semibold">{pedido.nome}</td>
                        <td className="p-3">{pedido.produto}</td>
                        <td className="p-3">{pedido.quantidade}</td>
                        <td className="p-3">
                          {formatarMoeda(Number(pedido.valorTotal || 0))}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${pedido.statusPagamento === "pago"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {pedido.statusPagamento || "pendente"}
                          </span>
                        </td>
                        <td className="p-3">
                          {pedido.createdAt
                            ? new Date(pedido.createdAt).toLocaleDateString(
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

function Card({
  titulo,
  valor,
}: {
  titulo: string | number;
  valor: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <p className="text-sm font-semibold text-gray-500">{titulo}</p>
      <h2 className="mt-3 text-2xl font-bold text-[#166534]">{valor}</h2>
    </div>
  );
}

function gerarEntradasHoje(pedidos: Pedido[]) {
  return pedidos.filter((pedido: any) => {
    if (pedido.statusOperacional !== "utilizado") return false;

    const dataEntrada = pedido.utilizadoEm || pedido.validadoEm;

    if (!dataEntrada) return false;

    const hoje = new Date();
    const entrada = new Date(dataEntrada);

    return (
      entrada.getDate() === hoje.getDate() &&
      entrada.getMonth() === hoje.getMonth() &&
      entrada.getFullYear() === hoje.getFullYear()
    );
  });
}

function gerarDicasFinanceiras(resumo: any, pedidos: Pedido[]) {
  const dicas: string[] = [];

  if (resumo.totalPendentes > 10) {
    dicas.push(
      `Seu número de pedidos pendentes está alto (${resumo.totalPendentes}). Recomenda-se acompanhar pagamentos diariamente.`
    );
  }

  if (resumo.totalPagos === 0) {
    dicas.push(
      "Ainda não há pedidos pagos registrados. O faturamento permanece zerado até a confirmação dos pagamentos."
    );
  }

  const elevador = pedidos.filter(
    (p) => p.produto === "Elevador Panorâmico"
  ).length;

  if (elevador > 0) {
    dicas.push(
      `Foram registrados ${elevador} pedidos para o Elevador Panorâmico.`
    );
  }

  dicas.push(
    "Recomendação: realizar fechamento semanal comparando pedidos pagos e valores recebidos."
  );

  dicas.push(
    "Mantenha separado: valor bruto, taxas, valor líquido e previsão de repasse."
  );

  return dicas;
}

function gerarEstatisticasProdutos(pedidos: Pedido[]) {
  const totalPedidos = pedidos.length;
  const contagem: Record<string, number> = {};

  pedidos.forEach((pedido) => {
    contagem[pedido.produto] = (contagem[pedido.produto] || 0) + 1;
  });

  const produtos = Object.entries(contagem).map(([nome, quantidade]) => ({
    nome,
    quantidade,
    percentual:
      totalPedidos > 0 ? Math.round((quantidade / totalPedidos) * 100) : 0,
  }));

  const produtoMaisVendido =
    produtos.sort((a, b) => b.quantidade - a.quantidade)[0]?.nome ||
    "Sem vendas";

  const totalCamping = pedidos.filter((p) => p.produto === "Camping").length;

  const percentualCamping =
    totalPedidos > 0 ? Math.round((totalCamping / totalPedidos) * 100) : 0;

  const totalElevador = pedidos.filter(
    (p) => p.produto === "Elevador Panorâmico"
  ).length;

  return {
    produtoMaisVendido,
    percentualCamping,
    totalElevador,
    produtos,
  };
}

function gerarFaturamentoPorDia(pedidos: Pedido[]) {
  const agrupado: Record<string, number> = {};

  pedidos.forEach((pedido) => {
    if (!pedido.createdAt) return;

    const data = new Date(pedido.createdAt).toLocaleDateString("pt-BR");
    agrupado[data] = (agrupado[data] || 0) + Number(pedido.valorTotal || 0);
  });

  const lista = Object.entries(agrupado)
    .map(([data, valor]) => ({ data, valor }))
    .sort((a, b) => {
      const [diaA, mesA, anoA] = a.data.split("/").map(Number);
      const [diaB, mesB, anoB] = b.data.split("/").map(Number);

      return (
        new Date(anoB, mesB - 1, diaB).getTime() -
        new Date(anoA, mesA - 1, diaA).getTime()
      );
    });

  const maiorValor = Math.max(...lista.map((item) => item.valor), 1);

  return lista.map((item) => ({
    ...item,
    percentual: Math.round((item.valor / maiorValor) * 100),
  }));
}