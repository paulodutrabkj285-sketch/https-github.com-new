"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PagamentoPage() {
  const params = useSearchParams();

  const tipo = params.get("tipo");
  const quantidade = params.get("quantidade");
  const valor = params.get("valor");

  return (
    <main className="min-h-screen bg-[#0f2f1f] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-black shadow-xl">
        <h1 className="text-3xl font-bold text-[#166534]">
          Pagamento do Pedido
        </h1>

        <div className="mt-6 grid gap-3 text-lg">
          <p>
            <strong>Tipo:</strong> {tipo}
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
            Integração PagBank/Pix será conectada aqui.
          </p>
        </div>

        <Link
          href={`/checkout/sucesso?status=Pagamento aprovado`}
          className="mt-8 inline-block rounded-xl bg-[#166534] px-6 py-4 font-bold text-white"
        >
          Simular pagamento aprovado
        </Link>
      </div>
    </main>
  );
}