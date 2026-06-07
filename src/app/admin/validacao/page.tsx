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

  function extrairDadosQr(texto: string) {
    const valor = limparCodigo(texto);

    try {
      const dados = JSON.parse(valor);

      return {
        codigo: limparCodigo(dados?.codigo || ""),
        pedidoId: limparCodigo(dados?.pedidoId || ""),
      };
    } catch {
      return {
        codigo: valor,
        pedidoId: "",
      };
    }
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

    definirMensagem("INGRESSO VÁLIDO. Pagamento confirmado.", "ok");
  }

  async function buscarIngresso(codigoBusca?: string) {
    const dadosQr = extrairDadosQr(codigoBusca || codigo);
    const codigoFinal = dadosQr.codigo;
    const pedidoIdQr = dadosQr.pedidoId;

    setMensagem("");
    setPedido(null);

    if (!codigoFinal && !pedidoIdQr) {
      definirMensagem("Digite ou escaneie o QR Code do ingresso.", "alerta");
      return;
    }

    try {
      setCarregando(true);

      const pedidos = await listarPedidos();

      const encontrado = pedidos.find((item) => {
        const codigoItem = limparCodigo(item.codigoIngresso || "");
        const qrItem = limparCodigo(item.qrCodeIngresso || "");
        const idItem = limparCodigo(item.id || "");

        return (
          codigoItem === codigoFinal ||
          qrItem === codigoFinal ||
          idItem === codigoFinal ||
          idItem === pedidoIdQr
        );
      });

      if (!encontrado) {
        definirMensagem("INGRESSO NÃO ENCONTRADO.", "erro");
        return;
      }

      setPedido(encontrado);
      setCodigo(codigoFinal || pedidoIdQr);
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
    setPedido(null);
    setCameraAtiva(true);

    setTimeout(async () => {
      try {
        const leitor = new Html5Qrcode("leitor-qrcode");
        leitorRef.current = leitor;

        await leitor.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
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

  const ingressoPago = pedido?.statusPagamento === "pago";
  const ingressoUtilizado = pedido?.statusOperacional === "utilizado";
  const ingressoBloqueado = pedido?.statusOperacional === "bloqueado";

  const ingressoValido =
    pedido && ingressoPago && !ingressoUtilizado && !ingressoBloqueado;

  const painelClass = ingressoValido
    ? "border-green-500 bg-green-600 text-white"
    : ingressoUtilizado
      ? "border-red-500 bg-red-600 text-white"
      : pedido
        ? "border-red-500 bg-red-600 text-white"
        : "border-[#166534] bg-white text-gray-900";

  const statusTitulo = ingressoValido
    ? "INGRESSO VÁLIDO"
    : ingressoUtilizado
      ? "INGRESSO JÁ UTILIZADO"
      : pedido?.statusPagamento !== "pago" && pedido
        ? "INGRESSO NÃO PAGO"
        : "AGUARDANDO LEITURA";

  const statusIcone = ingressoValido
    ? "🟢"
    : ingressoUtilizado
      ? "🔴"
      : pedido
        ? "🔴"
        : "📷";

  const mensagemClass =
    tipoMensagem === "ok"
      ? "bg-green-100 text-green-900 border-green-300"
      : tipoMensagem === "erro"
        ? "bg-red-100 text-red-900 border-red-300"
        : "bg-yellow-100 text-yellow-900 border-yellow-300";

  return (
    <main className="min-h-screen bg-[#eef3ed] px-4 py-5">
      <div className="mx-auto max-w-xl">
        <header className="mb-5 text-center">
          <h1 className="text-3xl font-black text-[#166534]">
            Portaria Parque Mundo Novo
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Escaneie o QR Code do ingresso para validar a entrada.
          </p>
        </header>

        <section className={`rounded-3xl border-4 p-6 text-center shadow-xl ${painelClass}`}>
          <p className="text-6xl">{statusIcone}</p>

          <h2 className="mt-3 text-4xl font-black leading-tight">
            {statusTitulo}
          </h2>

          {pedido && (
            <div className="mt-5 rounded-2xl bg-white/15 p-4 text-left text-lg font-semibold">
              <p>
                <strong>Cliente:</strong> {pedido.nome}
              </p>

              <p>
                <strong>Produto:</strong> {pedido.produto}
              </p>

              <p>
                <strong>Qtd:</strong> {pedido.quantidade}
              </p>

              <p>
                <strong>Código:</strong> {pedido.codigoIngresso || pedido.id}
              </p>

              <p>
                <strong>Pagamento:</strong>{" "}
                {pedido.statusPagamento === "pago"
                  ? "Confirmado"
                  : pedido.statusPagamento}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {pedido.statusOperacional === "utilizado"
                  ? "Utilizado"
                  : pedido.statusOperacional || "Ativo"}
              </p>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-lg">
          <div className="grid gap-3">
            {!cameraAtiva ? (
              <button
                onClick={iniciarCamera}
                className="rounded-2xl bg-[#166534] px-5 py-5 text-xl font-black text-white"
              >
                📷 Escanear ingresso
              </button>
            ) : (
              <button
                onClick={pararCamera}
                className="rounded-2xl bg-red-600 px-5 py-5 text-xl font-black text-white"
              >
                Fechar câmera
              </button>
            )}

            {cameraAtiva && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black p-2">
                <div id="leitor-qrcode" className="w-full" />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Digite o código manualmente"
                className="w-full rounded-2xl border border-gray-300 px-4 py-4 outline-none focus:border-[#166534]"
              />

              <button
                onClick={() => buscarIngresso()}
                disabled={carregando}
                className="rounded-2xl bg-[#166534] px-6 py-4 font-bold text-white disabled:opacity-60"
              >
                Buscar
              </button>
            </div>

            <button
              onClick={() => {
                setCodigo("");
                setPedido(null);
                setMensagem("");
              }}
              className="rounded-2xl border border-[#166534] px-5 py-4 font-bold text-[#166534]"
            >
              Limpar
            </button>
          </div>

          {mensagem && (
            <p className={`mt-4 rounded-xl border p-4 text-center font-bold ${mensagemClass}`}>
              {mensagem}
            </p>
          )}
        </section>

        {pedido && (
          <section className="mt-5">
            {ingressoValido ? (
              <button
                onClick={validarEntrada}
                disabled={carregando}
                className="w-full rounded-3xl bg-green-700 px-5 py-6 text-2xl font-black text-white shadow-xl disabled:opacity-60"
              >
                CONFIRMAR ENTRADA
              </button>
            ) : (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-3xl bg-gray-500 px-5 py-6 text-2xl font-black text-white shadow-xl"
              >
                ENTRADA BLOQUEADA
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}