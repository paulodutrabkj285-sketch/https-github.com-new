"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PagamentoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [produto, setProduto] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorTotal, setValorTotal] = useState("0");

  const chavePix = "30748559000165";
  const favorecido = "PARQUE MUNDO NOVO";
  const cidade = "URUBICI";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setPedidoId(params.get("pedidoId") || "");
    setProduto(params.get("produto") || "");
    setTipo(params.get("tipo") || "");
    setQuantidade(params.get("quantidade") || "1");
    setValorTotal(params.get("valorTotal") || params.get("valor") || "0");
  }, []);

  const valorNumero = Number(valorTotal || 0);

  const pixCopiaCola = useMemo(() => {
    return gerarPixCopiaCola({
      chavePix,
      nomeRecebedor: favorecido,
      cidade,
      valor: valorNumero,
      txid: pedidoId || "PMN",
    });
  }, [pedidoId, valorNumero]);

  async function copiarPix() {
    await navigator.clipboard.writeText(pixCopiaCola);
    alert("PIX copia e cola copiado!");
  }

  return (
    <main className="min-h-screen bg-[#0f2f1f] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-black shadow-xl">
        <h1 className="text-3xl font-bold text-[#166534]">
          Pagamento via PIX
        </h1>

        <div className="mt-6 grid gap-3 text-lg">
          {pedidoId && (
            <p>
              <strong>Pedido:</strong> {pedidoId}
            </p>
          )}

          <p>
            <strong>Produto:</strong> {produto || tipo || "ingresso"}
          </p>

          <p>
            <strong>Quantidade:</strong> {quantidade}
          </p>

          <p>
            <strong>Valor:</strong>{" "}
            {valorNumero.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-[#eef3ed] p-5">
          <h2 className="text-xl font-bold text-[#166534]">
            PIX copia e cola
          </h2>

          <p className="mt-3 text-sm text-gray-700">
            Copie o código abaixo e cole no aplicativo do banco.
          </p>

          <textarea
            value={pixCopiaCola}
            readOnly
            className="mt-4 h-36 w-full rounded-xl border border-gray-300 p-3 text-sm"
          />

          <button
            onClick={copiarPix}
            className="mt-5 w-full rounded-xl bg-[#166534] px-5 py-4 font-bold text-white"
          >
            Copiar PIX copia e cola
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-yellow-50 p-5 text-yellow-900">
          <strong>Atenção:</strong> nesta fase o pagamento será conferido
          manualmente. Depois, com a API PIX da Cresol, a confirmação será
          automática.
        </div>

        <Link
          href={`/checkout/sucesso?pedidoId=${pedidoId}&status=Pagamento pendente de confirmação`}
          className="mt-8 inline-block rounded-xl bg-[#166534] px-6 py-4 font-bold text-white"
        >
          Já fiz o PIX
        </Link>
      </div>
    </main>
  );
}

function gerarPixCopiaCola({
  chavePix,
  nomeRecebedor,
  cidade,
  valor,
  txid,
}: {
  chavePix: string;
  nomeRecebedor: string;
  cidade: string;
  valor: number;
  txid: string;
}) {
  const merchantAccountInfo =
    montaCampo("00", "br.gov.bcb.pix") + montaCampo("01", chavePix);

  const payloadSemCRC =
    montaCampo("00", "01") +
    montaCampo("26", merchantAccountInfo) +
    montaCampo("52", "0000") +
    montaCampo("53", "986") +
    montaCampo("54", valor.toFixed(2)) +
    montaCampo("58", "BR") +
    montaCampo("59", limparTexto(nomeRecebedor).slice(0, 25)) +
    montaCampo("60", limparTexto(cidade).slice(0, 15)) +
    montaCampo("62", montaCampo("05", limparTexto(txid).slice(0, 25))) +
    "6304";

  return payloadSemCRC + crc16(payloadSemCRC);
}

function montaCampo(id: string, valor: string) {
  const tamanho = valor.length.toString().padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

function limparTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 .-]/gi, "")
    .toUpperCase();
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}