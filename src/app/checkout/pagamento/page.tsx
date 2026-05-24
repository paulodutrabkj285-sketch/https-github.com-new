"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
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
                Pagamento via PIX
              </h1>

              <p className="mt-4 max-w-3xl text-lg text-white/90">
                Escaneie o QRCode ou copie o código PIX para pagar pelo aplicativo do banco.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-5 text-3xl font-bold text-[#166534]">
              PIX QRCode
            </h2>

            <p className="mb-4 text-gray-600">
              Escaneie o QRCode abaixo ou copie o código PIX.
            </p>

            <div className="mb-6 flex justify-center">
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-lg">
                <QRCodeSVG
                  value={pixCopiaCola}
                  size={230}
                  bgColor="#ffffff"
                  fgColor="#166534"
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            <h3 className="mb-3 text-xl font-bold text-[#166534]">
              PIX copia e cola
            </h3>

            <textarea
              value={pixCopiaCola}
              readOnly
              className="h-44 w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 p-4 text-sm outline-none"
            />

            <button
              onClick={copiarPix}
              className="mt-5 w-full rounded-2xl bg-green-600 px-5 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-green-500"
            >
              Copiar PIX copia e cola
            </button>

            <div className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-sm leading-relaxed text-yellow-900">
              <strong>Atenção:</strong> nesta fase o pagamento será conferido
              manualmente. Depois, com integração bancária/API, a confirmação
              poderá ser automática.
            </div>
          </div>

          <aside className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl lg:sticky lg:top-5">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Resumo
            </h2>

            <div className="space-y-3 text-base">
              {pedidoId && (
                <p>
                  <strong>Pedido:</strong> {pedidoId}
                </p>
              )}

              <p>
                <strong>Produto:</strong> {produto || tipo || "Ingresso"}
              </p>

              <p>
                <strong>Quantidade:</strong> {quantidade}
              </p>
            </div>

            <hr className="my-6 border-gray-300" />

            <p className="mb-6 text-4xl font-bold text-[#166534]">
              {valorNumero.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>

            <Link
              href={`/checkout/sucesso?pedidoId=${pedidoId}&status=Pagamento pendente de confirmação`}
              className="block w-full rounded-2xl bg-green-600 px-5 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-green-500"
            >
              Já fiz o PIX
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Após clicar, o pedido ficará pendente até a confirmação do pagamento.
            </p>
          </aside>
        </section>
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