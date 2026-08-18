"use client";

import { buscarPedidoPorId } from "@/lib/pedidos";
import QRCode from "qrcode";
import Link from "next/link";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/* =========================================================
   META PIXEL - COMPRA CONFIRMADA
========================================================= */

function enviarCompraMeta(
  pedidoId: string,
  valor: number,
  produto?: string
) {
  if (typeof window === "undefined") {
    return;
  }

  const chave = `meta_purchase_${pedidoId}`;

  if (sessionStorage.getItem(chave) === "1") {
    console.log("META PIXEL: Purchase já enviado para", pedidoId);
    return;
  }

  let tentativas = 0;
  const maxTentativas = 10;

  const tentarEnviar = () => {
    tentativas += 1;

    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", {
        value: Number(valor || 0),
        currency: "BRL",
        content_name: produto || "Ingresso Parque Mundo Novo",
        content_ids: [pedidoId],
        content_type: "product",
      });

      sessionStorage.setItem(chave, "1");

      console.log("META PIXEL: Purchase enviado", {
        pedidoId,
        valor,
        produto,
      });

      return;
    }

    if (tentativas < maxTentativas) {
      setTimeout(tentarEnviar, 500);
    } else {
      console.warn(
        "META PIXEL: fbq não ficou disponível para registrar Purchase."
      );
    }
  };

  tentarEnviar();
}

export default function SucessoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [status, setStatus] = useState("Pagamento pendente");
  const [codigoIngresso, setCodigoIngresso] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [pago, setPago] = useState(false);
  const [valorDivergente, setValorDivergente] = useState(false);

  useEffect(() => {
    async function carregarPedido() {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("pedidoId") || "";

        setPedidoId(id);

        if (!id) {
          setStatus("Pedido não encontrado");
          return;
        }

        const pedido = await buscarPedidoPorId(id);

        if (!pedido) {
          setStatus("Pedido não encontrado");
          return;
        }

        const pagamentoConfirmado =
          pedido.statusPagamento === "pago";

        const divergente =
          pedido.statusPagamento === "valor_divergente";

        setPago(pagamentoConfirmado);
        setValorDivergente(divergente);

        if (pagamentoConfirmado) {
          setStatus(
            "Pagamento confirmado - ingresso liberado"
          );

          /* ===============================================
             META PIXEL - PURCHASE
             SOMENTE PARA PAGAMENTO REALMENTE CONFIRMADO
          =============================================== */

          enviarCompraMeta(
            pedido.id,
            Number(pedido.valorTotal || 0),
            pedido.produto
          );

          /* ===============================================
             QR CODE
          =============================================== */

          const codigo =
            pedido.codigoIngresso || pedido.id;

          setCodigoIngresso(codigo);

          const qrConteudo = JSON.stringify({
            codigo,
            pedidoId: pedido.id,
          });

          const qrData = await QRCode.toDataURL(
            qrConteudo,
            {
              width: 400,
              margin: 2,
              errorCorrectionLevel: "H",
            }
          );

          setQrCode(qrData);
        } else if (divergente) {
          setStatus("Pagamento com valor divergente");
        } else {
          setStatus("Pagamento pendente");
        }
      } catch (error) {
        console.error(
          "Erro ao carregar pedido:",
          error
        );

        setStatus(
          "Não foi possível carregar o pedido"
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarPedido();
  }, []);

  function baixarQrCode() {
    if (!qrCode || !codigoIngresso) {
      alert(
        "O QR Code ainda não está disponível."
      );

      return;
    }

    const link = document.createElement("a");

    link.href = qrCode;

    link.download =
      `QR-Code-Ingresso-${codigoIngresso}.png`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 text-white"
      style={{
        backgroundImage:
          "url('/fotos/fundo-geral.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 mx-auto max-w-4xl">

        <section className="rounded-3xl border border-white/20 bg-emerald-950/75 p-6 text-center shadow-2xl backdrop-blur-md sm:p-8">

          <img
            src="/logo-final.png"
            alt="Parque Mundo Novo"
            className="mx-auto mb-5 w-28 rounded-2xl bg-white/10 p-3"
          />

          <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-200">
            Parque Mundo Novo
          </p>

          <h1 className="mt-3 text-4xl font-bold drop-shadow-lg sm:text-5xl">
            {pago
              ? "Ingresso liberado!"
              : "Pedido registrado!"}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            {pago
              ? "Pagamento confirmado. Seu ingresso digital está disponível."
              : "Seu pedido foi criado e está aguardando a confirmação do pagamento."}
          </p>

        </section>

        {pago && (
          <section className="mt-6 rounded-3xl border-2 border-red-400 bg-red-50 p-6 text-red-950 shadow-2xl">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

              <div className="text-4xl">
                ⚠️
              </div>

              <div>

                <h2 className="text-2xl font-black">
                  O comprovante de pagamento não é válido como ingresso
                </h2>

                <p className="mt-3 leading-relaxed">
                  Para entrar no Parque Mundo Novo,
                  é obrigatório apresentar o{" "}
                  <strong>
                    QR Code oficial do ingresso
                  </strong>
                  , impresso ou diretamente pelo celular.
                </p>

                <p className="mt-3 leading-relaxed">
                  O comprovante do Pix serve somente
                  para comprovar o pagamento e{" "}
                  <strong>
                    não libera a entrada no parque
                  </strong>
                  .
                </p>

                <p className="mt-3 font-bold leading-relaxed">
                  O QR Code será lido e validado na
                  portaria e poderá ser utilizado
                  somente uma vez.
                </p>

              </div>

            </div>

          </section>
        )}

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">

          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">

            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Dados do ingresso
            </h2>

            <div className="space-y-4">

              {pedidoId && (
                <Info
                  label="Número do pedido"
                  value={pedidoId}
                />
              )}

              <Info
                label="Status"
                value={status}
              />

              {pago && codigoIngresso && (
                <Info
                  label="Código do ingresso"
                  value={codigoIngresso}
                />
              )}

            </div>

            {pago ? (
              <>
                <div className="mt-6 rounded-2xl border border-green-300 bg-green-100 p-4 text-sm leading-relaxed text-green-900">

                  <strong>
                    Ingresso válido:
                  </strong>{" "}

                  pagamento confirmado automaticamente
                  pelo Sicredi e valor conferido com o
                  pedido.

                </div>

                <div className="mt-4 rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">

                  <strong>
                    Apresentação obrigatória:
                  </strong>{" "}

                  leve este ingresso com o QR Code no
                  celular ou impresso para validação na
                  portaria.

                </div>
              </>
            ) : valorDivergente ? (
              <div className="mt-6 rounded-2xl border border-red-300 bg-red-100 p-4 text-sm leading-relaxed text-red-900">

                <strong>
                  Pagamento com valor divergente:
                </strong>{" "}

                procure a equipe do parque. O QR Code
                não foi liberado.

              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-sm leading-relaxed text-yellow-900">

                <strong>
                  Pagamento pendente:
                </strong>{" "}

                efetue o Pix dentro do prazo informado.
                O QR Code do ingresso será liberado
                somente após a confirmação automática
                do pagamento.

              </div>
            )}

          </div>

          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-center text-gray-900 shadow-2xl">

            <h2 className="mb-4 text-3xl font-bold text-[#166534]">
              QR Code do ingresso
            </h2>

            {pago ? (
              <p className="mb-5 text-sm font-semibold text-gray-600">
                Apresente este QR Code na portaria do
                Parque Mundo Novo.
              </p>
            ) : (
              <p className="mb-5 text-sm text-gray-500">
                O QR Code será exibido somente após a
                confirmação do pagamento.
              </p>
            )}

            <div className="flex justify-center">

              {carregando ? (
                <div className="flex h-[280px] w-[280px] items-center justify-center rounded-3xl bg-gray-100 font-bold text-gray-500">
                  Carregando pedido...
                </div>
              ) : pago && qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code oficial do ingresso do Parque Mundo Novo"
                  className="h-[280px] w-[280px] rounded-3xl border border-gray-200 bg-white p-4 shadow-lg"
                />
              ) : (
                <div className="flex h-[280px] w-[280px] items-center justify-center rounded-3xl border border-yellow-300 bg-yellow-100 p-6 text-center font-bold text-yellow-900">
                  Efetue o pagamento para liberar o QR
                  Code oficial do ingresso.
                </div>
              )}

            </div>

            {pago && codigoIngresso && (
              <p className="mt-5 break-words text-lg font-black text-gray-900">
                Código: {codigoIngresso}
              </p>
            )}

          </div>

        </section>

        {pago && pedidoId && (
          <section className="mt-8 rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">

            <h2 className="text-center text-2xl font-black text-[#166534]">
              Salve seu ingresso
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
              Baixe o ingresso e guarde no celular ou
              imprima antes de ir ao parque. Não
              apresente apenas o comprovante do Pix.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">

              <button
                type="button"
                onClick={baixarQrCode}
                className="rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
              >
                ⬇️ Baixar QR Code
              </button>

              <a
                href={`/api/ingresso/${pedidoId}`}
                className="rounded-2xl bg-emerald-600 px-6 py-4 text-center font-bold text-white shadow-lg transition hover:bg-emerald-500 active:scale-95"
              >
                📄 Baixar ingresso em PDF
              </a>

            </div>

          </section>
        )}

        <section className="mt-8 rounded-3xl border border-yellow-300 bg-yellow-100 p-5 text-yellow-950 shadow-xl">

          <h2 className="text-xl font-black">
            Orientações para entrada no parque
          </h2>

          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">

            <li>
              Apresente o QR Code oficial do ingresso
              impresso ou pelo celular.
            </li>

            <li>
              O comprovante de pagamento Pix não é
              aceito como ingresso.
            </li>

            <li>
              A equipe da portaria fará a leitura e
              validação do QR Code.
            </li>

            <li>
              Depois de validado, o QR Code não poderá
              ser utilizado novamente.
            </li>

            <li>
              Um documento oficial com foto poderá ser
              solicitado na portaria.
            </li>

          </ul>

        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

          <Link
            href="/ingressos"
            className="rounded-2xl bg-green-600 px-6 py-4 text-center font-bold text-white shadow-lg transition hover:bg-green-500"
          >
            Comprar outro ingresso
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/30 bg-white/10 px-6 py-4 text-center font-bold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            Voltar para o início
          </Link>

        </div>

      </div>

    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">

      <p className="text-sm font-semibold text-gray-500">
        {label}
      </p>

      <p className="mt-1 break-words font-bold text-gray-900">
        {value}
      </p>

    </div>
  );
}