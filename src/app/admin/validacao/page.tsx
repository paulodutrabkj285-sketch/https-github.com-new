"use client";

import { atualizarPedido, listarPedidos, Pedido } from "@/lib/pedidos";
import { Html5Qrcode } from "html5-qrcode";
import { useRef, useState } from "react";

export default function ValidacaoPage() {
  const [codigo, setCodigo] = useState("");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"ok" | "erro" | "alerta">(
    "alerta"
  );
  const [carregando, setCarregando] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);

  const leitorRef = useRef<Html5Qrcode | null>(null);

  function limparCodigo(valor: string) {
    return String(valor || "").trim();
  }

  function definirMensagem(
    texto: string,
    tipo: "ok" | "erro" | "alerta" = "alerta"
  ) {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  function avaliarPedido(encontrado: Pedido) {
    if (encontrado.statusPagamento !== "pago") {
      definirMensagem("INGRESSO NÃO PAGO. Entrada bloqueada.", "erro");
      return;
    }

    if (encontrado.statusOperacional === "utilizado") {
      definirMensagem("INGRESSO JÁ UTILIZADO. Não liberar entrada.", "erro");
      return;
    }

    if (encontrado.statusOperacional === "bloqueado") {
      definirMensagem("INGRESSO BLOQUEADO. Procure a administração.", "erro");
      return;
    }

    if (encontrado.statusPagamento === "pago") {
      definirMensagem("INGRESSO VÁLIDO. Pode validar a entrada.", "ok");
    }
  }

  async function buscarIngresso(codigoBusca?: string) {
    const codigoFinal = limparCodigo(codigoBusca || codigo);

    setMensagem("");
    setPedido(null);

    if (!codigoFinal) {
      definirMensagem("Digite ou escaneie o código do ingresso.", "alerta");
      return;
    }

    try {
      setCarregando(true);

      const pedidos = await listarPedidos();

      const encontrado = pedidos.find(
        (item) =>
          limparCodigo(item.codigoIngresso || "") === codigoFinal ||
          limparCodigo(item.qrCodeIngresso || "") === codigoFinal ||
          limparCodigo(item.id || "") === codigoFinal
      );

      if (!encontrado) {
        definirMensagem("INGRESSO NÃO ENCONTRADO.", "erro");
        return;
      }

      setPedido(encontrado);
      setCodigo(codigoFinal);
      avaliarPedido(encontrado);
      await pararCamera();
    } catch (error) {
      console.error(error);
      definirMensagem("Erro ao buscar ingresso.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  async function iniciarCamera() {
    setMensagem("");
    setCameraAtiva(true);

    setTimeout(async () => {
      try {
        const leitor = new Html5Qrcode("leitor-qrcode");
        leitorRef.current = leitor;

        await leitor.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (texto) => {
            if (texto) {
              await buscarIngresso(texto);
            }
          },
          () => { }
        );
      } catch (error) {
        console.error(error);
        definirMensagem("Não foi possível acessar a câmera.", "erro");
        setCameraAtiva(false);
      }
    }, 300);
  }

  async function pararCamera() {
    try {
      if (leitorRef.current) {
        await leitorRef.current.stop();
        await leitorRef.current.clear();
        leitorRef.current = null;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCameraAtiva(false);
    }
  }

  async function validarEntrada() {
    if (!pedido) return;

    if (pedido.statusPagamento !== "pago") {
      definirMensagem("Este ingresso ainda não está pago.", "erro");
      return;
    }

    if (pedido.statusOperacional === "utilizado") {
      definirMensagem("Este ingresso já foi utilizado.", "erro");
      return;
    }

    if (pedido.statusOperacional === "bloqueado") {
      definirMensagem("Este ingresso está bloqueado.", "erro");
      return;
    }

    try {
      setCarregando(true);

      await atualizarPedido(pedido.id, {
        statusOperacional: "utilizado",
        validadoEm: new Date().toISOString(),
      });

      setPedido({
        ...pedido,
        statusOperacional: "utilizado",
      });

      definirMensagem("ENTRADA VALIDADA COM SUCESSO.", "ok");
    } catch (error) {
      console.error(error);
      definirMensagem("Erro ao validar entrada.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  const mensagemClass =
    tipoMensagem === "ok"
      ? "bg-green-100 text-green-900 border-green-300"
      : tipoMensagem === "erro"
        ? "bg-red-100 text-red-900 border-red-300"
        : "bg-yellow-100 text-yellow-900 border-yellow-300";

  const statusVisual =
    pedido?.statusPagamento === "pago" &&
      pedido?.statusOperacional !== "utilizado" &&
      pedido?.statusOperacional !== "bloqueado"
      ? "🟢 INGRESSO VÁLIDO"
      : pedido?.statusOperacional === "utilizado"
        ? "🔴 INGRESSO JÁ UTILIZADO"
        : pedido?.statusPagamento !== "pago"
          ? "🔴 INGRESSO NÃO PAGO"
          : "⚠️ VERIFICAR INGRESSO";

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
            {!cameraAtiva ? (
              <button
                onClick={iniciarCamera}
                className="rounded-xl bg-[#166534] px-5 py-4 font-bold text-white"
              >
                Ler QR Code com câmera
              </button>
            ) : (
              <button
                onClick={pararCamera}
                className="rounded-xl bg-red-600 px-5 py-4 font-bold text-white"
              >
                Fechar câmera
              </button>
            )}

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
            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-black p-2">
              <div id="leitor-qrcode" className="w-full" />
            </div>
          )}

          <label className="mt-6 mb-2 block font-semibold text-gray-700">
            Código do ingresso
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex: PMN-94120 ou ID do pedido"
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
            <p className={`mt-4 rounded-xl border p-4 font-bold ${mensagemClass}`}>
              {mensagem}
            </p>
          )}
        </section>

        {pedido && (
          <section className="mt-6 rounded-2xl bg-white p-5 shadow-md">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
              <p className="text-2xl font-black">{statusVisual}</p>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-[#166534]">
              Dados do ingresso
            </h2>

            <div className="mt-5 grid gap-3 text-gray-700">
              <p>
                <strong>Cliente:</strong> {pedido.nome}
              </p>

              <p>
                <strong>CPF:</strong> {pedido.cpf}
              </p>

              <p>
                <strong>Produto:</strong> {pedido.produto}
              </p>

              <p>
                <strong>Quantidade:</strong> {pedido.quantidade}
              </p>

              <p>
                <strong>Valor total:</strong>{" "}
                {Number(pedido.valorTotal || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>

              {pedido.valorPago !== undefined && (
                <p>
                  <strong>Valor pago:</strong>{" "}
                  {Number(pedido.valorPago || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              )}

              <p>
                <strong>Pagamento:</strong> {pedido.statusPagamento}
              </p>

              <p>
                <strong>Sicredi:</strong> {pedido.sicrediStatus || "Não informado"}
              </p>

              <p>
                <strong>Status operacional:</strong>{" "}
                {pedido.statusOperacional || "ativo"}
              </p>

              <p>
                <strong>Código:</strong> {pedido.codigoIngresso || pedido.id}
              </p>
            </div>

            <button
              onClick={validarEntrada}
              disabled={
                carregando ||
                pedido.statusPagamento !== "pago" ||
                pedido.statusOperacional === "utilizado" ||
                pedido.statusOperacional === "bloqueado"
              }
              className="mt-6 w-full rounded-xl bg-[#15803d] px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {pedido.statusOperacional === "utilizado"
                ? "Ingresso já utilizado"
                : "Validar entrada"}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}