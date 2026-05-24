"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResumoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [produto, setProduto] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorTotal, setValorTotal] = useState("0");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataVisita, setDataVisita] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [diarias, setDiarias] = useState("");
  const [quantidadePessoas, setQuantidadePessoas] = useState("");
  const [tipoCamping, setTipoCamping] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setPedidoId(params.get("pedidoId") || "");
    setProduto(params.get("produto") || "");
    setTipo(params.get("tipo") || "");
    setQuantidade(params.get("quantidade") || "1");
    setValorTotal(params.get("valorTotal") || params.get("valor") || "0");
    setNome(params.get("nome") || "");
    setEmail(params.get("email") || "");
    setTelefone(params.get("telefone") || "");
    setDataVisita(params.get("dataVisita") || "");
    setDataEntrada(params.get("dataEntrada") || "");
    setDiarias(params.get("diarias") || params.get("noites") || "");
    setQuantidadePessoas(params.get("quantidadePessoas") || "");
    setTipoCamping(params.get("tipoCamping") || "");
  }, []);

  const queryPagamento = new URLSearchParams({
    pedidoId,
    produto,
    tipo,
    quantidade,
    valorTotal,
  }).toString();

  const valorFormatado = Number(valorTotal || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const dataPrincipal = dataVisita || dataEntrada || "";

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 text-white"
      style={{
        backgroundImage: "url('/fotos/fundo-geral.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <section className="rounded-3xl border border-white/20 bg-emerald-950/75 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="flex w-full max-w-[160px] items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-4">
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                className="w-full max-w-[130px] rounded-xl"
              />
            </div>

            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg sm:text-5xl">
                Resumo da compra
              </h1>

              <p className="mt-4 max-w-3xl text-lg text-white/90">
                Confira os dados antes de seguir para o pagamento.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Dados do pedido
            </h2>

            <div className="grid gap-4 text-base sm:grid-cols-2">
              {pedidoId && <Info label="Pedido" value={pedidoId} />}
              <Info label="Produto" value={produto || tipo || "Não informado"} />
              <Info label="Quantidade" value={quantidade} />
              {dataPrincipal && <Info label="Data" value={dataPrincipal} />}
              {nome && <Info label="Nome" value={nome} />}
              {telefone && <Info label="Telefone" value={telefone} />}
              {email && <Info label="E-mail" value={email} />}
              {tipoCamping && <Info label="Tipo camping" value={tipoCamping} />}
              {quantidadePessoas && (
                <Info label="Pessoas" value={quantidadePessoas} />
              )}
              {diarias && <Info label="Diárias" value={diarias} />}
            </div>
          </div>

          <aside className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl lg:sticky lg:top-5">
            <h2 className="mb-5 text-3xl font-bold text-[#166534]">
              Total
            </h2>

            <p className="mb-6 text-4xl font-bold text-[#166534]">
              {valorFormatado}
            </p>

            <Link
              href={`/checkout/pagamento?${queryPagamento}`}
              className="block w-full rounded-2xl bg-green-600 px-5 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-green-500"
            >
              Ir para pagamento
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Após a confirmação do pagamento, o ingresso será liberado com QR Code.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-gray-900">{value}</p>
    </div>
  );
}