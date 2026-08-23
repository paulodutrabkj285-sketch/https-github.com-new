"use client";

import {
  Agencia,
  agenciaPodeReservar,
  buscarAgenciaPorId,
  calcularDescontoGrupo,
} from "@/lib/agencias";

import { db } from "@/lib/firebase";
import { criarPedido } from "@/lib/pedidos";

import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
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

type RespostaSessao = {
  ok?: boolean;
  autenticado?: boolean;

  parceiro?: {
    agenciaId?: string;
    documento?: string;
    email?: string;
  };

  error?: string;
};

/* ==========================================
   FUNDOS
========================================== */

const imagensFundo = [
  "/fotos/fundo-geral.jpg",
  "/fotos/cachoeira-alta.png",
  "/fotos/cachoeira-lago.png",
];

/* ==========================================
   AUXILIARES
========================================== */

function somenteDigitos(
  valor?: string
) {
  return String(
    valor || ""
  ).replace(
    /\D/g,
    ""
  );
}

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
    modalidadePagamento,
    setModalidadePagamento,
  ] = useState<
    "chegada" | "antecipado"
  >("chegada");

  const [
    cpfPagador,
    setCpfPagador,
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
     CARREGAR PARCEIRO PELA SESSÃO SEGURA
  ====================================== */

  useEffect(() => {
    let componenteAtivo =
      true;

    async function carregarAgencia() {
      try {
        if (
          componenteAtivo
        ) {
          setCarregandoAgencia(
            true
          );

          setErroAgencia("");
          setAgencia(null);
        }

        const respostaSessao =
          await fetch(
            "/parceiros/sessao",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",

              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        let dadosSessao:
          RespostaSessao = {};

        try {
          dadosSessao =
            await respostaSessao.json();
        } catch {
          dadosSessao = {};
        }

        if (
          !respostaSessao.ok ||
          !dadosSessao.ok ||
          !dadosSessao.autenticado ||
          !dadosSessao.parceiro?.agenciaId
        ) {
          if (
            typeof window !==
            "undefined"
          ) {
            window.location.replace(
              "/parceiros/acesso"
            );
          }

          return;
        }

        const agenciaId =
          String(
            dadosSessao
              .parceiro
              .agenciaId || ""
          ).trim();

        if (!agenciaId) {
          if (
            typeof window !==
            "undefined"
          ) {
            window.location.replace(
              "/parceiros/acesso"
            );
          }

          return;
        }

        const encontrada =
          await buscarAgenciaPorId(
            agenciaId
          );

        if (!encontrada) {
          if (componenteAtivo) {
            setErroAgencia(
              "Cadastro de parceiro não encontrado."
            );
          }

          return;
        }

        const documentoSessao =
          somenteDigitos(
            dadosSessao
              .parceiro
              .documento
          );

        const documentoAgencia =
          somenteDigitos(
            encontrada.documento
          );

        const emailSessao =
          String(
            dadosSessao
              .parceiro
              .email || ""
          )
            .trim()
            .toLowerCase();

        const emailAgencia =
          String(
            encontrada.email || ""
          )
            .trim()
            .toLowerCase();

        if (
          documentoSessao &&
          documentoAgencia &&
          documentoSessao !==
          documentoAgencia
        ) {
          if (
            typeof window !==
            "undefined"
          ) {
            window.location.replace(
              "/parceiros/acesso"
            );
          }

          return;
        }

        if (
          emailSessao &&
          emailAgencia &&
          emailSessao !==
          emailAgencia
        ) {
          if (
            typeof window !==
            "undefined"
          ) {
            window.location.replace(
              "/parceiros/acesso"
            );
          }

          return;
        }

        if (componenteAtivo) {
          setAgencia(encontrada);
        }

        if (
          encontrada.status ===
          "pendente"
        ) {
          setErroAgencia(
            "Seu cadastro foi recebido e está aguardando análise do Parque Mundo Novo."
          );
          return;
        }

        if (
          encontrada.status ===
          "reprovada"
        ) {
          setErroAgencia(
            "Este cadastro não foi aprovado. Entre em contato com o Parque Mundo Novo."
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
            "Este parceiro ainda não está autorizado a realizar reservas com desconto."
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

        setErroAgencia("");
      } catch (error) {
        console.error(
          "Erro ao carregar agência pela sessão:",
          error
        );

        if (componenteAtivo) {
          setErroAgencia(
            "Não foi possível verificar sua sessão de parceiro."
          );
        }
      } finally {
        if (componenteAtivo) {
          setCarregandoAgencia(
            false
          );
        }
      }
    }

    carregarAgencia();

    return () => {
      componenteAtivo = false;
    };
  }, []);

  /* ======================================
     CÁLCULO
  ====================================== */

  const calculo =
    useMemo(() => {
      const totalVisitantes =
        adultos + idosos;

      const percentualDesconto =
        calcularDescontoGrupo(
          totalVisitantes
        );

      const fatorDesconto =
        percentualDesconto / 100;

      /* ADULTOS */

      const valorAdultosBruto =
        adultos * VALOR_ADULTO;

      const descontoAdultos =
        valorAdultosBruto *
        fatorDesconto;

      const valorAdultosFinal =
        valorAdultosBruto -
        descontoAdultos;

      /* IDOSOS */

      const valorIdososBruto =
        idosos * VALOR_IDOSO;

      // Idoso já possui meia-entrada.
      // Não recebe desconto adicional.
      const valorIdososFinal =
        valorIdososBruto;

      /* ELEVADOR */

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

      /* TOTAL */

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
      return "Esta agência não está autorizada a realizar reservas.";
    }

    if (!dataVisita) {
      return "Informe a data da visita.";
    }

    if (
      dataVisita < dataHoje
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

    if (
      modalidadePagamento ===
      "antecipado" &&
      somenteDigitos(
        cpfPagador
      ).length !== 11
    ) {
      return "Informe o CPF do responsável pelo pagamento antecipado.";
    }

    return "";
  }

  /* ======================================
     WHATSAPP
  ====================================== */

  function gerarLinkWhatsApp(
    codigoGrupo: string,
    modalidade:
      | "chegada"
      | "antecipado" =
      "chegada"
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
${modalidade ===
        "antecipado"
        ? "ANTECIPADO - AGUARDANDO CONFIRMAÇÃO"
        : "NA CHEGADA AO PARQUE"
      }

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
     DADOS BASE
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
      agenciaId:
        agencia.id,

      agenciaNome:
        agencia.nomeEmpresa,

      agenciaResponsavel:
        agencia.responsavel,

      agenciaDocumento:
        agencia.documento,

      agenciaCadastur:
        agencia.cadastur || "",

      agenciaEmail:
        agencia.email,

      agenciaWhatsapp:
        agencia.whatsapp,

      tipoParceiro:
        agencia.tipoParceiro,

      categoriaParceiro:
        agencia.categoria,

      dataVisita,

      horaPrevista,

      tipoVeiculo,

      adultos,

      idosos,

      totalVisitantes:
        calculo.totalVisitantes,

      elevador:
        temElevador,

      qtdElevador:
        temElevador
          ? qtdElevador
          : 0,

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

      codigoGrupo,

      qrCodeGrupo,

      origem:
        "parceiros",

      tipoReserva:
        "agencia_guia",

      observacoes,

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
    setTipoVeiculo("Ônibus");
    setAdultos(0);
    setIdosos(0);
    setTemElevador(false);
    setQtdElevador(0);
    setObservacoes("");
    setCpfPagador("");
  }
  /* ======================================
   RESERVAR E PAGAR NA CHEGADA
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
          codigoGrupo,
          "chegada"
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

          checkoutCriado:
            false,

          pedidoId:
            "",

          whatsappParque:
            WHATSAPP_PARQUE,

          whatsappReserva,

          enviadoWhatsAppParque:
            true,
        }
      );

      setReservaCriada({
        codigoGrupo,

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
     RESERVAR E PAGAR ANTECIPADAMENTE
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

    if (!agencia) {
      setTipoMensagem(
        "erro"
      );

      setMensagem(
        "Agência não identificada."
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
       * O QR identifica a reserva.
       *
       * O status de pagamento
       * deve ser consultado no
       * Firestore pela portaria.
       */

      const qrCodeGrupo =
        await QRCode.toDataURL(
          JSON.stringify({
            tipo:
              "reserva_agencia",

            codigoGrupo,

            agenciaId:
              agencia.id,

            modalidade:
              "antecipado",
          })
        );

      const whatsappReserva =
        gerarLinkWhatsApp(
          codigoGrupo,
          "antecipado"
        );

      /* ==================================
         1. CRIAR RESERVA
      ================================== */

      const reservaRef =
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
              "pendente",

            formaPagamento:
              "aguardando_escolha",

            pagamentoNaChegada:
              false,

            statusOperacional:
              "aguardando_pagamento",

            checkoutCriado:
              false,

            pedidoId:
              "",

            pedidoPagamentoId:
              "",

            cpfPagador:
              somenteDigitos(
                cpfPagador
              ),

            whatsappParque:
              WHATSAPP_PARQUE,

            whatsappReserva,

            enviadoWhatsAppParque:
              false,
          }
        );

      /* ==================================
         2. CRIAR PEDIDO DE PAGAMENTO
      ================================== */

      const pedidoId =
        await criarPedido({
          produto:
            `Reserva de Agência - ${codigoGrupo}`,

          tipo:
            "reserva_agencia",

          origem:
            "parceiro",

          reservaAgenciaId:
            reservaRef.id,

          codigoGrupo,

          agenciaId:
            agencia.id,

          agenciaNome:
            agencia.nomeEmpresa,

          nome:
            agencia.responsavel ||
            agencia.nomeEmpresa,

          cpf:
            somenteDigitos(
              cpfPagador
            ),

          telefone:
            somenteDigitos(
              agencia.whatsapp ||
              agencia.telefone ||
              ""
            ),

          email:
            agencia.email ||
            "",

          dataVisita,

          quantidadePessoas:
            calculo.totalVisitantes,

          quantidade:
            calculo.totalVisitantes,

          valorUnitario:
            calculo.totalVisitantes >
              0
              ? Number(
                (
                  calculo.valorFinal /
                  calculo.totalVisitantes
                ).toFixed(2)
              )
              : calculo.valorFinal,

          /*
           * IMPORTANTE:
           * fica salvo o valor REAL
           * da reserva.
           *
           * O teste de R$ 1 é feito
           * apenas pela rota do cartão.
           */

          valorTotal:
            calculo.valorFinal,

          statusPagamento:
            "pendente",

          statusOperacional:
            "aguardando_pagamento",

          formaPagamento:
            "pendente",

          parcelas:
            1,
        });

      /* ==================================
         3. VINCULAR PEDIDO À RESERVA
      ================================== */

      await updateDoc(
        doc(
          db,
          "reservas_agencias",
          reservaRef.id
        ),
        {
          pedidoId,

          pedidoPagamentoId:
            pedidoId,

          checkoutCriado:
            true,

          checkoutCriadoEm:
            new Date()
              .toISOString(),

          updatedAt:
            serverTimestamp(),
        }
      );

      /* ==================================
         4. IR PARA CHECKOUT
      ================================== */

      const parametros =
        new URLSearchParams({
          pedidoId,

          produto:
            `Reserva de Agência - ${codigoGrupo}`,

          tipo:
            "reserva_agencia",

          quantidade:
            String(
              calculo.totalVisitantes
            ),

          valorTotal:
            String(
              calculo.valorFinal
            ),

          cpf:
            somenteDigitos(
              cpfPagador
            ),

          nome:
            agencia.responsavel ||
            agencia.nomeEmpresa,

          email:
            agencia.email ||
            "",
        });

      window.location.href =
        `/checkout/pagamento?${parametros.toString()}`;
    } catch (error) {
      console.error(
        "Erro ao criar reserva antecipada:",
        error
      );

      setTipoMensagem(
        "erro"
      );

      setMensagem(
        "Não foi possível criar o pagamento antecipado. Tente novamente."
      );
    } finally {
      setCarregando(
        false
      );
    }
  }

  /* ======================================
     CARREGANDO
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
            Verificando sessão do parceiro...
          </p>
        </div>
      </main>
    );
  }

  /* ======================================
     NÃO AUTORIZADO
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
            Reservas com desconto são liberadas somente
            após a aprovação do cadastro.
          </p>

          <a
            href="/parceiros/acesso"
            className="mt-6 inline-block rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white"
          >
            Voltar para a área do parceiro
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
                  CNPJ / Documento
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
              Reservas para Parceiros
            </h1>

            <p className="mt-3 max-w-3xl text-slate-100">
              Cadastre a visita do grupo com antecedência e
              escolha entre pagamento antecipado ou pagamento
              na chegada.
            </p>

            {/* ==================================
                REGRA CORRETA DE DESCONTOS

                1 a 4  = 0%
                5 a 20 = 5%
                21+    = 10%
            ================================== */}

            <div className="mt-5 grid gap-3 md:grid-cols-4">

              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-black">
                  👥 1 a 4 pessoas
                </p>

                <p className="mt-1 text-white/70">
                  Sem desconto
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-black">
                  👥 5 a 20 pessoas
                </p>

                <p className="mt-1 text-emerald-300">
                  5% de desconto
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="font-black">
                  👥 Acima de 20 pessoas
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
              PAGAMENTO
          ================================== */}

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                Forma de pagamento
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Como deseja pagar a reserva?
              </h2>

              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Escolha entre pagar antecipadamente por Pix ou
                cartão, ou apenas registrar o grupo e pagar na
                chegada ao Parque.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <button
                  type="button"
                  onClick={() => {
                    setModalidadePagamento(
                      "antecipado"
                    );

                    setMensagem("");
                    setTipoMensagem("");
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition ${modalidadePagamento ===
                      "antecipado"
                      ? "border-emerald-600 bg-emerald-50 shadow-md"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                >
                  <p className="text-xl font-black text-emerald-800">
                    💳 Pagamento antecipado
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Pague agora por Pix ou cartão de crédito.
                    Após a confirmação, a reserva ficará marcada
                    como paga para conferência na portaria.
                  </p>

                  <p className="mt-3 text-xs font-black uppercase text-emerald-700">
                    Pix ou cartão
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalidadePagamento(
                      "chegada"
                    );

                    setMensagem("");
                    setTipoMensagem("");
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition ${modalidadePagamento ===
                      "chegada"
                      ? "border-blue-600 bg-blue-50 shadow-md"
                      : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                >
                  <p className="text-xl font-black text-blue-800">
                    🚌 Pagamento na chegada
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Registre o grupo antecipadamente e efetue
                    o pagamento no Parque antes da liberação
                    da entrada.
                  </p>

                  <p className="mt-3 text-xs font-black uppercase text-blue-700">
                    Reserva para conferência
                  </p>
                </button>
              </div>

              {modalidadePagamento ===
                "antecipado" && (
                  <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-black">
                      🧪 Teste do pagamento antecipado
                    </p>

                    <p className="mt-1">
                      Durante o teste local do cartão, mantenha{" "}
                      <strong>
                        SICREDI_IPG_VALOR_TESTE=true
                      </strong>
                      . O valor real da reserva continuará registrado
                      no sistema, mas o Sicredi cobrará somente R$ 1,00
                      no cartão.
                    </p>
                  </div>
                )}
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
                  className={`rounded-full px-4 py-2 text-xs font-black ${modalidadePagamento ===
                      "antecipado"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                    }`}
                >
                  {modalidadePagamento ===
                    "antecipado"
                    ? "PAGAMENTO ANTECIPADO"
                    : "PAGAMENTO NA CHEGADA"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

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
                          : "bg-white"
                        }`}
                    >
                      Não
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTemElevador(
                          true
                        );

                        if (
                          qtdElevador ===
                          0
                        ) {
                          setQtdElevador(
                            calculo.totalVisitantes
                          );
                        }
                      }}
                      className={`rounded-xl border px-5 py-3 font-bold ${temElevador
                          ? "bg-emerald-600 text-white"
                          : "bg-white"
                        }`}
                    >
                      Sim
                    </button>
                  </div>
                </div>
                {temElevador && (
                  <label>
                    <span className="font-medium">
                      Pessoas no Elevador
                    </span>

                    <input
                      type="number"
                      min={
                        1
                      }
                      max={
                        calculo.totalVisitantes
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

              {modalidadePagamento ===
                "antecipado" && (
                  <label className="mt-5 block">
                    <span className="font-medium">
                      CPF do responsável pelo pagamento
                    </span>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        cpfPagador
                      }
                      onChange={(
                        e
                      ) =>
                        setCpfPagador(
                          e.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(
                              0,
                              11
                            )
                        )
                      }
                      placeholder="Somente números"
                      className="mt-1 w-full rounded-xl border px-3 py-3"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Necessário para gerar a cobrança Pix e identificar
                      o responsável pelo pagamento antecipado.
                    </p>
                  </label>
                )}

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
                      }{" "}
                      pessoa(s)
                    </strong>
                  </p>

                  <p className="mt-1 text-sm">
                    Valor a pagar na chegada:{" "}
                    <strong>
                      {formatarMoeda(
                        reservaCriada.valorFinal
                      )}
                    </strong>
                  </p>
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
                  Enviar novamente para o WhatsApp do Parque
                </a>
              )}

              <button
                type="button"
                onClick={
                  modalidadePagamento ===
                    "antecipado"
                    ? criarReservaAntecipada
                    : criarReservaChegada
                }
                disabled={
                  carregando
                }
                className={`mt-6 w-full rounded-xl py-4 text-lg font-black text-white transition disabled:bg-slate-400 ${modalidadePagamento ===
                    "antecipado"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                {carregando
                  ? modalidadePagamento ===
                    "antecipado"
                    ? "Criando pagamento..."
                    : "Criando reserva..."
                  : modalidadePagamento ===
                    "antecipado"
                    ? "Confirmar reserva e pagar agora"
                    : "Confirmar reserva e pagar na chegada"}
              </button>
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
                    }{" "}
                    pessoa(s)
                  </strong>
                </div>

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

                <div className="rounded-xl bg-blue-700 p-4 text-white">
                  <p className="text-xs font-bold uppercase">
                    {modalidadePagamento ===
                      "antecipado"
                      ? "Valor da reserva"
                      : "Valor a pagar na chegada"}
                  </p>

                  <p className="mt-1 text-3xl font-black">
                    {formatarMoeda(
                      calculo.valorFinal
                    )}
                  </p>
                </div>
              </div>

              {modalidadePagamento ===
                "antecipado" ? (
                <>
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                    <p className="font-black">
                      💳 Pagamento antecipado
                    </p>

                    <p className="mt-2">
                      Ao confirmar, será criado um pedido vinculado
                      a esta reserva e você seguirá para o checkout
                      para escolher Pix ou cartão de crédito.
                    </p>

                    <p className="mt-2">
                      A reserva somente será considerada paga após
                      a confirmação do Sicredi.
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                    <p className="font-black">
                      🧪 Teste de R$ 1,00 no cartão
                    </p>

                    <p className="mt-2">
                      Com SICREDI_IPG_VALOR_TESTE=true no ambiente
                      local, o cartão será cobrado em R$ 1,00. O
                      valor real da reserva permanecerá registrado
                      para conferência do teste.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-900">
                    <p className="font-black">
                      💰 Pagamento na chegada
                    </p>

                    <p className="mt-2">
                      O grupo deverá realizar o pagamento no Parque
                      antes da confirmação da entrada.
                    </p>

                    <p className="mt-2">
                      Será gerado um código e QR Code para
                      identificação do grupo na portaria.
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
                    <p className="font-black">
                      ℹ️ Reserva antecipada
                    </p>

                    <p className="mt-2">
                      Esta reserva garante o cadastro antecipado do
                      grupo. O valor indicado deverá ser pago na
                      chegada ao Parque.
                    </p>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}