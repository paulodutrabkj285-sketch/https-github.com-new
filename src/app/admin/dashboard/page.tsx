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
              <Card titulo="Ingressos vendidos" valor={resumo.quantidadeIngressos} />
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
                        <td className="p-3 text-gray-700">{pedido.produto}</td>
                        <td className="p-3 text-gray-700">{pedido.quantidade}</td>
                        <td className="p-3 text-gray-700">
                          R$ {Number(pedido.valorTotal || 0).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                            {pedido.statusPagamento}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {pedido.createdAt
                            ? new Date(pedido.createdAt).toLocaleDateString("pt-BR")
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