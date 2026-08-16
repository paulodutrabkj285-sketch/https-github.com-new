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

/* ==========================================
   VALORES
========================================== */

const VALOR_ADULTO = 60;
const VALOR_IDOSO = 30;
const VALOR_ELEVADOR = 75;

const WHATSAPP_PARQUE =
  "5549991299991";

type ModalidadeReserva =
  | "antecipado"
  | "chegada";

/* ==========================================
   FUNDOS
========================================== */

const imagensFundo = [
  "/fotos/fundo-geral.jpg",
  "/fotos/cachoeira-alta.png",
  "/fotos/cachoeira-lago.png",
];

/* ==========================================
   PÁGINA
========================================== */

export default function ReservaParceiroPage() {
  const [
    imagemAtual,
    setImagemAtual,
  ] = useState(0);

  const [
    agencia,
    setAgencia,
  ] = useState<Agencia | null>(
    null
  );

  const [
    carregandoAgencia,
    setCarregandoAgencia,
  ] = useState(true);

  const [
    erroAgencia,
    setErroAgencia,
  ] = useState("");

  const [
    modalidade,
    setModalidade,
  ] =
    useState<ModalidadeReserva>(
      "chegada"
    );

  const [
    dataVisita,
    setDataVisita,
  ] = useState("");

  const [
    horaPrevista,
    setHoraPrevista,
  ] = useState("");

  const [
    tipoVeiculo,
    setTipoVeiculo,
  ] = useState("Ônibus");

  const [
    adultos,
    setAdultos,
  ] = useState(0);

  const [
    idosos,
    setIdosos,
  ] = useState(0);

  const [
    temElevador,
    setTemElevador,
  ] = useState(false);

  const [
    qtdElevador,
    setQtdElevador,
  ] = useState(0);

  const [
    observacoes,
    setObservacoes,
  ] = useState("");

  const [
    carregando,
    setCarregando,
  ] = useState(false);

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    tipoMensagem,
    setTipoMensagem,
  ] = useState<
    "sucesso" |
    "erro" |
    ""
  >("");

  const [
    linkWhatsApp,
    setLinkWhatsApp,
  ] = useState("");

  const [
    reservaCriada,
    setReservaCriada,
  ] = useState<{
    codigoGrupo: string;
    modalidade: ModalidadeReserva;
    totalVisitantes: number;
    valorFinal: number;
  } | null>(null);

  /* ======================================
     DATA MÍNIMA
  ====================================== */

  const dataHoje =
    useMemo(() => {
      const hoje =
        new Date();

      const ano =
        hoje.getFullYear();

      const mes =
        String(
          hoje.getMonth() + 1
        ).padStart(
          2,
          "0"
        );

      const dia =
        String(
          hoje.getDate()
        ).padStart(
          2,
          "0"
        );

      return `${ano}-${mes}-${dia}`;
    }, []);

  /* ======================================
     FUNDO
  ====================================== */

  useEffect(() => {
    const intervalo =
      setInterval(
        () => {
          setImagemAtual(
            (atual) =>
              (atual + 1) %
              imagensFundo.length
          );
        },
        7000
      );

    return () =>
      clearInterval(
        intervalo
      );
  }, []);

  /* ======================================
     CARREGAR AGÊNCIA
  ====================================== */

  useEffect(() => {
    async function carregarAgencia() {
      try {
        setCarregandoAgencia(
          true
        );

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
            "Esta página é exclusiva para parceiros cadastrados e aprovados."
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

        setAgencia(
          encontrada
        );

        if (
          encontrada.status ===
          "pendente"
        ) {
          setErroAgencia(
            "Seu cadastro foi recebido e está aguardando análise do Parque Mundo Novo. As compras e reservas serão liberadas somente após a aprovação."
          );

          return;
        }

        if (
          encontrada.status ===
          "reprovada"
        ) {
          setErroAgencia(
            "Este cadastro não foi aprovado. Entre em contato com o Parque Mundo Novo para mais informações."
          );

          return;
        }

        if (
          encontrada.status ===
          "bloqueada"
        ) {
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
          setErroAgencia(
            "Este parceiro ainda não está autorizado a realizar compras ou reservas com desconto."
          );

          return;
        }

        if (
          !encontrada.cadastur ||
          !encontrada.cadastur.trim()
        ) {
          setErroAgencia(
            "A aprovação deste parceiro ainda não possui confirmação do Cadastur."
          );

          return;
        }
      } catch (error) {
        console.error(
          "Erro ao carregar agência:",
          error
        );

        setErroAgencia(
          "Não foi possível verificar o cadastro da agência."
        );
      } finally {
        setCarregandoAgencia(
          false
        );
      }
    }

    carregarAgencia();
  }, []);

  /* ======================================
     CÁLCULO
  ====================================== */

  const calculo =
    useMemo(() => {
      const totalVisitantes =
        adultos +
        idosos;

      const percentualDesconto =
        calcularDescontoGrupo(
          totalVisitantes
        );

      const fatorDesconto =
        percentualDesconto /
        100;

      /* =============================
         ADULTOS
      ============================= */

      const valorAdultosBruto =
        adultos *
        VALOR_ADULTO;

      const descontoAdultos =
        valorAdultosBruto *
        fatorDesconto;

      const valorAdultosFinal =
        valorAdultosBruto -
        descontoAdultos;

      /* =============================
         IDOSOS
      ============================= */

      /*
       * Meia entrada já possui
       * benefício legal.
       *
       * Portanto não recebe
       * desconto adicional.
       */
      const valorIdososBruto =
        idosos *
        VALOR_IDOSO;

      const valorIdososFinal =
        valorIdososBruto;

      /* =============================
         ELEVADOR
      ============================= */

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

      /* =============================
         TOTAL
      ============================= */

      const valorBruto =
        valorAdultosBruto +
        valorIdososBruto +
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

        valorIdososBruto,
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
    return Number(
      valor || 0
    ).toLocaleString(
      "pt-BR",
      {
        style:
          "currency",

        currency:
          "BRL",
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
    ] =
      data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  /* ======================================
     CÓDIGO DO GRUPO
  ====================================== */

  function gerarCodigoGrupo() {
    const ano =
      new Date()
        .getFullYear();

    const numero =
      Math.floor(
        100000 +
        Math.random() *
        900000
      );

    return `GRP-${ano}-${numero}`;
  }

  /* ======================================
     VALIDAÇÃO
  ====================================== */

  function validarDadosReserva() {
    if (!agencia) {
      return "Cadastro da agência não identificado.";
    }

    if (
      !agenciaPodeReservar(
        agencia
      )
    ) {
      return "Esta agência não está autorizada a realizar compras ou reservas.";
    }

    if (!dataVisita) {
      return "Informe a data da visita.";
    }

    if (
      dataVisita <
      dataHoje
    ) {
      return "A data da visita não pode ser anterior à data de hoje.";
    }

    if (
      adultos <= 0 &&
      idosos <= 0
    ) {
      return "Informe pelo menos 1 visitante.";
    }

    if (
      adultos < 0 ||
      idosos < 0
    ) {
      return "A quantidade de visitantes não pode ser negativa.";
    }

    if (
      temElevador &&
      qtdElevador <= 0
    ) {
      return "Informe a quantidade de pessoas que utilizarão o Elevador Panorâmico.";
    }

    if (
      temElevador &&
      qtdElevador >
      calculo.totalVisitantes
    ) {
      return "A quantidade do Elevador não pode ser maior que o total de visitantes.";
    }

    return "";
  }

  /* ======================================
     WHATSAPP
  ====================================== */

  function gerarLinkWhatsApp(
    codigoGrupo: string
  ) {
    const texto = `
🏞️ NOVA RESERVA DE AGÊNCIA

🏢 Agência / Parceiro:
${agencia?.nomeEmpresa || "-"}

👤 Responsável:
${agencia?.responsavel || "-"}

📑 Cadastur:
${agencia?.cadastur || "-"}

🆔 Código do grupo:
${codigoGrupo}

📅 Data da visita:
${formatarData(
      dataVisita
    )}

🕘 Chegada prevista:
${horaPrevista || "Não informada"}

🚌 Veículo:
${tipoVeiculo}

👨 Adultos:
${adultos}

👵 Idosos / meia entrada:
${idosos}

👥 TOTAL:
${calculo.totalVisitantes} pessoa(s)

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
     DADOS BASE DA RESERVA
  ====================================== */

  function montarDadosBase(
    codigoGrupo: string,
    qrCodeGrupo: string
  ) {
    if (!agencia) {
      throw new Error(
        "Agência não identificada."
      );
    }

    return {
      /* =====================
         AGÊNCIA
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
        agencia.cadastur ||
        "",

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

      valorIdososBruto:
        calculo.valorIdososBruto,

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
         GRUPO / QR
      ===================== */

      codigoGrupo,

      qrCodeGrupo,

      /* =====================
         ORIGEM
      ===================== */

      origem:
        "parceiros",

      tipoReserva:
        "agencia_guia",

      /* =====================
         OBSERVAÇÃO
      ===================== */

      observacoes,

      /* =====================
         DATAS
      ===================== */

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    };
  }

  /* ======================================
     LIMPAR FORMULÁRIO
  ====================================== */

  function limparFormulario() {
    setDataVisita("");
    setHoraPrevista("");

    setTipoVeiculo(
      "Ônibus"
    );

    setAdultos(0);
    setIdosos(0);

    setTemElevador(
      false
    );

    setQtdElevador(0);

    setObservacoes("");
  }

  /* ======================================
     PAGAR NA CHEGADA
  ====================================== */

  async function criarReservaChegada() {
    setMensagem("");
    setTipoMensagem("");
    setLinkWhatsApp("");
    setReservaCriada(null);

    const erroValidacao =
      validarDadosReserva();

    if (erroValidacao) {
      setTipoMensagem(
        "erro"
      );

      setMensagem(
        erroValidacao
      );

      return;
    }

    try {
      setCarregando(
        true
      );

      const codigoGrupo =
        gerarCodigoGrupo();

      const qrCodeGrupo =
        await QRCode.toDataURL(
          JSON.stringify({
            tipo:
              "reserva_agencia",

            codigoGrupo,

            agenciaId:
              agencia?.id,

            modalidade:
              "chegada",
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
          ...montarDadosBase(
            codigoGrupo,
            qrCodeGrupo
          ),

          modalidadePagamento:
            "chegada",

          statusPagamento:
            "a_pagar_na_chegada",

          formaPagamento:
            "pendente",

          pagamentoNaChegada:
            true,

          statusOperacional:
            "reservado",

          whatsappParque:
            WHATSAPP_PARQUE,

          whatsappReserva,

          enviadoWhatsAppParque:
            true,
        }
      );

      setReservaCriada({
        codigoGrupo,

        modalidade:
          "chegada",

        totalVisitantes:
          calculo.totalVisitantes,

        valorFinal:
          calculo.valorFinal,
      });

      setLinkWhatsApp(
        whatsappReserva
      );

      setTipoMensagem(
        "sucesso"
      );

      setMensagem(
        `Reserva criada com sucesso. Código ${codigoGrupo}. O grupo possui ${calculo.totalVisitantes} pessoa(s) e deverá pagar ${formatarMoeda(
          calculo.valorFinal
        )} na chegada ao Parque.`
      );

      window.open(
        whatsappReserva,
        "_blank"
      );

      limparFormulario();
    } catch (error) {
      console.error(
        "Erro ao criar reserva:",
        error
      );

      setTipoMensagem(
        "erro"
      );

      setMensagem(
        "Erro ao criar reserva. Tente novamente."
      );
    } finally {
      setCarregando(
        false
      );
    }
  }

  /* ======================================
     COMPRA ANTECIPADA
  ====================================== */

  async function criarReservaAntecipada() {
    setMensagem("");
    setTipoMensagem("");
    setLinkWhatsApp("");
    setReservaCriada(null);

    const erroValidacao =
      validarDadosReserva();

    if (erroValidacao) {
      setTipoMensagem(
        "erro"
      );

      setMensagem(
        erroValidacao
      );

      return;
    }

    try {
      setCarregando(
        true
      );

      const codigoGrupo =
        gerarCodigoGrupo();

      /*
       * O QR já fica associado ao grupo,
       * porém NÃO estará liberado na
       * portaria enquanto o pagamento
       * antecipado não for confirmado.
       */
      const qrCodeGrupo =
        await QRCode.toDataURL(
          JSON.stringify({
            tipo:
              "reserva_agencia",

            codigoGrupo,

            agenciaId:
              agencia?.id,

            modalidade:
              "antecipado",
          })
        );

      await addDoc(
        collection(
          db,
          "reservas_agencias"
        ),
        {
          ...montarDadosBase(
            codigoGrupo,
            qrCodeGrupo
          ),

          modalidadePagamento:
            "antecipado",

          statusPagamento:
            "aguardando_pagamento_antecipado",

          formaPagamento:
            "pendente",

          pagamentoNaChegada:
            false,

          /*
           * Não libera a entrada.
           *
           * Na próxima etapa o Pix/cartão
           * será conectado a esta reserva.
           */
          statusOperacional:
            "aguardando_pagamento",

          checkoutCriado:
            false,
        }
      );

      setReservaCriada({
        codigoGrupo,

        modalidade:
          "antecipado",

        totalVisitantes:
          calculo.totalVisitantes,

        valorFinal:
          calculo.valorFinal,
      });

      setTipoMensagem(
        "sucesso"
      );

      setMensagem(
        `Pré-reserva criada. Código ${codigoGrupo}. Valor da compra antecipada: ${formatarMoeda(
          calculo.valorFinal
        )}. Na próxima etapa vamos conectar esta modalidade ao pagamento online.`
      );

      /*
       * Ainda NÃO limpamos o formulário
       * automaticamente.
       *
       * Isso ajuda nos testes enquanto
       * o checkout antecipado não está
       * conectado.
       */
    } catch (error) {
      console.error(
        "Erro ao criar compra antecipada:",
        error
      );

      setTipoMensagem(
        "erro"
      );

      setMensagem(
        "Não foi possível criar a compra antecipada."
      );
    } finally {
      setCarregando(
        false
      );
    }
  }

  /* ======================================
     CARREGANDO AGÊNCIA
  ====================================== */

  if (
    carregandoAgencia
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-emerald-950 text-white">
        <div className="text-center">
          <p className="text-4xl">
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
     NÃO AUTORIZADA
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
            Área de Parceiros
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
            Compras antecipadas
            e reservas com desconto
            são liberadas somente
            após a aprovação do
            cadastro pelo Parque
            Mundo Novo.
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
     TELA PRINCIPAL
  ====================================== */

  return (
    <main className="relative min-h-screen overflow-hidden text-white">

      {/* FUNDO */}

      {imagensFundo.map(
        (
          imagem,
          index
        ) => (
          <div
            key={
              imagem
            }
            className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-1000 ${index ===
                imagemAtual
                ? "opacity-100"
                : "opacity-0"
              }`}
            style={{
              backgroundImage:
                `url('${imagem}')`,
            }}
          />
        )
      )}

      <div className="absolute inset-0 bg-black/65" />

      <div className="relative z-10 px-4 py-8">
        <div className="mx-auto max-w-6xl">

          {/* ==================================
              PARCEIRO APROVADO
          ================================== */}

          <div className="mb-6 rounded-3xl border border-green-300/30 bg-green-950/90 p-6 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-green-300">
                  ✅ Parceiro aprovado
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {
                    agencia.nomeEmpresa
                  }
                </h2>

                <p className="mt-1 text-white/80">
                  Responsável:{" "}
                  <strong>
                    {
                      agencia.responsavel
                    }
                  </strong>
                </p>
              </div>

              <div className="rounded-2xl bg-green-500/15 px-5 py-3 text-sm">
                <p>
                  Cadastur
                </p>

                <p className="font-black text-green-300">
                  {
                    agencia.cadastur
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/60">
                  CNPJ
                </p>

                <p className="font-bold">
                  {
                    agencia.documento
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/60">
                  E-mail
                </p>

                <p className="font-bold">
                  {
                    agencia.email
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/60">
                  Status
                </p>

                <p className="font-black text-green-300">
                  APROVADO
                </p>
              </div>
            </div>
          </div>

          {/* ==================================
              CABEÇALHO
          ================================== */}

          <div className="mb-6 rounded-3xl border border-white/10 bg-black/45 p-6 shadow-xl backdrop-blur-sm">
            <p className="text-sm font-semibold text-emerald-300">
              Parque Mundo Novo
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Compras e Reservas para Parceiros
            </h1>

            <p className="mt-3 max-w-3xl text-slate-100">
              Escolha como deseja
              organizar a visita do grupo.
              Você pode pagar antecipadamente
              ou fazer a reserva para pagamento
              na chegada ao Parque.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-black">
                  👥 Até 20 pessoas
                </p>

                <p className="mt-1 text-emerald-300">
                  5% de desconto
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-black">
                  👥 Acima de 20
                </p>

                <p className="mt-1 text-emerald-300">
                  10% de desconto
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-black">
                  👴 Meia entrada
                </p>

                <p className="mt-1 text-white/70">
                  Sem desconto adicional
                </p>
              </div>
            </div>
          </div>

          {/* ==================================
              ESCOLHER MODALIDADE
          ================================== */}

          <section className="mb-6 rounded-3xl bg-white p-6 text-slate-900 shadow-xl">
            <h2 className="text-2xl font-black">
              Como deseja realizar esta reserva?
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              {/* ANTECIPADO */}

              <button
                type="button"
                onClick={() => {
                  setModalidade(
                    "antecipado"
                  );

                  setMensagem("");
                  setTipoMensagem("");
                  setReservaCriada(
                    null
                  );
                }}
                className={`rounded-2xl border-2 p-5 text-left transition ${modalidade ===
                    "antecipado"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
              >
                <p className="text-2xl">
                  💳
                </p>

                <p className="mt-2 text-xl font-black">
                  Comprar antecipadamente
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Faça a compra antes da visita.
                  Após a confirmação do pagamento,
                  o grupo ficará liberado para entrada.
                </p>

                {modalidade ===
                  "antecipado" && (
                    <span className="mt-4 inline-block rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                      SELECIONADO
                    </span>
                  )}
              </button>

              {/* CHEGADA */}

              <button
                type="button"
                onClick={() => {
                  setModalidade(
                    "chegada"
                  );

                  setMensagem("");
                  setTipoMensagem("");
                  setReservaCriada(
                    null
                  );
                }}
                className={`rounded-2xl border-2 p-5 text-left transition ${modalidade ===
                    "chegada"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
              >
                <p className="text-2xl">
                  🚌
                </p>

                <p className="mt-2 text-xl font-black">
                  Reservar e pagar na chegada
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Garanta o cadastro do grupo
                  e faça o pagamento na portaria
                  antes da entrada.
                </p>

                {modalidade ===
                  "chegada" && (
                    <span className="mt-4 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                      SELECIONADO
                    </span>
                  )}
              </button>
            </div>
          </section>

          {/* ==================================
              CONTEÚDO
          ================================== */}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* FORMULÁRIO */}

            <section className="rounded-3xl bg-white/95 p-6 text-slate-900 shadow-xl backdrop-blur lg:col-span-2">

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black">
                  Dados da visita
                </h2>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-black ${modalidade ===
                      "antecipado"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                    }`}
                >
                  {modalidade ===
                    "antecipado"
                    ? "COMPRA ANTECIPADA"
                    : "PAGAMENTO NA CHEGADA"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* DATA */}

                <label>
                  <span className="font-medium">
                    Data da visita
                  </span>

                  <input
                    type="date"
                    min={
                      dataHoje
                    }
                    value={
                      dataVisita
                    }
                    onChange={(
                      e
                    ) =>
                      setDataVisita(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-3"
                  />
                </label>

                {/* HORÁRIO */}

                <label>
                  <span className="font-medium">
                    Chegada prevista
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
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-3"
                  />
                </label>

                {/* VEÍCULO */}

                <label>
                  <span className="font-medium">
                    Tipo de veículo
                  </span>

                  <select
                    value={
                      tipoVeiculo
                    }
                    onChange={(
                      e
                    ) =>
                      setTipoVeiculo(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-3"
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

                {/* ADULTOS */}

                <label>
                  <span className="font-medium">
                    Adultos
                  </span>

                  <input
                    type="number"
                    min={
                      0
                    }
                    value={
                      adultos
                    }
                    onChange={(
                      e
                    ) =>
                      setAdultos(
                        Math.max(
                          0,
                          Number(
                            e.target.value
                          )
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-3"
                  />
                </label>

                {/* IDOSOS */}

                <label>
                  <span className="font-medium">
                    Idosos / meia entrada
                  </span>

                  <input
                    type="number"
                    min={
                      0
                    }
                    value={
                      idosos
                    }
                    onChange={(
                      e
                    ) =>
                      setIdosos(
                        Math.max(
                          0,
                          Number(
                            e.target.value
                          )
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-3"
                  />
                </label>

                {/* ELEVADOR */}

                <div>
                  <span className="font-medium">
                    Elevador Panorâmico
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
                      className={`rounded-xl border px-5 py-3 font-bold ${!temElevador
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
                      className={`rounded-xl border px-5 py-3 font-bold ${temElevador
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-900"
                        }`}
                    >
                      Sim
                    </button>
                  </div>
                </div>

                {/* QUANTIDADE ELEVADOR */}

                {temElevador && (
                  <label>
                    <span className="font-medium">
                      Pessoas no Elevador
                    </span>

                    <input
                      type="number"
                      min={
                        0
                      }
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
                          Math.max(
                            0,
                            Number(
                              e.target.value
                            )
                          )
                        )
                      }
                      className="mt-1 w-full rounded-xl border px-3 py-3"
                    />
                  </label>
                )}
              </div>

              {/* OBSERVAÇÃO */}

              <label className="mt-5 block">
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
                      e.target.value
                    )
                  }
                  placeholder="Informações sobre o grupo, ônibus, guia, necessidades especiais etc."
                  className="mt-1 min-h-28 w-full rounded-xl border px-3 py-3"
                />
              </label>

              {/* MENSAGEM */}

              {mensagem && (
                <div
                  className={`mt-5 rounded-xl border p-4 font-medium ${tipoMensagem ===
                      "erro"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                >
                  {
                    mensagem
                  }
                </div>
              )}

              {/* RESERVA CRIADA */}

              {reservaCriada && (
                <div className="mt-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
                  <p className="text-sm font-bold uppercase text-emerald-700">
                    Código do grupo
                  </p>

                  <p className="mt-1 font-mono text-2xl font-black text-emerald-900">
                    {
                      reservaCriada.codigoGrupo
                    }
                  </p>

                  <p className="mt-3 text-sm">
                    Grupo:{" "}
                    <strong>
                      {
                        reservaCriada.totalVisitantes
                      } pessoa(s)
                    </strong>
                  </p>

                  <p className="mt-1 text-sm">
                    Valor:{" "}
                    <strong>
                      {formatarMoeda(
                        reservaCriada.valorFinal
                      )}
                    </strong>
                  </p>
                </div>
              )}

              {/* WHATSAPP */}

              {linkWhatsApp && (
                <a
                  href={
                    linkWhatsApp
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-white"
                >
                  Enviar novamente para o WhatsApp do Parque
                </a>
              )}

              {/* BOTÃO */}

              {modalidade ===
                "chegada" ? (
                <button
                  type="button"
                  onClick={
                    criarReservaChegada
                  }
                  disabled={
                    carregando
                  }
                  className="mt-6 w-full rounded-xl bg-blue-600 py-4 text-lg font-black text-white transition hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {carregando
                    ? "Criando reserva..."
                    : "Confirmar reserva e pagar na chegada"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    criarReservaAntecipada
                  }
                  disabled={
                    carregando
                  }
                  className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-lg font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
                >
                  {carregando
                    ? "Preparando compra..."
                    : "Continuar para compra antecipada"}
                </button>
              )}
            </section>

            {/* ==================================
                RESUMO
            ================================== */}

            <aside className="h-fit rounded-3xl bg-white/95 p-6 text-slate-900 shadow-xl">

              <h2 className="text-xl font-black">
                Resumo
              </h2>

              <div className="mt-5 space-y-3 text-sm">

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

                <div className="flex justify-between border-t pt-3 text-lg">
                  <span>
                    Total
                  </span>

                  <strong>
                    {
                      calculo.totalVisitantes
                    } pessoa(s)
                  </strong>
                </div>

                {/* DESCONTO */}

                <div className="rounded-xl bg-emerald-100 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-emerald-700">
                    Desconto do grupo
                  </p>

                  <p className="mt-1 text-3xl font-black text-emerald-800">
                    {
                      calculo.percentualDesconto
                    }
                    %
                  </p>
                </div>

                <hr />

                {/* ADULTOS */}

                <div className="flex justify-between">
                  <span>
                    Adultos
                  </span>

                  <strong>
                    {formatarMoeda(
                      calculo.valorAdultosBruto
                    )}
                  </strong>
                </div>

                {calculo.descontoAdultos >
                  0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Desconto adultos
                      </span>

                      <strong>
                        -{" "}
                        {formatarMoeda(
                          calculo.descontoAdultos
                        )}
                      </strong>
                    </div>
                  )}

                {/* IDOSOS */}

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

                {/* ELEVADOR */}

                {temElevador && (
                  <>
                    <div className="flex justify-between">
                      <span>
                        Elevador
                      </span>

                      <strong>
                        {formatarMoeda(
                          calculo.valorElevadorBruto
                        )}
                      </strong>
                    </div>

                    {calculo.descontoElevador >
                      0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>
                            Desconto elevador
                          </span>

                          <strong>
                            -{" "}
                            {formatarMoeda(
                              calculo.descontoElevador
                            )}
                          </strong>
                        </div>
                      )}
                  </>
                )}

                <hr />

                {/* BRUTO */}

                <div className="flex justify-between">
                  <span>
                    Valor normal
                  </span>

                  <strong>
                    {formatarMoeda(
                      calculo.valorBruto
                    )}
                  </strong>
                </div>

                {/* DESCONTO */}

                <div className="flex justify-between text-emerald-700">
                  <span>
                    Desconto total
                  </span>

                  <strong>
                    -{" "}
                    {formatarMoeda(
                      calculo.valorDesconto
                    )}
                  </strong>
                </div>

                {/* TOTAL */}

                <div
                  className={`rounded-xl p-4 text-white ${modalidade ===
                      "antecipado"
                      ? "bg-emerald-700"
                      : "bg-blue-700"
                    }`}
                >
                  <p className="text-xs font-bold uppercase">
                    {modalidade ===
                      "antecipado"
                      ? "Valor da compra antecipada"
                      : "Valor a pagar na chegada"}
                  </p>

                  <p className="mt-1 text-3xl font-black">
                    {formatarMoeda(
                      calculo.valorFinal
                    )}
                  </p>
                </div>
              </div>

              {/* AVISO */}

              {modalidade ===
                "chegada" ? (
                <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-900">
                  <p className="font-black">
                    💰 Pagamento na chegada
                  </p>

                  <p className="mt-2">
                    O grupo deverá realizar
                    o pagamento no Parque
                    antes da confirmação
                    da entrada.
                  </p>

                  <p className="mt-2">
                    Será gerado um código
                    e QR Code para identificação
                    do grupo na portaria.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                  <p className="font-black">
                    💳 Compra antecipada
                  </p>

                  <p className="mt-2">
                    O grupo somente ficará
                    liberado para entrada
                    depois que o pagamento
                    online for confirmado.
                  </p>

                  <p className="mt-2 font-bold">
                    Nesta etapa estamos
                    preparando a reserva.
                    O pagamento online será
                    conectado na próxima alteração.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}