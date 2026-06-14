"use client";

import { buscarPedidoPorId } from "@/lib/pedidos";
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
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao">("pix");

  const mensagemPixExpirado =
    "PIX expirado. Gere um novo pedido para realizar o pagamento.";

  useEffect(() => {
    async function carregarPix() {
      try {
        const params = new URLSearchParams(window.location.search);

        const id = params.get("pedidoId") || "";
        const prod = params.get("produto") || "";
        const tp = params.get("tipo") || "";
        const qtd = params.get("quantidade") || "1";
        const valor = params.get("valorTotal") || params.get("valor") || "0";
        const cpfUrl = params.get("cpf") || "";

        setPedidoId(id);
        setProduto(prod);
        setTipo(tp);
        setQuantidade(qtd);
        setValorTotal(valor);

        if (!id) {
          setErro("Pedido não informado.");
          return;
        }

        if (!cpfUrl) {
          setErro("CPF não chegou na tela de pagamento.");
          return;
        }

        const pedido: any = await buscarPedidoPorId(id);

        if (pedido?.statusPagamento === "pago") {
          window.location.href = `/checkout/sucesso?pedidoId=${id}&status=Pagamento confirmado`;
          return;
        }

        if (pedido?.statusPagamento === "expirado") {
          setErro(mensagemPixExpirado);
          return;
        }

        if (pedido?.expiracaoPix) {
          const expiracao = new Date(pedido.expiracaoPix).getTime();

          if (Date.now() > expiracao && pedido.statusPagamento !== "pago") {
            setErro(mensagemPixExpirado);
            return;
          }
        }

        const resposta = await fetch("/api/sicredi/criar-pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pedidoId: id,
            nome: params.get("nome") || "Cliente Parque Mundo Novo",
            email: params.get("email") || "cliente@email.com",
            cpf: cpfUrl,
            produto: prod || tp || "Ingresso",
            valorTotal: valor,
            quantidade: qtd,
          }),
        });

        const data = await resposta.json();

        if (!resposta.ok || !data.ok) {
          setErro(
            data?.error ||
            data?.details?.detail ||
            "Não foi possível gerar o Pix pelo Sicredi."
          );
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

  useEffect(() => {
    if (!pedidoId) return;

    const intervalo = setInterval(async () => {
      try {
        const pedido: any = await buscarPedidoPorId(pedidoId);

        if (!pedido) return;

        if (pedido.statusPagamento === "pago") {
          window.location.href = `/checkout/sucesso?pedidoId=${pedidoId}&status=Pagamento confirmado`;
          return;
        }

        if (pedido.statusPagamento === "valor_divergente") {
          setErro(
            "Pagamento recebido com valor diferente do pedido. Procure a equipe do parque."
          );
          return;
        }

        if (pedido.statusPagamento === "expirado") {
          setErro(mensagemPixExpirado);
          return;
        }

        if (pedido.expiracaoPix) {
          const expiracao = new Date(pedido.expiracaoPix).getTime();

          if (Date.now() > expiracao && pedido.statusPagamento !== "pago") {
            setErro(mensagemPixExpirado);
            return;
          }
        }
      } catch (error) {
        console.error("Erro ao verificar status do pedido:", error);
      }
    }, 5000);

    return () => clearInterval(intervalo);
  }, [pedidoId]);

  const valorNumero = Number(valorTotal || 0);
  const pixExpirado = erro === mensagemPixExpirado;

  async function copiarPix() {
    if (!pixCopiaCola || pixExpirado) return;
    await navigator.clipboard.writeText(pixCopiaCola);
    alert("PIX copia e cola copiado!");
  }

  async function verificarPagamento() {
    if (pixExpirado) return;

    try {
      setVerificando(true);
      setErro("");
      setMensagem("Consultando pagamento no Sicredi...");

      const resposta = await fetch("/api/sicredi/verificar-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });

      const data = await resposta.json();

      if (!resposta.ok || !data.ok) {
        setMensagem("");
        setErro(data?.mensagem || data?.error || "Pagamento ainda não confirmado.");
        return;
      }

      if (data.pago) {
        window.location.href = `/checkout/sucesso?pedidoId=${pedidoId}&status=Pagamento confirmado`;
        return;
      }

      setMensagem(data?.mensagem || "Pagamento ainda não confirmado pelo Sicredi.");
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
      setMensagem("");
      setErro("Erro ao consultar pagamento.");
    } finally {
      setVerificando(false);
    }
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
                Escolha sua forma de pagamento
              </h1>

              <p className="mt-4 max-w-3xl text-lg text-white/90">
                Pague via Pix Sicredi ou acompanhe a implantação do pagamento
                com cartão.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">
            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormaPagamento("pix")}
                className={`rounded-2xl p-4 text-lg font-bold transition ${formaPagamento === "pix"
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700"
                  }`}
              >
                PIX
              </button>

              <button
                type="button"
                onClick={() => setFormaPagamento("cartao")}
                className={`rounded-2xl p-4 text-lg font-bold transition ${formaPagamento === "cartao"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700"
                  }`}
              >
                Cartão
              </button>
            </div>

            {formaPagamento === "cartao" ? (
              <div className="rounded-2xl border border-blue-300 bg-blue-50 p-6">
                <h2 className="mb-4 text-3xl font-bold text-blue-700">
                  Cartão de Crédito
                </h2>

                <p className="mb-4 text-gray-700">
                  A opção de cartão está em implantação junto ao Sicredi.
                  Estamos aguardando a homologação do gateway e do antifraude.
                </p>

                <div className="grid gap-4 rounded-2xl border bg-white p-5">
                  <div>
                    <label className="mb-2 block font-bold text-gray-700">
                      Nome impresso no cartão
                    </label>
                    <input
                      disabled
                      placeholder="Disponível em breve"
                      className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-bold text-gray-700">
                      Número do cartão
                    </label>
                    <input
                      disabled
                      placeholder="0000 0000 0000 0000"
                      className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        Validade
                      </label>
                      <input
                        disabled
                        placeholder="MM/AA"
                        className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-gray-700">
                        CVV
                      </label>
                      <input
                        disabled
                        placeholder="123"
                        className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-bold text-gray-700">
                      Parcelas
                    </label>
                    <select
                      disabled
                      className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3"
                    >
                      <option>1x de {valorNumero.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4 text-sm text-gray-700">
                  <p>
                    <strong>Status:</strong> Em homologação
                  </p>
                  <p>
                    <strong>Gateway:</strong> Aguardando definição Sicredi
                  </p>
                  <p>
                    <strong>Antifraude:</strong> Aguardando definição
                  </p>
                  <p>
                    <strong>Integração:</strong> Preparada no checkout
                  </p>
                </div>

                <button
                  disabled
                  className="mt-5 w-full rounded-2xl bg-gray-400 px-5 py-4 text-lg font-bold text-white"
                >
                  Cartão disponível em breve
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-5 text-3xl font-bold text-[#166534]">
                  PIX QRCode
                </h2>

                {carregando ? (
                  <div className="rounded-2xl bg-gray-100 p-6 text-center font-bold text-gray-600">
                    Gerando Pix pelo Sicredi...
                  </div>
                ) : pixExpirado ? (
                  <div className="rounded-2xl border border-red-300 bg-red-100 p-5 text-red-800">
                    <h3 className="text-2xl font-bold">PIX expirado</h3>
                    <p className="mt-2">
                      Gere um novo pedido para realizar o pagamento.
                    </p>
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
                      <strong>Pagamento seguro:</strong> cobrança Pix gerada
                      pelo Sicredi para o Parque Mundo Novo.
                    </div>
                  </>
                )}
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

              <p>
                <strong>Forma:</strong>{" "}
                {formaPagamento === "pix" ? "Pix" : "Cartão"}
              </p>
            </div>

            <hr className="my-6 border-gray-300" />

            <p className="mb-6 text-4xl font-bold text-[#166534]">
              {valorNumero.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>

            {formaPagamento === "cartao" ? (
              <div className="mb-4 rounded-2xl border border-blue-300 bg-blue-100 p-4 text-sm leading-relaxed text-blue-900">
                Pagamento com cartão em fase de homologação com Sicredi.
              </div>
            ) : pixExpirado ? (
              <div className="mb-4 rounded-2xl border border-red-300 bg-red-100 p-4 text-sm leading-relaxed text-red-900">
                Este Pix expirou. Volte para a página de ingressos e crie um
                novo pedido.
              </div>
            ) : (
              <div className="mb-4 rounded-2xl border border-blue-300 bg-blue-100 p-4 text-sm leading-relaxed text-blue-900">
                Após o pagamento, esta tela verifica automaticamente e libera o
                ingresso quando o Sicredi confirmar.
              </div>
            )}

            {formaPagamento === "pix" && (
              <button
                type="button"
                onClick={verificarPagamento}
                disabled={verificando || pixExpirado}
                className="block w-full rounded-2xl bg-green-600 px-5 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pixExpirado
                  ? "PIX expirado"
                  : verificando
                    ? "Verificando pagamento..."
                    : "Já fiz o PIX"}
              </button>
            )}

            {formaPagamento === "cartao" && (
              <button
                type="button"
                disabled
                className="block w-full rounded-2xl bg-gray-400 px-5 py-4 text-center text-lg font-bold text-white shadow-lg disabled:cursor-not-allowed"
              >
                Cartão em implantação
              </button>
            )}

            {mensagem && !pixExpirado && formaPagamento === "pix" && (
              <div className="mt-4 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-sm leading-relaxed text-yellow-900">
                {mensagem}
              </div>
            )}

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              O ingresso só será liberado se o pagamento for confirmado e o
              valor pago for igual ao valor do pedido.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}