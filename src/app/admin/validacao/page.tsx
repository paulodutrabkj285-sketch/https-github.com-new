"use client";

import { atualizarPedido, listarPedidos, Pedido } from "@/lib/pedidos";
import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

export default function ValidacaoPage() {
  const [codigo, setCodigo] = useState("");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processandoQrRef = useRef(false);

  useEffect(() => {
    return () => {
      pararCamera();
    };
  }, []);

  async function pararCamera() {
    try {
      if (scannerRef.current) {
        const scanner = scannerRef.current;

        if (scanner.isScanning) {
          await scanner.stop();
        }

        scannerRef.current = null;
      }
    } catch (error) {
      console.error("Erro ao parar câmera:", error);
    } finally {
      setCameraAtiva(false);
    }
  }

  async function iniciarCamera() {
    setMensagem("");
    setPedido(null);

    try {
      await pararCamera();

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          if (processandoQrRef.current) return;

          processandoQrRef.current = true;

          try {
            const codigoLido = decodedText.trim();

            setCodigo(codigoLido);

            await pararCamera();

            await buscarIngressoPorCodigo(codigoLido);
          } finally {
            setTimeout(() => {
              processandoQrRef.current = false;
            }, 1000);
          }
        },
        () => {
          // Ignora erros normais enquanto a câmera procura um QR Code.
        }
      );

      setCameraAtiva(true);
    } catch (error) {
      console.error("Erro ao iniciar câmera:", error);

      setMensagem(
        "Não foi possível abrir a câmera. Verifique a permissão da câmera no navegador."
      );

      setCameraAtiva(false);
    }
  }

  function obterStatusVisual(pedidoAtual: Pedido | null) {
    if (!pedidoAtual) return null;

    const statusPagamento = String(
      pedidoAtual.statusPagamento || ""
    ).toLowerCase();

    const statusOperacional = String(
      pedidoAtual.statusOperacional || ""
    ).toLowerCase();

    if (statusOperacional === "cancelado") {
      return {
        titulo: "INGRESSO CANCELADO",
        detalhe:
          "Este ingresso foi cancelado/reembolsado e não pode ser utilizado.",
        classe: "border-red-600 bg-red-100 text-red-900",
        podeValidar: false,
      };
    }

    if (statusOperacional === "utilizado") {
      return {
        titulo: "INGRESSO JÁ UTILIZADO",
        detalhe: "Este ingresso já teve a entrada confirmada.",
        classe: "border-red-500 bg-red-50 text-red-900",
        podeValidar: false,
      };
    }

    if (statusOperacional === "bloqueado") {
      return {
        titulo: "ENTRADA BLOQUEADA",
        detalhe: "Este ingresso está bloqueado.",
        classe: "border-red-500 bg-red-50 text-red-900",
        podeValidar: false,
      };
    }

    if (statusPagamento !== "pago") {
      return {
        titulo: "PAGAMENTO PENDENTE",
        detalhe:
          "Não liberar a entrada enquanto o pagamento não estiver confirmado.",
        classe: "border-yellow-500 bg-yellow-50 text-yellow-900",
        podeValidar: false,
      };
    }

    return {
      titulo: "INGRESSO LIBERADO",
      detalhe: "Pagamento confirmado. Entrada pode ser validada.",
      classe: "border-green-500 bg-green-50 text-green-900",
      podeValidar: true,
    };
  }

  async function buscarIngressoPorCodigo(codigoBusca: string) {
    setMensagem("");
    setPedido(null);

    const codigoLimpo = codigoBusca.trim();

    if (!codigoLimpo) {
      setMensagem("Digite ou leia o código do ingresso.");
      return;
    }

    try {
      setCarregando(true);

      const pedidos = await listarPedidos();

      const encontrado = pedidos.find((item) => {
        const codigoIngresso = String(
          item.codigoIngresso || ""
        ).trim();

        const idPedido = String(item.id || "").trim();

        return (
          codigoIngresso.toLowerCase() === codigoLimpo.toLowerCase() ||
          idPedido.toLowerCase() === codigoLimpo.toLowerCase()
        );
      });

      if (!encontrado) {
        setMensagem("Ingresso não encontrado.");
        return;
      }

      setPedido(encontrado);

      const statusOperacional = String(
        encontrado.statusOperacional || ""
      ).toLowerCase();

      const statusPagamento = String(
        encontrado.statusPagamento || ""
      ).toLowerCase();

      if (statusOperacional === "cancelado") {
        setMensagem(
          "ATENÇÃO: este ingresso foi cancelado/reembolsado. Não liberar entrada."
        );
        return;
      }

      if (statusOperacional === "utilizado") {
        setMensagem(
          "ATENÇÃO: este ingresso já foi utilizado anteriormente."
        );
        return;
      }

      if (statusOperacional === "bloqueado") {
        setMensagem("ATENÇÃO: este ingresso está bloqueado.");
        return;
      }

      if (statusPagamento !== "pago") {
        setMensagem(
          "ATENÇÃO: pagamento ainda não confirmado. Não liberar entrada."
        );
        return;
      }

      setMensagem("Ingresso encontrado e liberado para validação.");
    } catch (error) {
      console.error("Erro ao buscar ingresso:", error);

      setMensagem("Erro ao buscar ingresso.");
    } finally {
      setCarregando(false);
    }
  }

  async function buscarIngresso() {
    await buscarIngressoPorCodigo(codigo);
  }

  async function validarEntrada() {
    if (!pedido) return;

    const statusPagamento = String(
      pedido.statusPagamento || ""
    ).toLowerCase();

    const statusOperacional = String(
      pedido.statusOperacional || ""
    ).toLowerCase();

    if (statusOperacional === "cancelado") {
      setMensagem(
        "ENTRADA BLOQUEADA: este ingresso foi cancelado/reembolsado."
      );
      return;
    }

    if (statusOperacional === "utilizado") {
      setMensagem("Este ingresso já foi utilizado.");
      return;
    }

    if (statusOperacional === "bloqueado") {
      setMensagem("Este ingresso está bloqueado.");
      return;
    }

    if (statusPagamento !== "pago") {
      setMensagem(
        "Este ingresso ainda não possui pagamento confirmado."
      );
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

      setMensagem(
        "ENTRADA VALIDADA COM SUCESSO. Este ingresso agora está marcado como utilizado."
      );
    } catch (error) {
      console.error("Erro ao validar entrada:", error);

      setMensagem("Erro ao validar entrada.");
    } finally {
      setCarregando(false);
    }
  }

  const statusVisual = obterStatusVisual(pedido);

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-[#166534]">
          Validação de Ingresso
        </h1>

        <p className="mt-2 text-gray-600">
          Leia o QR Code ou digite o código do ingresso para validar a
          entrada.
        </p>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-md">
          <h2 className="text-xl font-bold text-[#166534]">
            Leitor de QR Code
          </h2>

          <div
            id="reader"
            className="mx-auto mt-4 w-full max-w-md overflow-hidden rounded-2xl"
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={iniciarCamera}
              disabled={cameraAtiva || carregando}
              className="rounded-xl bg-[#166534] px-5 py-4 font-bold text-white disabled:opacity-60"
            >
              {cameraAtiva ? "Câmera ativa" : "Abrir câmera"}
            </button>

            <button
              type="button"
              onClick={pararCamera}
              disabled={!cameraAtiva}
              className="rounded-xl border border-[#166534] bg-white px-5 py-4 font-bold text-[#166534] disabled:opacity-40"
            >
              Fechar câmera
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-md">
          <label className="mb-2 block font-semibold text-gray-700">
            Código do ingresso
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  buscarIngresso();
                }
              }}
              placeholder="Ex.: PMN-89216 ou ID do pedido"
              className="w-full rounded-xl border border-gray-300 px-4 py-4 text-gray-900 outline-none focus:border-[#166534]"
            />

            <button
              type="button"
              onClick={buscarIngresso}
              disabled={carregando}
              className="rounded-xl bg-[#166534] px-6 py-4 font-bold text-white disabled:opacity-60"
            >
              {carregando ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {mensagem && (
            <p className="mt-4 rounded-xl bg-gray-100 p-4 font-semibold text-gray-800">
              {mensagem}
            </p>
          )}
        </section>

        {pedido && statusVisual && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-md">
            <div
              className={`rounded-2xl border-2 p-5 ${statusVisual.classe}`}
            >
              <h2 className="text-2xl font-black">
                {statusVisual.titulo}
              </h2>

              <p className="mt-2 font-semibold">
                {statusVisual.detalhe}
              </p>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-[#166534]">
              Dados do ingresso
            </h2>

            <div className="mt-5 grid gap-3 text-gray-700">
              <p>
                <strong>Cliente:</strong> {pedido.nome || "-"}
              </p>

              <p>
                <strong>Produto:</strong> {pedido.produto || "-"}
              </p>

              <p>
                <strong>Quantidade:</strong> {pedido.quantidade || 0}
              </p>

              <p>
                <strong>Valor:</strong>{" "}
                {Number(pedido.valorTotal || 0).toLocaleString(
                  "pt-BR",
                  {
                    style: "currency",
                    currency: "BRL",
                  }
                )}
              </p>

              <p>
                <strong>Pagamento:</strong>{" "}
                {pedido.statusPagamento || "-"}
              </p>

              <p>
                <strong>Status operacional:</strong>{" "}
                {pedido.statusOperacional || "ativo"}
              </p>

              <p>
                <strong>Código:</strong>{" "}
                {pedido.codigoIngresso || pedido.id}
              </p>

              <p>
                <strong>ID do pedido:</strong> {pedido.id}
              </p>
            </div>

            <button
              type="button"
              onClick={validarEntrada}
              disabled={
                carregando ||
                !statusVisual.podeValidar
              }
              className={`mt-6 w-full rounded-xl px-5 py-4 text-lg font-black text-white ${statusVisual.podeValidar
                  ? "bg-[#15803d]"
                  : "cursor-not-allowed bg-red-600 opacity-70"
                }`}
            >
              {carregando
                ? "Processando..."
                : statusVisual.podeValidar
                  ? "CONFIRMAR ENTRADA"
                  : "ENTRADA BLOQUEADA"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}