"use client";

import { buscarPedidoPorId } from "@/lib/pedidos";
import QRCode from "qrcode";
import Link from "next/link";
import { useEffect, useState } from "react";

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

        if (!id) return;

        const pedido = await buscarPedidoPorId(id);
        if (!pedido) return;

        const pagamentoConfirmado = pedido.statusPagamento === "pago";
        const divergente = pedido.statusPagamento === "valor_divergente";

        setPago(pagamentoConfirmado);
        setValorDivergente(divergente);

        if (pagamentoConfirmado) {
          setStatus("Pagamento confirmado - ingresso liberado");

          const codigo = pedido.codigoIngresso || pedido.id;
          setCodigoIngresso(codigo);

          const qrConteudo = JSON.stringify({
            codigo,
            pedidoId: pedido.id,
          });

          const qrData = await QRCode.toDataURL(qrConteudo, {
            width: 280,
            margin: 2,
          });

          setQrCode(qrData);
        } else if (divergente) {
          setStatus("Pagamento com valor divergente");
        } else {
          setStatus("Pagamento pendente");
        }
      } catch (error) {
        console.error("Erro ao carregar pedido:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarPedido();
  }, []);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 text-white"
      style={{
        backgroundImage: "url('/fotos/fundo-geral.jpg')",
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

          <h1 className="text-4xl font-bold drop-shadow-lg sm:text-5xl">
            {pago ? "Ingresso liberado!" : "Pedido registrado!"}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            {pago
              ? "Pagamento confirmado. Apresente o QR Code na entrada do parque."
              : "Seu pedido foi criado e está aguardando a confirmação do pagamento."}
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Dados do pedido
            </h2>

            <div className="space-y-4">
              {pedidoId && <Info label="Pedido" value={pedidoId} />}

              <Info label="Status" value={status} />

              {pago && codigoIngresso && (
                <Info label="Código do ingresso" value={codigoIngresso} />
              )}
            </div>

            {pago ? (
              <div className="mt-6 rounded-2xl border border-green-300 bg-green-100 p-4 text-sm leading-relaxed text-green-900">
                <strong>Ingresso válido:</strong> pagamento confirmado pelo
                Sicredi e valor conferido com o pedido.
              </div>
            ) : valorDivergente ? (
              <div className="mt-6 rounded-2xl border border-red-300 bg-red-100 p-4 text-sm leading-relaxed text-red-900">
                <strong>Pagamento com valor divergente:</strong> procure a
                equipe do parque. O QR Code não foi liberado.
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-sm leading-relaxed text-yellow-900">
                <strong>Pagamento pendente:</strong> efetue o Pix dentro do
                prazo informado. O QR Code do ingresso só será liberado após a
                confirmação automática do pagamento.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-center text-gray-900 shadow-2xl">
            <h2 className="mb-4 text-3xl font-bold text-[#166534]">
              QR Code do ingresso
            </h2>

            {pago ? (
              <p className="mb-5 text-sm text-gray-500">
                Apresente este QR Code na entrada do Parque Mundo Novo.
              </p>
            ) : (
              <p className="mb-5 text-sm text-gray-500">
                O QR Code será exibido somente após a confirmação do pagamento.
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
                  alt="QR Code do ingresso"
                  className="rounded-3xl border border-gray-200 bg-white p-4 shadow-lg"
                />
              ) : (
                <div className="flex h-[280px] w-[280px] items-center justify-center rounded-3xl border border-yellow-300 bg-yellow-100 p-6 text-center font-bold text-yellow-900">
                  Efetue o pagamento para liberar o QR Code do ingresso.
                </div>
              )}
            </div>
          </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-gray-900">{value}</p>
    </div>
  );
}