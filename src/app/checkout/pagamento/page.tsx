"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PagamentoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valor, setValor] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setPedidoId(params.get("pedidoId") || "");
    setTipo(params.get("tipo") || "");
    setQuantidade(params.get("quantidade") || "1");
    setValor(params.get("valor") || "0");
  }, []);

  return (
    <main className="min-h-screen bg-[#0f2f1f] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-black shadow-xl">
        <h1 className="text-3xl font-bold text-[#166534]">
          Pagamento do Pedido
        </h1>

        <div className="mt-6 grid gap-3 text-lg">
          {pedidoId && (
            <p>
              <strong>Pedido:</strong> {pedidoId}
            </p>
          )}

          <p>
            <strong>Tipo:</strong> {tipo || "ingresso"}
          </p>

          <p>
            <strong>Quantidade:</strong> {quantidade}
          </p>

          <p>
            <strong>Valor:</strong> R$ {valor}
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-[#eef3ed] p-5">
          <p className="font-semibold text-[#166534]">
            Pagamento simulado temporariamente. Depois entraremos com PIX,
            cartão e webhook.
          </p>
        </div>

        <Link
          href={`/checkout/sucesso?pedidoId=${pedidoId}&status=Pagamento aprovado`}
          className="mt-8 inline-block rounded-xl bg-[#166534] px-6 py-4 font-bold text-white"
        >
          Simular pagamento aprovado
        </Link>
      </div>
    </main>
  );
}