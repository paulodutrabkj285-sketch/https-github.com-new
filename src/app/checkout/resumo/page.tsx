"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResumoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [produto, setProduto] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorTotal, setValorTotal] = useState("0");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setPedidoId(params.get("pedidoId") || "");
    setProduto(params.get("produto") || "");
    setTipo(params.get("tipo") || "");
    setQuantidade(params.get("quantidade") || "1");
    setValorTotal(params.get("valorTotal") || params.get("valor") || "0");
  }, []);

  const queryPagamento = new URLSearchParams({
    pedidoId,
    produto,
    tipo,
    quantidade,
    valorTotal,
  }).toString();

  return (
    <main className="min-h-screen bg-[#0f2f1f] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-gray-900 shadow-xl">
        <h1 className="text-3xl font-bold text-[#14532d]">
          Resumo da compra
        </h1>

        <div className="mt-6 grid gap-3 text-lg">
          {pedidoId && (
            <p>
              <strong>Pedido:</strong> {pedidoId}
            </p>
          )}

          <p>
            <strong>Produto:</strong> {produto || tipo || "Não informado"}
          </p>

          <p>
            <strong>Quantidade:</strong> {quantidade}
          </p>

          <p>
            <strong>Valor:</strong>{" "}
            {Number(valorTotal || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>

        <Link
          href={`/checkout/pagamento?${queryPagamento}`}
          className="mt-8 inline-block rounded-xl bg-[#15803d] px-6 py-4 font-bold text-white"
        >
          Ir para pagamento
        </Link>
      </div>
    </main>
  );
}