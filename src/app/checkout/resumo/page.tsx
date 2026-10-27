"use client";

import Link from "next/link";
import { buscarPedidoPorId } from "@/lib/pedidos";
import { useEffect, useMemo, useState } from "react";

type TipoDocumento = "cpf" | "estrangeiro";

type TipoDocumentoEstrangeiro =
  | "identidade_nacional"
  | "passaporte"
  | "outro"
  | "";

export default function ResumoPage() {
  const [pedidoCarregado, setPedidoCarregado] = useState(false);
  const [erroPedido, setErroPedido] = useState("");
  const [desconto, setDesconto] = useState(0);

  const [pedidoId, setPedidoId] = useState("");
  const [produto, setProduto] = useState("");
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorTotal, setValorTotal] = useState("0");

  const [quantidadeParque, setQuantidadeParque] = useState(0);
  const [valorUnitarioParque, setValorUnitarioParque] = useState(60);
  const [valorParque, setValorParque] = useState(0);

  const [quantidadeElevador, setQuantidadeElevador] = useState(0);
  const [valorUnitarioElevador, setValorUnitarioElevador] = useState(75);
  const [valorElevador, setValorElevador] = useState(0);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");

  const [tipoDocumento, setTipoDocumento] =
    useState<TipoDocumento>("cpf");

  const [documento, setDocumento] = useState("");
  const [paisDocumento, setPaisDocumento] = useState("");

  const [
    tipoDocumentoEstrangeiro,
    setTipoDocumentoEstrangeiro,
  ] = useState<TipoDocumentoEstrangeiro>("");

  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataVisita, setDataVisita] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [diarias, setDiarias] = useState("");
  const [quantidadePessoas, setQuantidadePessoas] = useState("");
  const [tipoCamping, setTipoCamping] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const pedidoIdUrl = params.get("pedidoId") || "";
    const produtoUrl = params.get("produto") || "";
    const tipoUrl = params.get("tipo") || "";
    const quantidadeUrl = params.get("quantidade") || "1";
    const valorTotalUrl =
      params.get("valorTotal") || params.get("valor") || "0";

    setPedidoId(pedidoIdUrl);
    setProduto(produtoUrl);
    setTipo(tipoUrl);
    setQuantidade(quantidadeUrl);
    setValorTotal(valorTotalUrl);

    const qtdParqueUrl = Number(
      params.get("quantidadeParque") || quantidadeUrl || 0
    );

    const qtdElevadorUrl = Number(
      params.get("quantidadeElevador") || 0
    );

    const unitParqueUrl = Number(
      params.get("valorUnitario") || 60
    );

    const unitElevadorUrl = Number(
      params.get("valorUnitarioElevador") ||
      (qtdElevadorUrl >= 2 ? 60 : 75)
    );

    const totalParqueUrl = Number(
      params.get("valorParque") ||
      qtdParqueUrl * unitParqueUrl
    );

    const totalElevadorUrl = Number(
      params.get("valorElevador") ||
      qtdElevadorUrl * unitElevadorUrl
    );

    setQuantidadeParque(qtdParqueUrl);
    setQuantidadeElevador(qtdElevadorUrl);
    setValorUnitarioParque(unitParqueUrl);
    setValorUnitarioElevador(unitElevadorUrl);
    setValorParque(totalParqueUrl);
    setValorElevador(totalElevadorUrl);

    setNome(params.get("nome") || "");

    const cpfRecebido = (params.get("cpf") || "").replace(
      /\D/g,
      ""
    );

    setCpf(cpfRecebido);

    const tipoDocumentoRecebido =
      params.get("tipoDocumento");

    setTipoDocumento(
      tipoDocumentoRecebido === "estrangeiro"
        ? "estrangeiro"
        : "cpf"
    );

    setDocumento(
      params.get("documento") || cpfRecebido || ""
    );

    setPaisDocumento(
      params.get("paisDocumento") || ""
    );

    const tipoEstrangeiro = params.get(
      "tipoDocumentoEstrangeiro"
    );

    if (
      tipoEstrangeiro === "identidade_nacional" ||
      tipoEstrangeiro === "passaporte" ||
      tipoEstrangeiro === "outro"
    ) {
      setTipoDocumentoEstrangeiro(tipoEstrangeiro);
    } else {
      setTipoDocumentoEstrangeiro("");
    }

    setEmail(params.get("email") || "");
    setTelefone(params.get("telefone") || "");
    setDataVisita(params.get("dataVisita") || "");
    setDataEntrada(params.get("dataEntrada") || "");

    setDiarias(
      params.get("diarias") ||
      params.get("noites") ||
      ""
    );

    setQuantidadePessoas(
      params.get("quantidadePessoas") || ""
    );

    setTipoCamping(
      params.get("tipoCamping") || ""
    );
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(
      window.location.search
    ).get("pedidoId");

    if (!id) {
      setErroPedido("Pedido não informado.");
      return;
    }

    let ativo = true;

    buscarPedidoPorId(id)
      .then((pedido: any) => {
        if (!ativo) return;

        if (!pedido) {
          setErroPedido("Pedido não encontrado.");
          return;
        }

        setProduto(pedido.produto || "");
        setTipo(pedido.tipo || "");
        setQuantidade(
          String(pedido.quantidade ?? 1)
        );
        setValorTotal(
          String(pedido.valorTotal ?? 0)
        );
        setDesconto(Number(pedido.desconto || 0));

        setNome(String(pedido.nome || ""));
        setCpf(
          String(pedido.cpf || "").replace(/\D/g, "")
        );
        setEmail(String(pedido.email || ""));
        setTelefone(String(pedido.telefone || ""));
        setDataVisita(
          String(pedido.dataVisita || "")
        );
        setDataEntrada(
          String(pedido.dataEntrada || "")
        );
        setDiarias(
          String(
            pedido.diarias ??
            pedido.noites ??
            ""
          )
        );
        setQuantidadePessoas(
          String(pedido.quantidadePessoas ?? "")
        );
        setTipoCamping(
          String(pedido.tipoCamping || "")
        );

        const tipoDocPedido: TipoDocumento =
          pedido.tipoDocumento === "estrangeiro"
            ? "estrangeiro"
            : "cpf";

        setTipoDocumento(tipoDocPedido);

        setDocumento(
          String(
            pedido.documento ||
            pedido.cpf ||
            ""
          )
        );

        setPaisDocumento(
          String(pedido.paisDocumento || "")
        );

        const tipoDocEstrangeiro =
          String(
            pedido.tipoDocumentoEstrangeiro ||
            ""
          );

        if (
          tipoDocEstrangeiro === "identidade_nacional" ||
          tipoDocEstrangeiro === "passaporte" ||
          tipoDocEstrangeiro === "outro"
        ) {
          setTipoDocumentoEstrangeiro(
            tipoDocEstrangeiro
          );
        } else {
          setTipoDocumentoEstrangeiro("");
        }

        const qtdParque = Number(
          pedido.quantidadeParque ??
          (pedido.produto === "Ingresso Parque"
            ? pedido.quantidade
            : 0) ??
          0
        );

        const qtdElevador = Number(
          pedido.quantidadeElevador ?? 0
        );

        const unitParque = Number(
          pedido.valorUnitario ?? 60
        );

        // Regra oficial da promoção do Elevador:
        // 1 ingresso = R$ 75
        // 2 ou mais = R$ 60 cada
        const unitElevadorPromocional =
          qtdElevador >= 2 ? 60 : 75;

        const unitElevador = Number(
          pedido.valorUnitarioElevador ??
          unitElevadorPromocional
        );

        const totalParque = Number(
          pedido.valorParque ??
          qtdParque * unitParque
        );

        const totalElevador = Number(
          pedido.valorElevador ??
          qtdElevador * unitElevador
        );

        setQuantidadeParque(qtdParque);
        setQuantidadeElevador(qtdElevador);
        setValorUnitarioParque(unitParque);
        setValorUnitarioElevador(unitElevador);
        setValorParque(totalParque);
        setValorElevador(totalElevador);

        setPedidoCarregado(true);
      })
      .catch(() => {
        if (ativo) {
          setErroPedido(
            "Não foi possível carregar o pedido. Recarregue a página."
          );
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const temCarrinhoParque =
    quantidadeParque > 0 &&
    (produto === "Ingresso Parque" ||
      quantidadeElevador > 0);

  const queryPagamento = new URLSearchParams({
    pedidoId,
    produto,
    tipo,
    quantidade,
    valorTotal,
    nome,
    cpf,
    tipoDocumento,
    documento,
    paisDocumento,
    tipoDocumentoEstrangeiro,
    email,
    telefone,
    quantidadeParque: String(quantidadeParque),
    valorParque: String(valorParque),
    quantidadeElevador: String(quantidadeElevador),
    valorUnitarioElevador: String(
      valorUnitarioElevador
    ),
    valorElevador: String(valorElevador),
  }).toString();

  const valorFormatado = Number(
    valorTotal || 0
  ).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const dataPrincipal =
    dataVisita || dataEntrada || "";

  const valorParqueFormatado =
    valorParque.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const valorElevadorFormatado =
    valorElevador.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const unitarioParqueFormatado =
    valorUnitarioParque.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const unitarioElevadorFormatado =
    valorUnitarioElevador.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );

  const promocaoElevadorAplicada =
    quantidadeElevador >= 2 &&
    valorUnitarioElevador === 60;

  function nomeTipoDocumentoEstrangeiro() {
    if (
      tipoDocumentoEstrangeiro ===
      "identidade_nacional"
    ) {
      return "Documento nacional de identidade";
    }

    if (
      tipoDocumentoEstrangeiro ===
      "passaporte"
    ) {
      return "Passaporte";
    }

    if (
      tipoDocumentoEstrangeiro === "outro"
    ) {
      return "Outro documento oficial";
    }

    return "Documento estrangeiro";
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
                Resumo da compra
              </h1>

              <p className="mt-4 max-w-3xl text-lg text-white/90">
                Confira os itens do seu carrinho antes
                de seguir para o pagamento.
              </p>

              {tipoDocumento === "estrangeiro" && (
                <div className="mt-4 inline-flex rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-3 text-sm font-bold text-cyan-50">
                  🌎 Compra de visitante estrangeiro —
                  CPF não é necessário.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              {temCarrinhoParque
                ? "Seu carrinho"
                : "Dados do pedido"}
            </h2>

            {temCarrinhoParque ? (
              <div className="mb-7 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-emerald-950">
                        🎟️ Ingresso Parque
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {quantidadeParque} ×{" "}
                        {unitarioParqueFormatado}
                      </p>
                    </div>

                    <p className="text-xl font-black text-emerald-800">
                      {valorParqueFormatado}
                    </p>
                  </div>
                </div>

                {quantidadeElevador > 0 && (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-black text-sky-950">
                          🛗 Elevador Panorâmico
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {quantidadeElevador} ×{" "}
                          {unitarioElevadorFormatado}
                        </p>

                        {promocaoElevadorAplicada && (
                          <span className="mt-2 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                            Promoção aplicada: R$ 60 por
                            pessoa
                          </span>
                        )}
                      </div>

                      <p className="text-xl font-black text-sky-800">
                        {valorElevadorFormatado}
                      </p>
                    </div>
                  </div>
                )}

                {quantidadeElevador === 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    Nesta compra não foi adicionado
                    ingresso do Elevador Panorâmico.
                  </div>
                )}

                <div className="rounded-2xl border-2 border-green-600 bg-green-50 p-4 text-sm font-bold text-green-950">
                  ✅ Parque e Elevador serão pagos juntos,
                  mas cada atração terá seu próprio ingresso
                  e seu próprio QR Code após a confirmação
                  do pagamento.
                </div>
              </div>
            ) : (
              <div className="mb-7 grid gap-4 text-base sm:grid-cols-2">
                <Info
                  label="Produto"
                  value={
                    produto ||
                    tipo ||
                    "Não informado"
                  }
                />

                <Info
                  label="Quantidade"
                  value={quantidade}
                />
              </div>
            )}

            <h3 className="mb-4 text-xl font-black text-gray-900">
              Dados do comprador
            </h3>

            <div className="grid gap-4 text-base sm:grid-cols-2">
              {pedidoId && (
                <Info
                  label="Pedido"
                  value={pedidoId}
                />
              )}

              {dataPrincipal && (
                <Info
                  label="Data"
                  value={dataPrincipal}
                />
              )}

              {nome && (
                <Info
                  label="Nome"
                  value={nome}
                />
              )}

              {tipoDocumento === "cpf" ? (
                cpf && (
                  <Info
                    label="CPF"
                    value={cpf}
                  />
                )
              ) : (
                <>
                  {paisDocumento && (
                    <Info
                      label="País"
                      value={paisDocumento}
                    />
                  )}

                  <Info
                    label="Tipo de documento"
                    value={nomeTipoDocumentoEstrangeiro()}
                  />

                  {documento && (
                    <Info
                      label="Número do documento"
                      value={documento}
                    />
                  )}
                </>
              )}

              {telefone && (
                <Info
                  label="Telefone"
                  value={telefone}
                />
              )}

              {email && (
                <Info
                  label="E-mail"
                  value={email}
                />
              )}

              {tipoCamping && (
                <Info
                  label="Tipo camping"
                  value={tipoCamping}
                />
              )}

              {quantidadePessoas && (
                <Info
                  label="Pessoas"
                  value={quantidadePessoas}
                />
              )}

              {diarias && (
                <Info
                  label="Diárias"
                  value={diarias}
                />
              )}
            </div>

            {tipoDocumento === "estrangeiro" && (
              <div className="mt-6 rounded-2xl border border-cyan-300 bg-cyan-50 p-4 text-sm leading-relaxed text-cyan-950">
                <p className="font-black">
                  🌎 Visitante estrangeiro
                </p>

                <p className="mt-2">
                  Seu documento oficial ficará vinculado
                  ao pedido. Não é necessário possuir CPF
                  brasileiro para continuar a compra.
                </p>
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl lg:sticky lg:top-5">
            <h2 className="mb-5 text-3xl font-bold text-[#166534]">
              Total
            </h2>

            {temCarrinhoParque &&
              pedidoCarregado && (
                <div className="mb-5 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span>Parque</span>
                    <strong>
                      {valorParqueFormatado}
                    </strong>
                  </div>

                  {quantidadeElevador > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Elevador</span>
                      <strong>
                        {valorElevadorFormatado}
                      </strong>
                    </div>
                  )}
                </div>
              )}

            <p className="mb-6 text-4xl font-bold text-[#166534]">
              {pedidoCarregado
                ? valorFormatado
                : "Carregando…"}
            </p>

            {desconto > 0 && (
              <p className="mb-4 font-bold text-emerald-700">
                Combo exclusivo do site: desconto de{" "}
                {desconto.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            )}

            {erroPedido && (
              <p
                role="alert"
                className="mb-4 text-red-700"
              >
                {erroPedido}
              </p>
            )}

            {pedidoCarregado && (
              <Link
                href={`/checkout/pagamento?${queryPagamento}`}
                className="block w-full rounded-2xl bg-green-600 px-5 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-green-500"
              >
                Ir para pagamento
              </Link>
            )}

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Após a confirmação do pagamento, os
              ingressos comprados serão liberados com seus
              respectivos QR Codes.
            </p>

            {quantidadeElevador > 0 && (
              <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-semibold leading-relaxed text-sky-950">
                🛗 O QR Code do Elevador será separado do
                QR Code de entrada do Parque.
              </p>
            )}

            {tipoDocumento === "estrangeiro" && (
              <p className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs font-semibold leading-relaxed text-cyan-900">
                Estrangeiros podem continuar normalmente
                para o pagamento sem CPF brasileiro.
              </p>
            )}
          </aside>
        </section>
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