"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

export default function PagamentoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [produto, setProduto] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorTotal, setValorTotal] = useState("0");
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarPix() {
      try {
        const params = new URLSearchParams(window.location.search);

        const id = params.get("pedidoId") || "";
        const prod = params.get("produto") || "";
        const tp = params.get("tipo") || "";
        const qtd = params.get("quantidade") || "1";
        const valor = params.get("valorTotal") || params.get("valor") || "0";

        setPedidoId(id);
        setProduto(prod);
        setTipo(tp);
        setQuantidade(qtd);
        setValorTotal(valor);

        const resposta = await fetch("/api/sicredi/criar-pix", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pedidoId: id,
            nome: params.get("nome") || "Cliente Parque Mundo Novo",
            email: params.get("email") || "cliente@email.com",
            cpf: params.get("cpf") || "00000000000",
            produto: prod || tp || "Ingresso",
            valorTotal: valor,
            quantidade: qtd,
          }),
        });

        const data = await resposta.json();

        if (!resposta.ok || !data.ok) {
          console.error("Erro Sicredi:", data);
          setErro("Não foi possível gerar o Pix pelo Sicredi.");
          return;
        }

        setPixCopiaCola(data.pixCopiaCola || "");
      } catch (error) {
        console.error("Erro ao carregar Pix:", error);
        setErro("Erro ao gerar pagamento Pix.");
      } finally {
        setCarregando(false);
      }
    }

    carregarPix();
  }, []);

  const valorNumero = Number(valorTotal || 0);

  async function copiarPix() {
    if (!pixCopiaCola) return;
    await navigator.clipboard.writeText(pixCopiaCola);
    alert("PIX copia e cola copiado!");
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 text-white"
      style={{ backgroundImage: "url('/fotos/fundo-geral.jpg')" }}
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
                Pix gerado automaticamente pela integração Sicredi.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-5 text-3xl font-bold text-[#166534]">
              PIX QRCode
            </h2>

            {carregando ? (
              <div className="rounded-2xl bg-gray-100 p-6 text-center font-bold text-gray-600">
                Gerando Pix pelo Sicredi...
              </div>
            ) : erro ? (
              <div className="rounded-2xl border border-red-300 bg-red-100 p-5 text-red-800">
                {erro}
              </div>
            ) : (
              <>
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

                <div className="mt-6 rounded-2xl border border-green-300 bg-green-100 p-4 text-sm leading-relaxed text-green-900">
                  <strong>Pagamento seguro:</strong> cobrança Pix gerada pelo
                  Sicredi para o Parque Mundo Novo.
                </div>
              </>
            )}
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
              Após clicar, o pedido ficará pendente até confirmação do pagamento.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}