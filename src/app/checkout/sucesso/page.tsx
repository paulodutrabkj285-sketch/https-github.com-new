"use client";

import { buscarPedidoPorId } from "@/lib/pedidos";
import QRCode from "qrcode";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SucessoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [status, setStatus] = useState("Pagamento pendente de confirmação");
  const [codigoIngresso, setCodigoIngresso] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarPedido() {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("pedidoId") || "";

        setPedidoId(id);
        setStatus(params.get("status") || "Pagamento pendente de confirmação");

        if (!id) return;

        const pedido = await buscarPedidoPorId(id);
        if (!pedido) return;

        const codigo = pedido.codigoIngresso || pedido.id;
        setCodigoIngresso(codigo);

        const qrData = await QRCode.toDataURL(codigo, {
          width: 280,
          margin: 2,
        });

        setQrCode(qrData);
      } catch (error) {
        console.error("Erro ao gerar QR Code:", error);
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
            Pedido registrado!
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            Seu pedido foi criado e ficará aguardando a confirmação do pagamento.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Dados do ingresso
            </h2>

            <div className="space-y-4">
              {pedidoId && <Info label="Pedido" value={pedidoId} />}

              <Info label="Status" value={status} />

              {codigoIngresso && (
                <Info label="Código do ingresso" value={codigoIngresso} />
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-sm leading-relaxed text-yellow-900">
              O ingresso só deverá ser validado após confirmação do pagamento
              pela equipe do parque.
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-center text-gray-900 shadow-2xl">
            <h2 className="mb-4 text-3xl font-bold text-[#166534]">
              QR Code do ingresso
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Apresente este QR Code na entrada do Parque Mundo Novo.
            </p>

            <div className="flex justify-center">
              {carregando ? (
                <div className="flex h-[280px] w-[280px] items-center justify-center rounded-3xl bg-gray-100 font-bold text-gray-500">
                  Gerando QR Code...
                </div>
              ) : qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code do ingresso"
                  className="rounded-3xl border border-gray-200 bg-white p-4 shadow-lg"
                />
              ) : (
                <div className="flex h-[280px] w-[280px] items-center justify-center rounded-3xl bg-gray-100 font-bold text-gray-500">
                  QR Code indisponível
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