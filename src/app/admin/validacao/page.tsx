"use client";

import { atualizarPedido, listarPedidos, Pedido } from "@/lib/pedidos";
import { QrReader } from "react-qr-reader";
import { useState } from "react";

export default function ValidacaoPage() {
  const [codigo, setCodigo] = useState("");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);

  async function buscarIngresso(codigoBusca?: string) {
    const codigoFinal = codigoBusca || codigo;

    setMensagem("");
    setPedido(null);

    if (!codigoFinal.trim()) {
      setMensagem("Digite ou escaneie o código do ingresso.");
      return;
    }

    try {
      setCarregando(true);

      const pedidos = await listarPedidos();

      const encontrado = pedidos.find(
        (item) =>
          item.codigoIngresso === codigoFinal.trim() ||
          item.id === codigoFinal.trim()
      );

      if (!encontrado) {
        setMensagem("Ingresso não encontrado.");
        return;
      }

      setPedido(encontrado);
      setCodigo(codigoFinal.trim());
      setCameraAtiva(false);
    } catch (error) {
      console.error(error);
      setMensagem("Erro ao buscar ingresso.");
    } finally {
      setCarregando(false);
    }
  }

  async function validarEntrada() {
    if (!pedido) return;

    if (pedido.statusPagamento !== "pago") {
      setMensagem("Este ingresso ainda não está pago.");
      return;
    }

    if (pedido.statusOperacional === "utilizado") {
      setMensagem("Este ingresso já foi utilizado.");
      return;
    }

    try {
      setCarregando(true);

      await atualizarPedido(pedido.id, {
        statusOperacional: "utilizado",
      });

      setPedido({
        ...pedido,
        statusOperacional: "utilizado",
      });

      setMensagem("Entrada validada com sucesso.");
    } catch (error) {
      console.error(error);
      setMensagem("Erro ao validar entrada.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-[#166534]">
          Validação de Ingresso
        </h1>

        <p className="mt-2 text-gray-600">
          Escaneie o QR Code ou digite o código do ingresso.
        </p>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-md">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setCameraAtiva((valor) => !valor)}
              className="rounded-xl bg-[#166534] px-5 py-4 font-bold text-white"
            >
              {cameraAtiva ? "Fechar câmera" : "Ler QR Code com câmera"}
            </button>

            <button
              onClick={() => {
                setCodigo("");
                setPedido(null);
                setMensagem("");
              }}
              className="rounded-xl border border-[#166534] px-5 py-4 font-bold text-[#166534]"
            >
              Limpar
            </button>
          </div>

          {cameraAtiva && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200">
              <QrReader
                constraints={{ facingMode: "environment" }}
                onResult={(result, error) => {
                  if (!!result) {
                    const texto = result.getText();

                    if (texto && texto !== codigo) {
                      buscarIngresso(texto);
                    }
                  }

                  if (!!error) {
                    return;
                  }
                }}
                className="w-full"
              />
            </div>
          )}

          <label className="mt-6 mb-2 block font-semibold text-gray-700">
            Código do ingresso
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex: PMN-48291 ou ID do pedido"
              className="w-full rounded-xl border border-gray-300 px-4 py-4 outline-none focus:border-[#166534]"
            />

            <button
              onClick={() => buscarIngresso()}
              disabled={carregando}
              className="rounded-xl bg-[#166534] px-6 py-4 font-bold text-white disabled:opacity-60"
            >
              {carregando ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {mensagem && (
            <p className="mt-4 rounded-xl bg-yellow-50 p-3 font-semibold text-yellow-800">
              {mensagem}
            </p>
          )}
        </section>

        {pedido && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-md">
            <h2 className="text-2xl font-bold text-[#166534]">
              Dados do ingresso
            </h2>

            <div className="mt-5 grid gap-3 text-gray-700">
              <p><strong>Cliente:</strong> {pedido.nome}</p>
              <p><strong>Produto:</strong> {pedido.produto}</p>
              <p><strong>Quantidade:</strong> {pedido.quantidade}</p>
              <p>
                <strong>Valor:</strong>{" "}
                {Number(pedido.valorTotal || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <p><strong>Pagamento:</strong> {pedido.statusPagamento}</p>
              <p>
                <strong>Status operacional:</strong>{" "}
                {pedido.statusOperacional || "ativo"}
              </p>
              <p><strong>Código:</strong> {pedido.codigoIngresso || pedido.id}</p>
            </div>

            <button
              onClick={validarEntrada}
              disabled={carregando}
              className="mt-6 w-full rounded-xl bg-[#15803d] px-5 py-4 font-bold text-white disabled:opacity-60"
            >
              Validar entrada
            </button>
          </section>
        )}
      </div>
    </main>
  );
}