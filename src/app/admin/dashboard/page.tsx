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
  const dicasFinanceiras = gerarDicasFinanceiras(resumo);

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
                valor={`R$ ${resumo.faturamentoBruto.toFixed(2)}`}
              />
              <Card
                titulo={`Taxas estimadas (${resumo.taxaPercentual}%)`}
                valor={`R$ ${resumo.valorTaxas.toFixed(2)}`}
              />
              <Card
                titulo="Valor líquido estimado"
                valor={`R$ ${resumo.faturamentoLiquido.toFixed(2)}`}
              />
            </section>

            <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
              <h2 className="text-2xl font-bold text-[#166534]">
                Assistente Financeiro IA
              </h2>

              <p className="mt-2 text-gray-600">
                Análise automática com dicas para acompanhamento operacional,
                financeiro e contábil.
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
                          R$ {Number(pedido.valorTotal || 0).toFixed(2)}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              pedido.statusPagamento === "pago"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {pedido.statusPagamento}
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

function Card({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <p className="text-sm font-semibold text-gray-500">{titulo}</p>
      <h2 className="mt-3 text-2xl font-bold text-[#166534]">{valor}</h2>
    </div>
  );
}

function gerarDicasFinanceiras(resumo: {
  totalPedidos: number;
  totalPagos: number;
  totalPendentes: number;
  faturamentoBruto: number;
  taxaPercentual: number;
  valorTaxas: number;
  faturamentoLiquido: number;
}) {
  const dicas: string[] = [];

  if (resumo.totalPendentes > 0) {
    dicas.push(
      `Existem ${resumo.totalPendentes} pedidos pendentes. É importante acompanhar esses pagamentos para evitar divergência entre pedidos gerados e valores recebidos.`
    );
  }

  if (resumo.totalPagos === 0) {
    dicas.push(
      "Ainda não há pedidos pagos registrados. O faturamento bruto e líquido permanecem zerados até a confirmação dos pagamentos."
    );
  }

  if (resumo.faturamentoBruto > 0) {
    dicas.push(
      `O faturamento bruto registrado é de R$ ${resumo.faturamentoBruto.toFixed(
        2
      )}. Após taxas estimadas, o valor líquido previsto é de R$ ${resumo.faturamentoLiquido.toFixed(
        2
      )}.`
    );
  }

  if (resumo.valorTaxas > 0) {
    dicas.push(
      `As taxas estimadas somam R$ ${resumo.valorTaxas.toFixed(
        2
      )}. Confira se esse valor bate com as taxas reais cobradas pela plataforma, PagBank ou maquininha.`
    );
  }

  dicas.push(
    "Recomendação: realizar fechamento semanal comparando pedidos pagos, valores recebidos no banco e taxas descontadas."
  );

  dicas.push(
    "Para controle contábil, mantenha separado: valor bruto vendido, taxas, valor líquido recebido e data prevista de repasse."
  );

  dicas.push(
    "Antes do fechamento mensal, confira se todos os pedidos pagos possuem comprovante, status atualizado e valor líquido conciliado."
  );

  return dicas;
}