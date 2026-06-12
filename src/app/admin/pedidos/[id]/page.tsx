"use client";

import { buscarPedidoPorId, Pedido } from "@/lib/pedidos";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PedidoDetalhePage() {
  const params = useParams();
  const router = useRouter();

  const pedidoId = String(params.id || "");

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarPedido() {
      try {
        if (!pedidoId) return;

        const dados = await buscarPedidoPorId(pedidoId);
        setPedido(dados);
      } catch (error) {
        console.error("Erro ao buscar pedido:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarPedido();
  }, [pedidoId]);

  function formatarMoeda(valor?: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarDataHora(valor?: string) {
    if (!valor) return "-";

    return new Date(valor).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatarData(valor?: string) {
    if (!valor) return "-";

    const partes = valor.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return valor;
  }

  const pedidoAny = pedido as
    | (Pedido & {
      validadoPor?: string;
      validadoEm?: string;
      utilizadoEm?: string;
      pagoEm?: string;
      dataPagamento?: string;
      pdfIngressoUrl?: string;
    })
    | null;

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#eef3ed] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <p>Carregando pedido...</p>
        </div>
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="min-h-screen bg-[#eef3ed] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.push("/admin/pedidos")}
            className="mb-6 rounded-xl bg-green-700 px-5 py-3 font-bold text-white"
          >
            Voltar
          </button>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h1 className="text-2xl font-bold text-red-700">
              Pedido não encontrado
            </h1>
          </div>
        </div>
      </main>
    );
  }

  const statusPagamentoPago = pedido.statusPagamento === "pago";
  const statusUtilizado = pedido.statusOperacional === "utilizado";

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => router.push("/admin/pedidos")}
          className="mb-6 rounded-xl bg-green-700 px-5 py-3 font-bold text-white"
        >
          ← Voltar para pedidos
        </button>

        <section className="rounded-3xl bg-white p-6 shadow-xl">
          <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-[#166534]">
                Detalhe do Pedido
              </h1>

              <p className="mt-2 text-gray-500">
                Código:{" "}
                <span className="font-bold text-gray-800">
                  {pedido.codigoIngresso || "-"}
                </span>
              </p>

              <p className="text-sm text-gray-500">ID: {pedido.id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${statusPagamentoPago
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                  }`}
              >
                Pagamento: {pedido.statusPagamento || "pendente"}
              </span>

              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${statusUtilizado
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
                  }`}
              >
                Operacional: {pedido.statusOperacional || "ativo"}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Bloco titulo="Dados do Cliente">
              <Linha label="Nome" valor={pedido.nome} />
              <Linha label="CPF" valor={pedido.cpf} />
              <Linha label="Telefone" valor={pedido.telefone} />
              <Linha label="E-mail" valor={pedido.email} />
            </Bloco>

            <Bloco titulo="Dados da Compra">
              <Linha label="Produto" valor={pedido.produto} />
              <Linha label="Tipo" valor={pedido.tipo} />
              <Linha label="Quantidade" valor={pedido.quantidade} />
              <Linha
                label="Valor unitário"
                valor={formatarMoeda(pedido.valorUnitario)}
              />
              <Linha
                label="Valor total"
                valor={formatarMoeda(pedido.valorTotal)}
              />
              <Linha label="Data da visita" valor={formatarData(pedido.dataVisita)} />
            </Bloco>

            <Bloco titulo="Pagamento">
              <Linha label="Status" valor={pedido.statusPagamento || "-"} />
              <Linha label="Valor pago" valor={formatarMoeda(pedido.valorPago)} />
              <Linha label="TXID Sicredi" valor={pedido.sicrediTxid || "-"} />
              <Linha label="Status Sicredi" valor={pedido.sicrediStatus || "-"} />
              <Linha
                label="Data do pagamento"
                valor={formatarDataHora(
                  pedidoAny?.pagoEm || pedidoAny?.dataPagamento
                )}
              />
            </Bloco>

            <Bloco titulo="Portaria">
              <Linha label="Status" valor={pedido.statusOperacional || "ativo"} />
              <Linha label="Funcionário" valor={pedidoAny?.validadoPor || "-"} />
              <Linha
                label="Validado em"
                valor={formatarDataHora(pedidoAny?.validadoEm)}
              />
              <Linha
                label="Utilizado em"
                valor={formatarDataHora(pedidoAny?.utilizadoEm)}
              />
            </Bloco>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Bloco titulo="QR Code do Ingresso">
              {pedido.qrCodeIngresso ? (
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="mb-3 text-sm text-gray-500">
                    Conteúdo salvo do QR Code:
                  </p>

                  <pre className="max-h-60 overflow-auto rounded-xl bg-gray-900 p-4 text-xs text-green-300">
                    {pedido.qrCodeIngresso}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500">QR Code ainda não gerado.</p>
              )}
            </Bloco>

            <Bloco titulo="PDF / Ingresso">
              <div className="space-y-3">
                <p className="text-gray-600">
                  O PDF do ingresso é enviado automaticamente por e-mail após o
                  pagamento confirmado.
                </p>

                {pedidoAny?.pdfIngressoUrl ? (
                  <a
                    href={pedidoAny.pdfIngressoUrl}
                    target="_blank"
                    className="inline-block rounded-xl bg-green-700 px-5 py-3 font-bold text-white"
                  >
                    Abrir PDF do ingresso
                  </a>
                ) : (
                  <div className="rounded-xl bg-yellow-50 p-4 text-yellow-800">
                    Nenhum link de PDF salvo no pedido até o momento.
                  </div>
                )}
              </div>
            </Bloco>
          </div>

          <Bloco titulo="Histórico" extraClass="mt-6">
            <div className="grid gap-3">
              <HistoricoItem
                titulo="Pedido criado"
                valor={formatarDataHora(pedido.createdAt)}
              />
              <HistoricoItem
                titulo="Última atualização"
                valor={formatarDataHora(pedido.updatedAt)}
              />
              <HistoricoItem
                titulo="Pagamento"
                valor={
                  statusPagamentoPago
                    ? `Confirmado ${formatarDataHora(
                      pedidoAny?.pagoEm || pedidoAny?.dataPagamento
                    )}`
                    : "Pendente"
                }
              />
              <HistoricoItem
                titulo="Entrada"
                valor={
                  statusUtilizado
                    ? `Utilizado em ${formatarDataHora(pedidoAny?.utilizadoEm)}`
                    : "Ainda não utilizado"
                }
              />
            </div>
          </Bloco>
        </section>
      </div>
    </main>
  );
}

function Bloco({
  titulo,
  children,
  extraClass = "",
}: {
  titulo: string;
  children: React.ReactNode;
  extraClass?: string;
}) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${extraClass}`}>
      <h2 className="mb-4 text-xl font-black text-[#166534]">{titulo}</h2>
      {children}
    </section>
  );
}

function Linha({
  label,
  valor,
}: {
  label: string;
  valor: string | number | undefined | null;
}) {
  return (
    <div className="border-b border-gray-100 py-2">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="break-words text-base font-semibold text-gray-900">
        {valor || "-"}
      </p>
    </div>
  );
}

function HistoricoItem({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-sm font-bold text-gray-500">{titulo}</p>
      <p className="mt-1 font-semibold text-gray-900">{valor}</p>
    </div>
  );
}