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
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  const resumo = calcularResumoFinanceiro(pedidos);
  const dicasFinanceiras = gerarDicasFinanceiras(resumo, pedidos);
  const estatisticas = gerarEstatisticasProdutos(pedidos);

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-[#166534]">
          Dashboard Financeiro
        </h1>

        <p className="mt-2 text-gray-600">
          Acompanhamento operacional e financeiro das vendas online.
        </p>

        {carregando ? (
          <p className="mt-8 text-gray-600">Carregando dados...</p>
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

              <p className="mt-2 text-gray-600">
                Análise automática com alertas operacionais, financeiros e
                contábeis.
              </p>

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
                        <td className="p-3 font-semibold text-gray-800">
                          {pedido.nome}
                        </td>

                        <td className="p-3 text-gray-700">
                          {pedido.produto}
                        </td>

                        <td className="p-3 text-gray-700">
                          {pedido.quantidade}
                        </td>

                        <td className="p-3 text-gray-700">
                          {formatarMoeda(
                            Number(pedido.valorTotal || 0)
                          )}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              pedido.statusPagamento === "pago"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {pedido.statusPagamento || "pendente"}
                          </span>
                        </td>

                        <td className="p-3 text-gray-600">
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
  titulo: string;
  valor: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <p className="text-sm font-semibold text-gray-500">{titulo}</p>

      <h2 className="mt-3 text-2xl font-bold text-[#166534]">
        {valor}
      </h2>
    </div>
  );
}

function gerarDicasFinanceiras(resumo: any, pedidos: Pedido[]) {
  const dicas: string[] = [];

  if (resumo.totalPendentes > 10) {
    dicas.push(
      `Seu número de pedidos pendentes está alto (${resumo.totalPendentes}). Recomenda-se acompanhar pagamentos diariamente para evitar divergências.`
    );
  }

  if (resumo.totalPagos === 0) {
    dicas.push(
      "Ainda não há pedidos pagos registrados. O faturamento bruto e líquido permanecem zerados até a confirmação dos pagamentos."
    );
  }

  const totalPedidos = pedidos.length;

  const pedidosCamping = pedidos.filter(
    (p) => p.produto === "Camping"
  ).length;

  const percentualCamping =
    totalPedidos > 0
      ? Math.round((pedidosCamping / totalPedidos) * 100)
      : 0;

  if (percentualCamping > 40) {
    dicas.push(
      `Camping representa ${percentualCamping}% dos pedidos registrados. Vale acompanhar essa categoria separadamente no fechamento.`
    );
  }

  const pedidosElevador = pedidos.filter(
    (p) => p.produto === "Elevador Panorâmico"
  ).length;

  if (pedidosElevador > 0) {
    dicas.push(
      `Foram registrados ${pedidosElevador} pedidos para o Elevador Panorâmico. Essa atração pode ter controle separado de acesso e remarcação.`
    );
  }

  dicas.push(
    "Recomendação: realizar fechamento semanal comparando pedidos pagos, valores recebidos no banco e taxas descontadas."
  );

  dicas.push(
    "Para controle contábil, mantenha separado: valor bruto vendido, taxas, valor líquido recebido e data prevista de repasse."
  );

  dicas.push(
    "Antes do fechamento mensal, confira se todos os pedidos pagos possuem status atualizado, comprovante e valor conciliado."
  );

  return dicas;
}

function gerarEstatisticasProdutos(pedidos: Pedido[]) {
  const totalPedidos = pedidos.length;

  const contagem: Record<string, number> = {};

  pedidos.forEach((pedido) => {
    contagem[pedido.produto] =
      (contagem[pedido.produto] || 0) + 1;
  });

  const produtoMaisVendido =
    Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Sem vendas";

  const totalCamping = pedidos.filter(
    (p) => p.produto === "Camping"
  ).length;

  const percentualCamping =
    totalPedidos > 0
      ? Math.round((totalCamping / totalPedidos) * 100)
      : 0;

  const totalElevador = pedidos.filter(
    (p) => p.produto === "Elevador Panorâmico"
  ).length;

  return {
    produtoMaisVendido,
    percentualCamping,
    totalElevador,
  };
}