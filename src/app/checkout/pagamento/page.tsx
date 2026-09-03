"use client";

import { buscarPedidoPorId } from "@/lib/pedidos";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

type FormaPagamento = "pix" | "cartao";

type TipoDocumento =
  | "cpf"
  | "estrangeiro";

type TipoDocumentoEstrangeiro =
  | "identidade_nacional"
  | "passaporte"
  | "outro"
  | "";

export default function PagamentoPage() {
  const [pedidoId, setPedidoId] =
    useState("");

  const [produto, setProduto] =
    useState("");

  const [tipo, setTipo] =
    useState("");

  const [quantidade, setQuantidade] =
    useState("1");

  const [valorTotal, setValorTotal] =
    useState("0");

  const [
    tipoDocumento,
    setTipoDocumento,
  ] =
    useState<TipoDocumento>(
      "cpf"
    );

  const [
    documento,
    setDocumento,
  ] =
    useState("");

  const [
    paisDocumento,
    setPaisDocumento,
  ] =
    useState("");

  const [
    tipoDocumentoEstrangeiro,
    setTipoDocumentoEstrangeiro,
  ] =
    useState<TipoDocumentoEstrangeiro>(
      ""
    );

  const [
    pixCopiaCola,
    setPixCopiaCola,
  ] =
    useState("");

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    verificando,
    setVerificando,
  ] =
    useState(false);

  const [
    processandoCartao,
    setProcessandoCartao,
  ] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [
    mensagem,
    setMensagem,
  ] =
    useState("");

  const [
    formaPagamento,
    setFormaPagamento,
  ] =
    useState<FormaPagamento>(
      "pix"
    );

  const [
    nomeCartao,
    setNomeCartao,
  ] =
    useState("");

  const [
    numeroCartao,
    setNumeroCartao,
  ] =
    useState("");

  const [
    validadeCartao,
    setValidadeCartao,
  ] =
    useState("");

  const [cvv, setCvv] =
    useState("");

  const mensagemPixExpirado =
    "PIX expirado. Gere um novo pedido para realizar o pagamento.";

  function nomeTipoDocumentoEstrangeiro(
    tipoDoc: TipoDocumentoEstrangeiro
  ) {
    if (
      tipoDoc ===
      "identidade_nacional"
    ) {
      return "Documento nacional de identidade";
    }

    if (
      tipoDoc ===
      "passaporte"
    ) {
      return "Passaporte";
    }

    if (
      tipoDoc ===
      "outro"
    ) {
      return "Outro documento oficial";
    }

    return "Documento estrangeiro";
  }

  useEffect(() => {
    async function carregarPix() {
      try {
        const params =
          new URLSearchParams(
            window.location.search
          );

        const id =
          params.get(
            "pedidoId"
          ) || "";

        const prod =
          params.get(
            "produto"
          ) || "";

        const tp =
          params.get(
            "tipo"
          ) || "";

        const qtd =
          params.get(
            "quantidade"
          ) || "1";

        const valor =
          params.get(
            "valorTotal"
          ) ||
          params.get(
            "valor"
          ) ||
          "0";

        const cpfUrl =
          (
            params.get(
              "cpf"
            ) || ""
          ).replace(
            /\D/g,
            ""
          );

        const tipoDocumentoUrl:
          TipoDocumento =
          params.get(
            "tipoDocumento"
          ) ===
            "estrangeiro"
            ? "estrangeiro"
            : "cpf";

        const documentoUrl =
          String(
            params.get(
              "documento"
            ) || ""
          ).trim();

        const paisDocumentoUrl =
          String(
            params.get(
              "paisDocumento"
            ) || ""
          ).trim();

        const tipoEstrangeiroUrl =
          String(
            params.get(
              "tipoDocumentoEstrangeiro"
            ) || ""
          ).trim();

        let tipoDocumentoEstrangeiroUrl:
          TipoDocumentoEstrangeiro =
          "";

        if (
          tipoEstrangeiroUrl ===
          "identidade_nacional" ||
          tipoEstrangeiroUrl ===
          "passaporte" ||
          tipoEstrangeiroUrl ===
          "outro"
        ) {
          tipoDocumentoEstrangeiroUrl =
            tipoEstrangeiroUrl;
        }

        setPedidoId(id);

        setProduto(prod);

        setTipo(tp);

        setQuantidade(qtd);

        setValorTotal(valor);

        if (!id) {
          setErro(
            "Pedido não informado."
          );

          return;
        }

        const pedido: any =
          await buscarPedidoPorId(
            id
          );

        if (!pedido) {
          setErro(
            "Pedido não encontrado."
          );

          return;
        }

        const tipoDocumentoPedido:
          TipoDocumento =
          pedido?.tipoDocumento ===
            "estrangeiro"
            ? "estrangeiro"
            : tipoDocumentoUrl;

        const cpfPedido =
          String(
            pedido?.cpf ||
            cpfUrl ||
            ""
          ).replace(
            /\D/g,
            ""
          );

        const documentoPedido =
          String(
            pedido?.documento ||
            documentoUrl ||
            cpfPedido ||
            ""
          ).trim();

        const paisDocumentoPedido =
          String(
            pedido?.paisDocumento ||
            paisDocumentoUrl ||
            ""
          ).trim();

        const tipoEstrangeiroPedido =
          String(
            pedido?.tipoDocumentoEstrangeiro ||
            tipoDocumentoEstrangeiroUrl ||
            ""
          ).trim();

        let tipoDocumentoEstrangeiroPedido:
          TipoDocumentoEstrangeiro =
          "";

        if (
          tipoEstrangeiroPedido ===
          "identidade_nacional" ||
          tipoEstrangeiroPedido ===
          "passaporte" ||
          tipoEstrangeiroPedido ===
          "outro"
        ) {
          tipoDocumentoEstrangeiroPedido =
            tipoEstrangeiroPedido;
        }

        setTipoDocumento(
          tipoDocumentoPedido
        );

        setDocumento(
          documentoPedido
        );

        setPaisDocumento(
          paisDocumentoPedido
        );

        setTipoDocumentoEstrangeiro(
          tipoDocumentoEstrangeiroPedido
        );

        /*
         * Brasileiro continua
         * precisando de CPF.
         */
        if (
          tipoDocumentoPedido ===
          "cpf" &&
          !cpfPedido
        ) {
          setErro(
            "CPF não encontrado no pedido."
          );

          return;
        }

        /*
         * Estrangeiro não precisa
         * possuir CPF.
         *
         * Exigimos apenas o documento
         * estrangeiro informado na compra.
         */
        if (
          tipoDocumentoPedido ===
          "estrangeiro" &&
          !documentoPedido
        ) {
          setErro(
            "Documento estrangeiro não encontrado no pedido."
          );

          return;
        }

        if (
          pedido
            ?.statusPagamento ===
          "pago"
        ) {
          window.location.href =
            `/checkout/sucesso?pedidoId=${id}` +
            "&status=Pagamento confirmado";

          return;
        }

        if (
          pedido
            ?.statusPagamento ===
          "expirado"
        ) {
          setErro(
            mensagemPixExpirado
          );

          return;
        }

        if (
          pedido?.expiracaoPix
        ) {
          const expiracao =
            new Date(
              pedido.expiracaoPix
            ).getTime();

          if (
            Date.now() >
            expiracao &&
            pedido.statusPagamento !==
            "pago"
          ) {
            setErro(
              mensagemPixExpirado
            );

            return;
          }
        }

        const resposta =
          await fetch(
            "/api/sicredi/criar-pix",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  pedidoId:
                    id,

                  nome:
                    pedido?.nome ||
                    params.get(
                      "nome"
                    ) ||
                    "Cliente Parque Mundo Novo",

                  email:
                    pedido?.email ||
                    params.get(
                      "email"
                    ) ||
                    "cliente@email.com",

                  /*
                   * Brasileiro:
                   * envia CPF normalmente.
                   *
                   * Estrangeiro:
                   * CPF fica vazio.
                   */
                  cpf:
                    tipoDocumentoPedido ===
                      "cpf"
                      ? cpfPedido
                      : "",

                  tipoDocumento:
                    tipoDocumentoPedido,

                  documento:
                    documentoPedido,

                  paisDocumento:
                    paisDocumentoPedido,

                  tipoDocumentoEstrangeiro:
                    tipoDocumentoEstrangeiroPedido,

                  produto:
                    pedido?.produto ||
                    prod ||
                    tp ||
                    "Ingresso",

                  valorTotal:
                    valor,

                  quantidade:
                    qtd,
                }),
            }
          );

        const data =
          await resposta.json();

        if (
          !resposta.ok ||
          !data.ok
        ) {
          setErro(
            data?.error ||
            data?.details
              ?.detail ||
            "Não foi possível gerar o Pix pelo Sicredi."
          );

          return;
        }

        setPixCopiaCola(
          data.pixCopiaCola ||
          ""
        );
      } catch (error) {
        console.error(
          "Erro ao carregar Pix:",
          error
        );

        setErro(
          "Erro ao gerar pagamento Pix."
        );
      } finally {
        setCarregando(
          false
        );
      }
    }

    carregarPix();
  }, []);

  useEffect(() => {
    if (!pedidoId) {
      return;
    }

    const intervalo =
      setInterval(
        async () => {
          try {
            const pedido: any =
              await buscarPedidoPorId(
                pedidoId
              );

            if (!pedido) {
              return;
            }

            if (
              pedido.statusPagamento ===
              "pago"
            ) {
              window.location.href =
                `/checkout/sucesso?pedidoId=${pedidoId}` +
                "&status=Pagamento confirmado";

              return;
            }

            if (
              pedido.statusPagamento ===
              "valor_divergente"
            ) {
              setErro(
                "Pagamento recebido com valor diferente do pedido. Procure a equipe do parque."
              );

              return;
            }

            if (
              pedido.statusPagamento ===
              "expirado"
            ) {
              setErro(
                mensagemPixExpirado
              );

              return;
            }

            if (
              pedido.expiracaoPix
            ) {
              const expiracao =
                new Date(
                  pedido.expiracaoPix
                ).getTime();

              if (
                Date.now() >
                expiracao &&
                pedido.statusPagamento !==
                "pago"
              ) {
                setErro(
                  mensagemPixExpirado
                );
              }
            }
          } catch (error) {
            console.error(
              "Erro ao verificar status do pedido:",
              error
            );
          }
        },
        5000
      );

    return () =>
      clearInterval(
        intervalo
      );
  }, [pedidoId]);

  const valorNumero =
    Number(
      valorTotal || 0
    );

  const pixExpirado =
    erro ===
    mensagemPixExpirado;

  async function copiarPix() {
    if (
      !pixCopiaCola ||
      pixExpirado
    ) {
      return;
    }

    await navigator.clipboard.writeText(
      pixCopiaCola
    );

    alert(
      "PIX copia e cola copiado!"
    );
  }

  async function verificarPagamento() {
    if (pixExpirado) {
      return;
    }

    try {
      setVerificando(
        true
      );

      setErro("");

      setMensagem(
        "Consultando pagamento no Sicredi..."
      );

      const resposta =
        await fetch(
          "/api/sicredi/verificar-pagamento",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                pedidoId,
              }),
          }
        );

      const data =
        await resposta.json();

      if (
        !resposta.ok ||
        !data.ok
      ) {
        setMensagem("");

        setErro(
          data?.mensagem ||
          data?.error ||
          "Pagamento ainda não confirmado."
        );

        return;
      }

      if (data.pago) {
        window.location.href =
          `/checkout/sucesso?pedidoId=${pedidoId}` +
          "&status=Pagamento confirmado";

        return;
      }

      setMensagem(
        data?.mensagem ||
        "Pagamento ainda não confirmado pelo Sicredi."
      );
    } catch (error) {
      console.error(
        "Erro ao verificar pagamento:",
        error
      );

      setMensagem("");

      setErro(
        "Erro ao consultar pagamento."
      );
    } finally {
      setVerificando(
        false
      );
    }
  }

  function formatarNumeroCartao(
    valor: string
  ) {
    return valor
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        19
      )
      .replace(
        /(.{4})/g,
        "$1 "
      )
      .trim();
  }

  function formatarValidade(
    valor: string
  ) {
    const numeros =
      valor
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          4
        );

    if (
      numeros.length <=
      2
    ) {
      return numeros;
    }

    return `${numeros.slice(
      0,
      2
    )}/${numeros.slice(
      2
    )}`;
  }

  async function pagarComCartao() {
    setErro("");
    setMensagem("");

    if (!pedidoId) {
      setErro(
        "Pedido não informado."
      );

      return;
    }

    if (
      !nomeCartao.trim()
    ) {
      setErro(
        "Informe o nome impresso no cartão."
      );

      return;
    }

    const numeroLimpo =
      numeroCartao.replace(
        /\D/g,
        ""
      );

    const validadeLimpa =
      validadeCartao.replace(
        /\D/g,
        ""
      );

    const cvvLimpo =
      cvv.replace(
        /\D/g,
        ""
      );

    if (
      numeroLimpo.length <
      13
    ) {
      setErro(
        "Informe um número de cartão válido."
      );

      return;
    }

    if (
      validadeLimpa.length !==
      4
    ) {
      setErro(
        "Informe a validade no formato MM/AA."
      );

      return;
    }

    if (
      cvvLimpo.length !==
      3 &&
      cvvLimpo.length !==
      4
    ) {
      setErro(
        "Informe um CVV válido."
      );

      return;
    }

    const mesValidade =
      validadeLimpa.slice(
        0,
        2
      );

    const anoValidade =
      validadeLimpa.slice(
        2,
        4
      );

    try {
      setProcessandoCartao(
        true
      );

      setMensagem(
        "Enviando o pagamento com segurança..."
      );

      const resposta =
        await fetch(
          "/api/sicredi/cartao/pagar",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                pedidoId,

                numeroCartao:
                  numeroLimpo,

                mesValidade,

                anoValidade,

                cvv:
                  cvvLimpo,

                /*
                 * Pagamento de crédito
                 * sempre à vista.
                 */
                parcelas:
                  1,
              }),
          }
        );

      const data =
        await resposta.json();

      if (
        !resposta.ok ||
        !data.ok
      ) {
        setMensagem("");

        if (
          data?.codigo ===
          "CARTAO_DESATIVADO"
        ) {
          setErro(
            "O pagamento com cartão está temporariamente indisponível. O Pix continua disponível."
          );

          return;
        }

        setErro(
          data?.mensagem ||
          "Não foi possível processar o cartão."
        );

        return;
      }

      if (
        data.aprovado ||
        data.jaPago
      ) {
        window.location.href =
          `/checkout/sucesso?pedidoId=${pedidoId}` +
          "&status=Pagamento confirmado";

        return;
      }

      setMensagem("");

      setErro(
        data?.mensagem ||
        "Pagamento não aprovado."
      );
    } catch (error) {
      console.error(
        "Erro ao processar o cartão:",
        error
      );

      setMensagem("");

      setErro(
        "Não foi possível conectar ao serviço de pagamento."
      );
    } finally {
      setProcessandoCartao(
        false
      );
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 text-white"
      style={{
        backgroundImage:
          "url('/fotos/fundo-geral.jpg')",
      }}
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
                Pague via Pix Sicredi
                ou cartão de crédito à
                vista.
              </p>

              {tipoDocumento ===
                "estrangeiro" && (

                  <div className="mt-4 inline-flex rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-3 text-sm font-bold text-cyan-50">
                    🌎 Visitante
                    estrangeiro — compra
                    sem CPF.
                  </div>

                )}

            </div>

          </div>

        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">

          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">

            <div className="mb-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => {
                  setFormaPagamento(
                    "pix"
                  );

                  setErro("");

                  setMensagem("");
                }}
                className={`rounded-2xl p-4 text-lg font-bold transition ${formaPagamento ===
                    "pix"
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700"
                  }`}
              >
                PIX
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormaPagamento(
                    "cartao"
                  );

                  setErro("");

                  setMensagem("");
                }}
                className={`rounded-2xl p-4 text-lg font-bold transition ${formaPagamento ===
                    "cartao"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700"
                  }`}
              >
                Cartão de crédito
              </button>

            </div>

            {formaPagamento ===
              "cartao" ? (

              <div className="rounded-2xl border border-blue-300 bg-blue-50 p-6">

                <h2 className="mb-2 text-3xl font-bold text-blue-700">
                  Cartão de Crédito
                </h2>

                <div className="mb-5 rounded-2xl border border-blue-200 bg-white p-4 text-sm text-blue-900">

                  <p className="font-bold">
                    Pagamento à vista
                  </p>

                  <p className="mt-1">
                    O valor total será
                    cobrado em uma
                    única parcela.
                  </p>

                </div>

                <p className="mb-5 text-gray-700">
                  Os dados são usados
                  somente para
                  processar o
                  pagamento e não são
                  armazenados pelo
                  Parque Mundo Novo.
                </p>

                <div className="grid gap-4 rounded-2xl border bg-white p-5">

                  <div>

                    <label className="mb-2 block font-bold text-gray-700">
                      Nome impresso no
                      cartão
                    </label>

                    <input
                      value={
                        nomeCartao
                      }
                      onChange={(
                        event
                      ) =>
                        setNomeCartao(
                          event.target.value
                            .toUpperCase()
                            .slice(
                              0,
                              60
                            )
                        )
                      }
                      autoComplete="cc-name"
                      placeholder="NOME COMO ESTÁ NO CARTÃO"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block font-bold text-gray-700">
                      Número do cartão
                    </label>

                    <input
                      value={
                        numeroCartao
                      }
                      onChange={(
                        event
                      ) =>
                        setNumeroCartao(
                          formatarNumeroCartao(
                            event.target.value
                          )
                        )
                      }
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    />

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="mb-2 block font-bold text-gray-700">
                        Validade
                      </label>

                      <input
                        value={
                          validadeCartao
                        }
                        onChange={(
                          event
                        ) =>
                          setValidadeCartao(
                            formatarValidade(
                              event.target.value
                            )
                          )
                        }
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/AA"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />

                    </div>

                    <div>

                      <label className="mb-2 block font-bold text-gray-700">
                        CVV
                      </label>

                      <input
                        value={cvv}
                        onChange={(
                          event
                        ) =>
                          setCvv(
                            event.target.value
                              .replace(
                                /\D/g,
                                ""
                              )
                              .slice(
                                0,
                                4
                              )
                          )
                        }
                        type="password"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />

                    </div>

                  </div>

                </div>

                <div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4 text-sm leading-relaxed text-gray-700">

                  <p>
                    <strong>
                      Processamento:
                    </strong>{" "}
                    Sicredi IPG /
                    Fiserv
                  </p>

                  <p>
                    <strong>
                      Moeda:
                    </strong>{" "}
                    Real brasileiro
                  </p>

                  <p>
                    <strong>
                      Forma:
                    </strong>{" "}
                    crédito à vista
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    pagarComCartao
                  }
                  disabled={
                    processandoCartao
                  }
                  className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {processandoCartao
                    ? "Processando pagamento..."
                    : `Pagar ${valorNumero.toLocaleString(
                      "pt-BR",
                      {
                        style:
                          "currency",
                        currency:
                          "BRL",
                      }
                    )}`}
                </button>

              </div>

            ) : (

              <>

                <div className="mb-5 rounded-2xl border border-green-300 bg-green-50 p-4 text-green-900">

                  <p className="font-bold">
                    PIX recomendado
                  </p>

                  <p className="mt-1 text-sm">
                    Pagamento
                    instantâneo e
                    confirmação
                    automática.
                  </p>

                </div>

                {tipoDocumento ===
                  "estrangeiro" && (

                    <div className="mb-5 rounded-2xl border border-cyan-300 bg-cyan-50 p-4 text-sm leading-relaxed text-cyan-950">

                      <p className="font-black">
                        🌎 Pagamento para
                        estrangeiro
                      </p>

                      <p className="mt-1">
                        O Pix pode ser
                        gerado sem CPF
                        brasileiro. Seu
                        documento oficial
                        continuará
                        vinculado ao
                        pedido.
                      </p>

                    </div>

                  )}

                <h2 className="mb-5 text-3xl font-bold text-[#166534]">
                  PIX QR Code
                </h2>

                {carregando ? (

                  <div className="rounded-2xl bg-gray-100 p-6 text-center font-bold text-gray-600">
                    Gerando Pix pelo
                    Sicredi...
                  </div>

                ) : pixExpirado ? (

                  <div className="rounded-2xl border border-red-300 bg-red-100 p-5 text-red-800">

                    <h3 className="text-2xl font-bold">
                      PIX expirado
                    </h3>

                    <p className="mt-2">
                      Gere um novo
                      pedido para
                      realizar o
                      pagamento.
                    </p>

                  </div>

                ) : erro ? (

                  <div className="rounded-2xl border border-red-300 bg-red-100 p-5 text-red-800">
                    {erro}
                  </div>

                ) : (

                  <>

                    <p className="mb-4 text-gray-600">
                      Escaneie o QR
                      Code abaixo ou
                      copie o código
                      PIX.
                    </p>

                    <div className="mb-6 flex justify-center">

                      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-lg">

                        <QRCodeSVG
                          value={
                            pixCopiaCola
                          }
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
                      value={
                        pixCopiaCola
                      }
                      readOnly
                      className="h-44 w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 p-4 text-sm outline-none"
                    />

                    <button
                      type="button"
                      onClick={
                        copiarPix
                      }
                      className="mt-5 w-full rounded-2xl bg-green-600 px-5 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-green-500"
                    >
                      Copiar PIX copia
                      e cola
                    </button>

                    <div className="mt-6 rounded-2xl border border-green-300 bg-green-100 p-4 text-sm leading-relaxed text-green-900">

                      <strong>
                        Pagamento
                        seguro:
                      </strong>{" "}

                      cobrança Pix
                      gerada pelo
                      Sicredi para o
                      Parque Mundo
                      Novo.

                    </div>

                  </>

                )}

              </>

            )}

            {formaPagamento ===
              "cartao" &&
              erro && (

                <div className="mt-5 rounded-2xl border border-red-300 bg-red-100 p-4 text-red-800">
                  {erro}
                </div>

              )}

            {formaPagamento ===
              "cartao" &&
              mensagem && (

                <div className="mt-5 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-yellow-900">
                  {mensagem}
                </div>

              )}

          </div>

          <aside className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl lg:sticky lg:top-5">

            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Resumo
            </h2>

            <div className="space-y-3 text-base">

              {pedidoId && (
                <p>
                  <strong>
                    Pedido:
                  </strong>{" "}
                  {pedidoId}
                </p>
              )}

              <p>
                <strong>
                  Produto:
                </strong>{" "}
                {produto ||
                  tipo ||
                  "Ingresso"}
              </p>

              <p>
                <strong>
                  Quantidade:
                </strong>{" "}
                {quantidade}
              </p>

              {tipoDocumento ===
                "cpf" ? (

                <p>
                  <strong>
                    Documento:
                  </strong>{" "}
                  CPF
                </p>

              ) : (

                <>

                  {paisDocumento && (
                    <p>
                      <strong>
                        País:
                      </strong>{" "}
                      {
                        paisDocumento
                      }
                    </p>
                  )}

                  <p>
                    <strong>
                      Tipo de
                      documento:
                    </strong>{" "}
                    {nomeTipoDocumentoEstrangeiro(
                      tipoDocumentoEstrangeiro
                    )}
                  </p>

                  {documento && (
                    <p>
                      <strong>
                        Número:
                      </strong>{" "}
                      {documento}
                    </p>
                  )}

                </>

              )}

              <p>
                <strong>
                  Forma:
                </strong>{" "}
                {formaPagamento ===
                  "pix"
                  ? "Pix"
                  : "Cartão de crédito à vista"}
              </p>

            </div>

            <hr className="my-6 border-gray-300" />

            <p className="mb-6 text-4xl font-bold text-[#166534]">
              {valorNumero.toLocaleString(
                "pt-BR",
                {
                  style:
                    "currency",
                  currency:
                    "BRL",
                }
              )}
            </p>

            {formaPagamento ===
              "cartao" ? (

              <div className="mb-4 rounded-2xl border border-blue-300 bg-blue-100 p-4 text-sm leading-relaxed text-blue-900">
                Pagamento por cartão
                de crédito à vista,
                processado com
                segurança pelo
                gateway
                Sicredi/Fiserv.
              </div>

            ) : pixExpirado ? (

              <div className="mb-4 rounded-2xl border border-red-300 bg-red-100 p-4 text-sm leading-relaxed text-red-900">
                Este Pix expirou.
                Volte para a página de
                ingressos e crie um
                novo pedido.
              </div>

            ) : (

              <div className="mb-4 rounded-2xl border border-green-300 bg-green-100 p-4 text-sm leading-relaxed text-green-900">
                Após o pagamento,
                esta tela verifica
                automaticamente e
                libera o ingresso
                quando o Sicredi
                confirmar.
              </div>

            )}

            {formaPagamento ===
              "pix" && (

                <button
                  type="button"
                  onClick={
                    verificarPagamento
                  }
                  disabled={
                    verificando ||
                    pixExpirado
                  }
                  className="block w-full rounded-2xl bg-green-600 px-5 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pixExpirado
                    ? "PIX expirado"
                    : verificando
                      ? "Verificando pagamento..."
                      : "Já fiz o PIX"}
                </button>

              )}

            {formaPagamento ===
              "cartao" && (

                <button
                  type="button"
                  onClick={
                    pagarComCartao
                  }
                  disabled={
                    processandoCartao
                  }
                  className="block w-full rounded-2xl bg-blue-600 px-5 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {processandoCartao
                    ? "Processando..."
                    : "Pagar com cartão"}
                </button>

              )}

            {mensagem &&
              !pixExpirado &&
              formaPagamento ===
              "pix" && (

                <div className="mt-4 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-sm leading-relaxed text-yellow-900">
                  {mensagem}
                </div>

              )}

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              O ingresso só será
              liberado quando o
              pagamento for
              confirmado e o valor
              pago for igual ao valor
              do pedido.
            </p>

          </aside>

        </section>

      </div>

    </main>
  );
}