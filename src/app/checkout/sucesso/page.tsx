"use client";

import { buscarPedidoPorId } from "@/lib/pedidos";
import QRCode from "qrcode";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SucessoPage() {
  const [pedidoId, setPedidoId] = useState("");
  const [status, setStatus] = useState("Pagamento aprovado");
  const [codigoIngresso, setCodigoIngresso] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarPedido() {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("pedidoId") || "";

        setPedidoId(id);
        setStatus(params.get("status") || "Pagamento aprovado");

        if (!id) return;

        const pedido = await buscarPedidoPorId(id);

        if (!pedido) return;

        const codigo = pedido.codigoIngresso || pedido.id;

        setCodigoIngresso(codigo);

        const qrData = await QRCode.toDataURL(codigo, {
          width: 260,
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
    <main className="min-h-screen bg-[#0f2f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 text-center text-gray-800 shadow-xl sm:p-8">
        <img
          src="/logo-final.png"
          alt="Parque Mundo Novo"
          className="mx-auto mb-5 w-28 rounded-2xl"
        />

        <h1 className="text-3xl font-bold text-[#15803d]">
          Compra realizada com sucesso!
        </h1>

        <p className="mt-3 text-gray-600">
          Seu ingresso foi gerado para apresentação na entrada do parque.
        </p>

        <div className="mt-6 rounded-2xl bg-[#eef3ed] p-4 text-left">
          {pedidoId && (
            <p>
              <strong>Pedido:</strong> {pedidoId}
            </p>
          )}

          <p>
            <strong>Status:</strong> {status}
          </p>

          {codigoIngresso && (
            <p>
              <strong>Código do ingresso:</strong> {codigoIngresso}
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          {carregando ? (
            <div className="flex h-[260px] w-[260px] items-center justify-center rounded-2xl bg-gray-100 font-bold text-gray-500">
              Gerando QR Code...
            </div>
          ) : qrCode ? (
            <img
              src={qrCode}
              alt="QR Code do ingresso"
              className="rounded-2xl border border-gray-200 bg-white p-3"
            />
          ) : (
            <div className="flex h-[260px] w-[260px] items-center justify-center rounded-2xl bg-gray-100 font-bold text-gray-500">
              QR Code indisponível
            </div>
          )}
        </div>

        <p className="mt-5 text-sm text-gray-500">
          O QR Code deverá ser apresentado na entrada. A validação será feita
          pela equipe do Parque Mundo Novo.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/ingressos"
            className="rounded-xl bg-[#15803d] px-5 py-4 font-bold text-white"
          >
            Comprar outro ingresso
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-[#15803d] px-5 py-4 font-bold text-[#15803d]"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
