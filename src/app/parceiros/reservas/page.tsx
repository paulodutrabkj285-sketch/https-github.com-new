"use client";

import {
  Agencia,
  agenciaPodeReservar,
  buscarAgenciaPorId,
  calcularDescontoGrupo,
} from "@/lib/agencias";

import { db } from "@/lib/firebase";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import QRCode from "qrcode";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

const VALOR_ADULTO = 60;
const VALOR_IDOSO = 30;
const VALOR_ELEVADOR = 75;

const WHATSAPP_PARQUE =
  "5549991299991";

const imagensFundo = [
  "/fotos/fundo-geral.jpg",
  "/fotos/cachoeira-alta.png",
  "/fotos/cachoeira-lago.png",
];

export default function ReservaParceiroPage() {
  const [imagemAtual, setImagemAtual] =
    useState(0);

  const [agencia, setAgencia] =
    useState<Agencia | null>(null);

  const [carregandoAgencia, setCarregandoAgencia] =
    useState(true);

  const [erroAgencia, setErroAgencia] =
    useState("");

  const [dataVisita, setDataVisita] =
    useState("");

  const [horaPrevista, setHoraPrevista] =
    useState("");

  const [tipoVeiculo, setTipoVeiculo] =
    useState("Ônibus");

  const [adultos, setAdultos] =
    useState(0);

  const [idosos, setIdosos] =
    useState(0);

  const [temElevador, setTemElevador] =
    useState(false);

  const [qtdElevador, setQtdElevador] =
    useState(0);

  const [observacoes, setObservacoes] =
    useState("");

  const [carregando, setCarregando] =
    useState(false);

  const [mensagem, setMensagem] =
    useState("");

  const [linkWhatsApp, setLinkWhatsApp] =
    useState("");

  /* ======================================
     FUNDO
  ====================================== */

  useEffect(() => {
    const intervalo =
      setInterval(() => {
        setImagemAtual(
          (atual) =>
            (atual + 1) %
            imagensFundo.length
        );
      }, 7000);

    return () =>
      clearInterval(intervalo);
  }, []);

  /* ======================================
     CARREGAR AGÊNCIA
  ====================================== */

  useEffect(() => {
    async function carregarAgencia() {
      try {
        setCarregandoAgencia(true);
        setErroAgencia("");

        if (
          typeof window ===
          "undefined"
        ) {
          return;
        }

        const parametros =
          new URLSearchParams(
            window.location.search
          );

        const agenciaId =
          String(
            parametros.get(
              "agenciaId"
            ) || ""
          ).trim();

        if (!agenciaId) {
          setErroAgencia(
            "Esta página só pode ser acessada por uma agência ou guia cadastrado."
          );

          return;
        }

        const encontrada =
          await buscarAgenciaPorId(
            agenciaId
          );

        if (!encontrada) {
          setErroAgencia(
            "Cadastro de parceiro não encontrado."
          );

          return;
        }

        if (
          !encontrada.cadastur ||
          !encontrada.cadastur.trim()
        ) {
          setErroAgencia(
            "O parceiro não possui número Cadastur informado."
          );

          return;
        }

        if (
          encontrada.status ===
          "pendente"
        ) {
          setAgencia(encontrada);

          setErroAgencia(
            "Seu cadastro foi recebido e está aguardando aprovação do Parque Mundo Novo. A reserva ficará disponível após a aprovação."
          );

          return;
        }

        if (
          encontrada.status ===
          "bloqueada"
        ) {
          setAgencia(encontrada);

          setErroAgencia(
            "Este cadastro está bloqueado. Entre em contato com o Parque Mundo Novo."
          );

          return;
        }

        if (
          !agenciaPodeReservar(
            encontrada
          )
        ) {
          setAgencia(encontrada);

          setErroAgencia(
            "Este parceiro ainda não está autorizado a realizar reservas."
          );

          return;
        }

        setAgencia(encontrada);
      } catch (error) {
        console.error(
          "Erro ao carregar agência:",
          error
        );

        setErroAgencia(
          "Não foi possível verificar o cadastro da agência."
        );
      } finally {
        setCarregandoAgencia(false);
      }
    }

    carregarAgencia();
  }, []);

  /* ======================================
     CÁLCULO
  ====================================== */

  const calculo = useMemo(() => {
    const totalVisitantes =
      adultos + idosos;

    const percentualDesconto =
      calcularDescontoGrupo(
        totalVisitantes
      );

    const fatorDesconto =
      percentualDesconto /
      100;

    const valorAdultosBruto =
      adultos *
      VALOR_ADULTO;

    const descontoAdultos =
      valorAdultosBruto *
      fatorDesconto;

    const valorAdultosFinal =
      valorAdultosBruto -
      descontoAdultos;

    /*
     * Idoso já possui meia entrada.
     * Não recebe desconto adicional.
     */
    const valorIdososFinal =
      idosos *
      VALOR_IDOSO;

    const valorElevadorBruto =
      temElevador
        ? qtdElevador *
        VALOR_ELEVADOR
        : 0;

    const descontoElevador =
      valorElevadorBruto *
      fatorDesconto;

    const valorElevadorFinal =
      valorElevadorBruto -
      descontoElevador;

    const valorBruto =
      valorAdultosBruto +
      valorIdososFinal +
      valorElevadorBruto;

    const valorDesconto =
      descontoAdultos +
      descontoElevador;

    const valorFinal =
      valorAdultosFinal +
      valorIdososFinal +
      valorElevadorFinal;

    return {
      totalVisitantes,

      percentualDesconto,

      valorAdultosBruto,
      descontoAdultos,
      valorAdultosFinal,

      valorIdososFinal,

      valorElevadorBruto,
      descontoElevador,
      valorElevadorFinal,

      valorBruto,
      valorDesconto,
      valorFinal,
    };
  }, [
    adultos,
    idosos,
    temElevador,
    qtdElevador,
  ]);

  /* ======================================
     FORMATAÇÃO
  ====================================== */

  function formatarMoeda(
    valor: number
  ) {
    return valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  function formatarData(
    data: string
  ) {
    if (!data) {
      return "-";
    }

    const [
      ano,
      mes,
      dia,
    ] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  /* ======================================
     CÓDIGO DO GRUPO
  ====================================== */

  function gerarCodigoGrupo() {
    const ano =
      new Date().getFullYear();

    const numero =
      Math.floor(
        100000 +
        Math.random() *
        900000
      );

    return `GRP-${ano}-${numero}`;
  }

  /* ======================================
     WHATSAPP
  ====================================== */

  function gerarLinkWhatsApp(
    codigoGrupo: string
  ) {
    const texto = `
🏞️ NOVA RESERVA DE AGÊNCIA

🏢 Agência / Guia:
${agencia?.nomeEmpresa || "-"}

👤 Responsável:
${agencia?.responsavel || "-"}

📑 Cadastur:
${agencia?.cadastur || "-"}

Código do grupo:
${codigoGrupo}

📅 Data da visita:
${formatarData(dataVisita)}

🕘 Chegada prevista:
${horaPrevista || "Não informada"}

🚌 Veículo:
${tipoVeiculo}

👨 Adultos:
${adultos}

👵 Idosos / meia entrada:
${idosos}

👥 TOTAL:
${calculo.totalVisitantes} pessoas

🚡 Elevador:
${temElevador
        ? `Sim - ${qtdElevador} pessoa(s)`
        : "Não"
      }

🏷️ Desconto:
${calculo.percentualDesconto}%

💰 Valor bruto:
${formatarMoeda(
        calculo.valorBruto
      )}

💸 Desconto:
${formatarMoeda(
        calculo.valorDesconto
      )}

✅ VALOR A PAGAR:
${formatarMoeda(
        calculo.valorFinal
      )}

💳 Pagamento:
NA CHEGADA AO PARQUE

📝 Observações:
${observacoes ||
      "Nenhuma observação."
      }
`;

    return `https://wa.me/${WHATSAPP_PARQUE}?text=${encodeURIComponent(
      texto
    )}`;
  }

  /* ======================================
     SALVAR RESERVA
  ====================================== */

  async function salvarReserva() {
    setMensagem("");
    setLinkWhatsApp("");

    if (!agencia) {
      setMensagem(
        "Cadastro da agência não identificado."
      );

      return;
    }

    if (
      !agenciaPodeReservar(
        agencia
      )
    ) {
      setMensagem(
        "Esta agência ainda não está autorizada a realizar reservas."
      );

      return;
    }

    if (
      !agencia.cadastur ||
      !agencia.cadastur.trim()
    ) {
      setMensagem(
        "Cadastur obrigatório."
      );

      return;
    }

    if (!dataVisita) {
      setMensagem(
        "Informe a data da visita."
      );

      return;
    }

    if (
      adultos <= 0 &&
      idosos <= 0
    ) {
      setMensagem(
        "Informe pelo menos 1 visitante."
      );

      return;
    }

    if (
      temElevador &&
      qtdElevador <= 0
    ) {
      setMensagem(
        "Informe a quantidade de pessoas que utilizarão o Elevador Panorâmico."
      );

      return;
    }

    if (
      temElevador &&
      qtdElevador >
      calculo.totalVisitantes
    ) {
      setMensagem(
        "A quantidade do Elevador não pode ser maior que o total de visitantes."
      );

      return;
    }

    try {
      setCarregando(true);

      const codigoGrupo =
        gerarCodigoGrupo();

      const qrCodeGrupo =
        await QRCode.toDataURL(
          JSON.stringify({
            tipo:
              "reserva_agencia",

            codigoGrupo,

            agenciaId:
              agencia.id,
          })
        );

      const whatsappReserva =
        gerarLinkWhatsApp(
          codigoGrupo
        );

      await addDoc(
        collection(
          db,
          "reservas_agencias"
        ),
        {
          /* =====================
             AGÊNCIA REAL
          ===================== */

          agenciaId:
            agencia.id,

          agenciaNome:
            agencia.nomeEmpresa,

          agenciaResponsavel:
            agencia.responsavel,

          agenciaDocumento:
            agencia.documento,

          agenciaCadastur:
            agencia.cadastur,

          agenciaEmail:
            agencia.email,

          agenciaWhatsapp:
            agencia.whatsapp,

          tipoParceiro:
            agencia.tipoParceiro,

          categoriaParceiro:
            agencia.categoria,

          /* =====================
             VISITA
          ===================== */

          dataVisita,
          horaPrevista,
          tipoVeiculo,

          adultos,
          idosos,

          totalVisitantes:
            calculo.totalVisitantes,

          /* =====================
             ELEVADOR
          ===================== */

          elevador:
            temElevador,

          qtdElevador:
            temElevador
              ? qtdElevador
              : 0,

          /* =====================
             VALORES
          ===================== */

          valorAdultosBruto:
            calculo.valorAdultosBruto,

          descontoAdultos:
            calculo.descontoAdultos,

          valorAdultosFinal:
            calculo.valorAdultosFinal,

          valorIdososFinal:
            calculo.valorIdososFinal,

          valorElevadorBruto:
            calculo.valorElevadorBruto,

          descontoElevador:
            calculo.descontoElevador,

          valorElevadorFinal:
            calculo.valorElevadorFinal,

          valorBruto:
            calculo.valorBruto,

          valorDesconto:
            calculo.valorDesconto,

          valorFinal:
            calculo.valorFinal,

          descontoAplicado:
            calculo.percentualDesconto,

          /* =====================
             QR / GRUPO
          ===================== */

          codigoGrupo,

          qrCodeGrupo,

          /* =====================
             STATUS
          ===================== */

          statusPagamento:
            "a_pagar_na_chegada",

          formaPagamento:
            "pendente",

          pagamentoNaChegada:
            true,

          statusOperacional:
            "reservado",

          origem:
            "parceiros",

          tipoReserva:
            "agencia_guia",

          /* =====================
             OBSERVAÇÃO
          ===================== */

          observacoes,

          /* =====================
             WHATSAPP
          ===================== */

          whatsappParque:
            WHATSAPP_PARQUE,

          whatsappReserva,

          enviadoWhatsAppParque:
            true,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      setLinkWhatsApp(
        whatsappReserva
      );

      setMensagem(
        `Reserva criada! Código ${codigoGrupo}. Grupo com ${calculo.totalVisitantes} pessoa(s). Valor a pagar na chegada: ${formatarMoeda(
          calculo.valorFinal
        )}.`
      );

      window.open(
        whatsappReserva,
        "_blank"
      );

      setDataVisita("");
      setHoraPrevista("");
      setTipoVeiculo(
        "Ônibus"
      );
      setAdultos(0);
      setIdosos(0);
      setTemElevador(false);
      setQtdElevador(0);
      setObservacoes("");
    } catch (error) {
      console.error(
        "Erro ao criar reserva:",
        error
      );

      setMensagem(
        "Erro ao criar reserva. Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  /* ======================================
     CARREGANDO
  ====================================== */

  if (carregandoAgencia) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-950 text-white">
        <div className="text-center">
          <p className="text-3xl">
            🏞️
          </p>

          <p className="mt-4 text-xl font-black">
            Verificando cadastro...
          </p>
        </div>
      </main>
    );
  }

  /* ======================================
     AGÊNCIA NÃO AUTORIZADA
  ====================================== */

  if (
    erroAgencia ||
    !agencia ||
    !agenciaPodeReservar(
      agencia
    )
  ) {
    return (
      <main
        className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 text-white"
        style={{
          backgroundImage:
            "url('/fotos/fundo-geral.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 w-full max-w-xl rounded-3xl bg-white p-8 text-center text-slate-900 shadow-2xl">
          <img
            src="/logo-final.png"
            alt="Parque Mundo Novo"
            className="mx-auto h-24 w-24 object-contain"
          />

          <h1 className="mt-5 text-2xl font-black">
            Reserva de Parceiros
          </h1>

          {agencia && (
            <p className="mt-3 font-bold text-emerald-700">
              {
                agencia.nomeEmpresa
              }
            </p>
          )}

          <div className="mt-5 rounded-2xl bg-yellow-100 p-5 font-semibold text-yellow-900">
            {erroAgencia ||
              "Cadastro ainda não autorizado."}
          </div>

          <p className="mt-5 text-sm text-slate-600">
            O Parque Mundo Novo
            precisa aprovar o
            cadastro antes da
            primeira reserva.
          </p>

          <a
            href="/ingressos"
            className="mt-6 inline-block rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white"
          >
            Voltar ao site
          </a>
        </div>
      </main>
    );
  }

  /* ======================================
     TELA DA RESERVA
  ====================================== */

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {imagensFundo.map(
        (
          imagem,
          index
        ) => (
          <div
            key={imagem}
            className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-1000 ${index ===
                imagemAtual
                ? "opacity-100"
                : "opacity-0"
              }`}
            style={{
              backgroundImage: `url('${imagem}')`,
            }}
          />
        )
      )}

      <div className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {/* AGÊNCIA */}

          <div className="mb-6 rounded-2xl border border-green-300/30 bg-green-950/90 p-5 shadow-xl">
            <p className="text-xs font-black uppercase tracking-widest text-green-300">
              Parceiro aprovado
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {
                agencia.nomeEmpresa
              }
            </h2>

            <div className="mt-3 grid gap-2 text-sm text-white/90 md:grid-cols-3">
              <p>
                Responsável:{" "}
                <strong>
                  {
                    agencia.responsavel
                  }
                </strong>
              </p>

              <p>
                Cadastur:{" "}
                <strong>
                  {
                    agencia.cadastur
                  }
                </strong>
              </p>

              <p>
                Status:{" "}
                <strong className="text-green-300">
                  APROVADO
                </strong>
              </p>
            </div>
          </div>

          {/* CABEÇALHO */}

          <div className="mb-8 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-xl backdrop-blur-sm">
            <p className="text-sm font-semibold text-emerald-300">
              Parque Mundo Novo
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Reserva para
              Agências e Guias
            </h1>

            <p className="mt-2 text-slate-100">
              Área exclusiva
              para parceiros
              cadastrados e
              aprovados.
            </p>

            <div className="mt-4 rounded-xl bg-white/10 p-4 text-sm">
              <p>
                👥 Até 20
                visitantes:{" "}
                <strong>
                  5% de
                  desconto
                </strong>
              </p>

              <p className="mt-1">
                👥 Acima de 20
                visitantes:{" "}
                <strong>
                  10% de
                  desconto
                </strong>
              </p>

              <p className="mt-1">
                👴 Meia entrada
                não recebe
                desconto
                adicional.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* FORMULÁRIO */}

            <section className="rounded-2xl bg-white/95 p-6 text-slate-900 shadow-xl backdrop-blur lg:col-span-2">
              <h2 className="mb-4 text-xl font-bold">
                Dados da visita
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label>
                  <span className="font-medium">
                    Data da
                    visita
                  </span>

                  <input
                    type="date"
                    value={
                      dataVisita
                    }
                    onChange={(
                      e
                    ) =>
                      setDataVisita(
                        e
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label>
                  <span className="font-medium">
                    Chegada
                    prevista
                  </span>

                  <input
                    type="time"
                    value={
                      horaPrevista
                    }
                    onChange={(
                      e
                    ) =>
                      setHoraPrevista(
                        e
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label>
                  <span className="font-medium">
                    Tipo de
                    veículo
                  </span>

                  <select
                    value={
                      tipoVeiculo
                    }
                    onChange={(
                      e
                    ) =>
                      setTipoVeiculo(
                        e
                          .target
                          .value
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  >
                    <option>
                      Van
                    </option>

                    <option>
                      Micro-ônibus
                    </option>

                    <option>
                      Ônibus
                    </option>
                  </select>
                </label>

                <label>
                  <span className="font-medium">
                    Adultos
                  </span>

                  <input
                    type="number"
                    min={0}
                    value={
                      adultos
                    }
                    onChange={(
                      e
                    ) =>
                      setAdultos(
                        Number(
                          e
                            .target
                            .value
                        )
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label>
                  <span className="font-medium">
                    Idosos /
                    meia
                    entrada
                  </span>

                  <input
                    type="number"
                    min={0}
                    value={
                      idosos
                    }
                    onChange={(
                      e
                    ) =>
                      setIdosos(
                        Number(
                          e
                            .target
                            .value
                        )
                      )
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <div>
                  <span className="font-medium">
                    Elevador
                    Panorâmico
                  </span>

                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTemElevador(
                          false
                        );

                        setQtdElevador(
                          0
                        );
                      }}
                      className={`rounded-lg border px-4 py-2 ${!temElevador
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-900"
                        }`}
                    >
                      Não
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTemElevador(
                          true
                        )
                      }
                      className={`rounded-lg border px-4 py-2 ${temElevador
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-900"
                        }`}
                    >
                      Sim
                    </button>
                  </div>
                </div>

                {temElevador && (
                  <label>
                    <span className="font-medium">
                      Quantidade
                      Elevador
                    </span>

                    <input
                      type="number"
                      min={0}
                      max={
                        calculo.totalVisitantes ||
                        undefined
                      }
                      value={
                        qtdElevador
                      }
                      onChange={(
                        e
                      ) =>
                        setQtdElevador(
                          Number(
                            e
                              .target
                              .value
                          )
                        )
                      }
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                )}
              </div>

              <label className="mt-4 block">
                <span className="font-medium">
                  Observações
                </span>

                <textarea
                  value={
                    observacoes
                  }
                  onChange={(
                    e
                  ) =>
                    setObservacoes(
                      e
                        .target
                        .value
                    )
                  }
                  className="mt-1 min-h-28 w-full rounded-lg border px-3 py-2"
                />
              </label>

              {mensagem && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-medium text-emerald-800">
                  {mensagem}
                </div>
              )}

              {linkWhatsApp && (
                <a
                  href={
                    linkWhatsApp
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-white"
                >
                  Enviar
                  novamente
                  para o
                  WhatsApp do
                  Parque
                </a>
              )}

              <button
                onClick={
                  salvarReserva
                }
                disabled={
                  carregando
                }
                className="mt-6 w-full rounded-xl bg-emerald-600 py-4 font-bold text-white disabled:bg-slate-400"
              >
                {carregando
                  ? "Criando reserva..."
                  : "Criar reserva da agência"}
              </button>
            </section>

            {/* RESUMO */}

            <aside className="h-fit rounded-2xl bg-white/95 p-6 text-slate-900 shadow-xl">
              <h2 className="mb-4 text-xl font-bold">
                Resumo da
                reserva
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>
                    Adultos
                  </span>

                  <strong>
                    {
                      adultos
                    }
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span>
                    Idosos
                  </span>

                  <strong>
                    {
                      idosos
                    }
                  </strong>
                </div>

                <div className="flex justify-between text-lg">
                  <span>
                    Total
                  </span>

                  <strong>
                    {
                      calculo.totalVisitantes
                    }
                  </strong>
                </div>

                <div className="rounded-xl bg-emerald-100 p-3 text-center">
                  <p className="text-xs font-bold uppercase text-emerald-700">
                    Desconto
                    do grupo
                  </p>

                  <p className="text-3xl font-black text-emerald-800">
                    {
                      calculo.percentualDesconto
                    }
                    %
                  </p>
                </div>

                <hr />

                <div className="flex justify-between">
                  <span>
                    Adultos
                    bruto
                  </span>

                  <strong>
                    {formatarMoeda(
                      calculo.valorAdultosBruto
                    )}
                  </strong>
                </div>

                <div className="flex justify-between text-emerald-700">
                  <span>
                    Desconto
                    adultos
                  </span>

                  <strong>
                    -{" "}
                    {formatarMoeda(
                      calculo.descontoAdultos
                    )}
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span>
                    Idosos
                  </span>

                  <strong>
                    {formatarMoeda(
                      calculo.valorIdososFinal
                    )}
                  </strong>
                </div>

                {temElevador && (
                  <>
                    <div className="flex justify-between">
                      <span>
                        Elevador
                        bruto
                      </span>

                      <strong>
                        {formatarMoeda(
                          calculo.valorElevadorBruto
                        )}
                      </strong>
                    </div>

                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Desconto
                        elevador
                      </span>

                      <strong>
                        -{" "}
                        {formatarMoeda(
                          calculo.descontoElevador
                        )}
                      </strong>
                    </div>
                  </>
                )}

                <hr />

                <div className="flex justify-between">
                  <span>
                    Valor
                    bruto
                  </span>

                  <strong>
                    {formatarMoeda(
                      calculo.valorBruto
                    )}
                  </strong>
                </div>

                <div className="flex justify-between text-emerald-700">
                  <span>
                    Desconto
                    total
                  </span>

                  <strong>
                    -{" "}
                    {formatarMoeda(
                      calculo.valorDesconto
                    )}
                  </strong>
                </div>

                <div className="rounded-xl bg-green-700 p-4 text-white">
                  <p className="text-xs font-bold uppercase">
                    Valor a
                    pagar na
                    chegada
                  </p>

                  <p className="mt-1 text-3xl font-black">
                    {formatarMoeda(
                      calculo.valorFinal
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-800">
                <p className="font-bold">
                  Pagamento na
                  chegada
                </p>

                <p className="mt-1">
                  O grupo fará
                  o pagamento
                  no Parque
                  Mundo Novo
                  antes da
                  entrada.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}