"use client";

import {
  Agencia,
  agenciaPodeReservar,
  atualizarMesProgramaParceiro,
  buscarAgenciaPorId,
  calcularDescontoParceiro,
  calcularPontosReserva,
  calcularProgressoParceiro,
  obterInformacoesNivel,
  prepararProgramaParceiro,
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

/*
 * Versão das regras.
 *
 * Se futuramente as regras mudarem,
 * alteramos esta versão.
 *
 * Assim a reserva guarda quais regras
 * o parceiro aceitou naquele momento.
 */
const VERSAO_REGRAS_PARCEIROS =
  "2026-08-31-v1";

/* ==========================================
   TIPOS
========================================== */

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

function iconeCategoria(
  categoria?: string
) {
  switch (categoria) {
    case "Diamante":
      return "💎";

    case "Ouro":
      return "🥇";

    case "Prata":
      return "🥈";

    case "Bronze":
    default:
      return "🥉";
  }
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
    criancas,
    setCriancas,
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
    aceitouRegras,
    setAceitouRegras,
  ] = useState(false);

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
     CARREGAR PARCEIRO
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
          !dadosSessao
            .parceiro
            ?.agenciaId
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

        let encontrada =
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

        /* ==================================
           VALIDAR SESSÃO
        ================================== */

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

        /* ==================================
           ATUALIZAR VIRADA DE MÊS
        ================================== */

        if (
          encontrada.status ===
          "ativa"
        ) {
          try {
            const programa =
              await atualizarMesProgramaParceiro(
                encontrada
              );

            if (
              programa.mudouMes
            ) {
              const atualizada =
                await buscarAgenciaPorId(
                  agenciaId
                );

              if (atualizada) {
                encontrada =
                  atualizada;
              }
            }
          } catch (error) {
            console.error(
              "Erro ao atualizar mês do programa:",
              error
            );
          }
        }

        if (
          componenteAtivo
        ) {
          setAgencia(
            encontrada
          );
        }

        /* ==================================
           STATUS
        ================================== */

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
            "Este parceiro ainda não está autorizado a realizar reservas."
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

        if (
          componenteAtivo
        ) {
          setErroAgencia(
            "Não foi possível verificar sua sessão de parceiro."
          );
        }
      } finally {
        if (
          componenteAtivo
        ) {
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
     PROGRAMA DO PARCEIRO
  ====================================== */

  const programaAtual =
    useMemo(() => {
      if (!agencia) {
        return null;
      }

      return prepararProgramaParceiro(
        agencia
      );
    }, [
      agencia,
    ]);

  const pontosMes =
    Number(
      programaAtual
        ?.pontosMesAtual ||
      agencia
        ?.pontosMesAtual ||
      0
    );

  const progresso =
    useMemo(() => {
      return calcularProgressoParceiro(
        pontosMes
      );
    }, [
      pontosMes,
    ]);

  const categoriaAtual =
    agencia?.categoria ||
    programaAtual
      ?.categoriaAtual ||
    "Bronze";

  const infoNivel =
    useMemo(() => {
      return obterInformacoesNivel(
        categoriaAtual
      );
    }, [
      categoriaAtual,
    ]);

  /* ======================================
     CÁLCULO DA RESERVA
  ====================================== */

  const calculo =
    useMemo(() => {
      const totalVisitantes =
        adultos +
        idosos +
        criancas;

      /*
       * PONTOS POTENCIAIS.
       *
       * Eles ainda NÃO são creditados
       * apenas pela criação da reserva.
       *
       * Serão usados posteriormente
       * quando a visita for validada.
       */
      const pontosPotenciais =
        calcularPontosReserva(
          adultos,
          idosos,
          criancas
        );

      /*
       * O desconto do nível somente
       * é liberado no pagamento
       * antecipado.
       */
      const percentualDesconto =
        calcularDescontoParceiro(
          agencia,
          modalidadePagamento
        );

      const fatorDesconto =
        percentualDesconto /
        100;

      /* ==================================
         ADULTOS
      ================================== */

      const valorAdultosBruto =
        adultos *
        VALOR_ADULTO;

      /*
       * O desconto do Programa de Parceiros
       * é aplicado ao ingresso inteiro.
       */
      const descontoAdultos =
        modalidadePagamento ===
          "antecipado"
          ? valorAdultosBruto *
          fatorDesconto
          : 0;

      const valorAdultosFinal =
        valorAdultosBruto -
        descontoAdultos;

      /* ==================================
         IDOSOS / MEIA
      ================================== */

      const valorIdososBruto =
        idosos *
        VALOR_IDOSO;

      /*
       * Já possui tarifa reduzida.
       * Não acumula desconto adicional
       * do programa.
       */
      const descontoIdosos =
        0;

      const valorIdososFinal =
        valorIdososBruto;

      /* ==================================
         CRIANÇAS GRATUITAS
      ================================== */

      const valorCriancas =
        0;

      /* ==================================
         ELEVADOR
      ================================== */

      const valorElevadorBruto =
        temElevador
          ? qtdElevador *
          VALOR_ELEVADOR
          : 0;

      /*
       * O benefício de parceiro desta
       * versão é aplicado aos ingressos
       * inteiros do Parque.
       *
       * Elevador não acumula desconto
       * do nível.
       */
      const descontoElevador =
        0;

      const valorElevadorFinal =
        valorElevadorBruto;

      /* ==================================
         TOTAL
      ================================== */

      const valorBruto =
        valorAdultosBruto +
        valorIdososBruto +
        valorElevadorBruto;

      const valorDesconto =
        descontoAdultos +
        descontoIdosos +
        descontoElevador;

      const valorFinal =
        valorAdultosFinal +
        valorIdososFinal +
        valorCriancas +
        valorElevadorFinal;

      return {
        totalVisitantes,

        pontosPotenciais,

        percentualDesconto,

        valorAdultosBruto,
        descontoAdultos,
        valorAdultosFinal,

        valorIdososBruto,
        descontoIdosos,
        valorIdososFinal,

        valorCriancas,

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
      criancas,
      temElevador,
      qtdElevador,
      agencia,
      modalidadePagamento,
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
      dataVisita <
      dataHoje
    ) {
      return "A data da visita não pode ser anterior à data de hoje.";
    }

    if (
      adultos <= 0 &&
      idosos <= 0 &&
      criancas <= 0
    ) {
      return "Informe pelo menos 1 visitante.";
    }

    if (
      adultos < 0 ||
      idosos < 0 ||
      criancas < 0
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

    if (
      !aceitouRegras
    ) {
      return "Leia e aceite as regras da reserva e do Programa de Parceiros antes de continuar.";
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
    const descricaoBeneficio =
      modalidade ===
        "antecipado"
        ? `${categoriaAtual} - ${calculo.percentualDesconto}%`
        : `${categoriaAtual} - benefício não aplicado nesta reserva porque o pagamento será realizado na chegada`;

    const texto = `
🏞️ NOVA RESERVA DE PARCEIRO

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

👨 Ingressos inteiros:
${adultos}

👴 Idosos / meia entrada:
${idosos}

👧 Crianças gratuitas:
${criancas}

👥 TOTAL:
${calculo.totalVisitantes} pessoa(s)

🚡 Elevador:
${temElevador
        ? `Sim - ${qtdElevador} pessoa(s)`
        : "Não"
      }

🏅 Nível do parceiro:
${categoriaAtual}

🎁 Benefício:
${descricaoBeneficio}

⭐ Pontos potenciais desta visita:
${calculo.pontosPotenciais}

💰 Valor normal:
${formatarMoeda(
        calculo.valorBruto
      )}

💸 Desconto aplicado:
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
        : "NA CHEGADA AO PARQUE - SEM DESCONTO DO PROGRAMA"
      }

📋 Regras do programa:
ACEITAS PELO PARCEIRO

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
      /* ==================================
         PARCEIRO
      ================================== */

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
        categoriaAtual,

      /* ==================================
         PROGRAMA
      ================================== */

      categoriaPrograma:
        categoriaAtual,

      descontoNivelParceiro:
        infoNivel.desconto,

      descontoAplicado:
        calculo.percentualDesconto,

      pontosMesNoMomento:
        pontosMes,

      pontosPotenciaisReserva:
        calculo.pontosPotenciais,

      pontosCreditados:
        false,

      pontosCreditadosEm:
        "",

      /*
       * Os pontos só devem virar
       * definitivos depois da regra
       * operacional de validação.
       */
      statusPontosPrograma:
        "aguardando_visita",

      /* ==================================
         VISITA
      ================================== */

      dataVisita,

      horaPrevista,

      tipoVeiculo,

      adultos,

      idosos,

      criancas,

      totalVisitantes:
        calculo.totalVisitantes,

      /* ==================================
         ELEVADOR
      ================================== */

      elevador:
        temElevador,

      qtdElevador:
        temElevador
          ? qtdElevador
          : 0,

      /* ==================================
         VALORES
      ================================== */

      valorAdultosBruto:
        calculo.valorAdultosBruto,

      descontoAdultos:
        calculo.descontoAdultos,

      valorAdultosFinal:
        calculo.valorAdultosFinal,

      valorIdososBruto:
        calculo.valorIdososBruto,

      descontoIdosos:
        0,

      valorIdososFinal:
        calculo.valorIdososFinal,

      valorCriancas:
        0,

      valorElevadorBruto:
        calculo.valorElevadorBruto,

      descontoElevador:
        0,

      valorElevadorFinal:
        calculo.valorElevadorFinal,

      valorBruto:
        calculo.valorBruto,

      valorDesconto:
        calculo.valorDesconto,

      valorFinal:
        calculo.valorFinal,

      /* ==================================
         RESERVA
      ================================== */

      codigoGrupo,

      qrCodeGrupo,

      origem:
        "parceiros",

      tipoReserva:
        "agencia_guia",

      observacoes,

      /* ==================================
         ACEITE DAS REGRAS
      ================================== */

      regrasAceitas:
        true,

      versaoRegras:
        VERSAO_REGRAS_PARCEIROS,

      regrasAceitasEm:
        new Date()
          .toISOString(),

      regraPagamentoAntecipado:
        modalidadePagamento ===
        "antecipado",

      regraDescontoSomenteAntecipado:
        true,

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
    setCriancas(0);

    setTemElevador(false);
    setQtdElevador(0);

    setObservacoes("");
    setCpfPagador("");

    setAceitouRegras(false);
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

    if (
      erroValidacao
    ) {
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

          /*
           * MUITO IMPORTANTE:
           *
           * Pagamento na chegada
           * não recebe benefício
           * Bronze / Prata / Ouro /
           * Diamante.
           */
          descontoAplicado:
            0,

          valorDesconto:
            0,

          valorAdultosFinal:
            calculo
              .valorAdultosBruto,

          valorFinal:
            calculo
              .valorBruto,

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
          calculo.valorBruto,
      });

      setLinkWhatsApp(
        whatsappReserva
      );

      setTipoMensagem(
        "sucesso"
      );

      setMensagem(
        `Reserva criada com sucesso. Código ${codigoGrupo}. O grupo possui ${calculo.totalVisitantes} pessoa(s). Como foi escolhido pagamento na chegada, o benefício do Programa de Parceiros não foi aplicado. Valor previsto na chegada: ${formatarMoeda(
          calculo.valorBruto
        )}.`
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

    if (
      erroValidacao
    ) {
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
         2. CRIAR PEDIDO
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
                  calculo
                    .valorFinal /
                  calculo
                    .totalVisitantes
                ).toFixed(2)
              )
              : calculo.valorFinal,

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
         4. CHECKOUT
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
            Reservas são liberadas somente após
            a aprovação do cadastro de parceiro.
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

      {/* ==================================
          FUNDO
      ================================== */}

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

      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 px-4 py-8">
        <div className="mx-auto max-w-6xl">

          {/* ==================================
              PARCEIRO
          ================================== */}

          <div className="mb-6 rounded-3xl border border-green-300/30 bg-green-950/90 p-6 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-5">

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

              <div className="rounded-2xl bg-white/10 px-6 py-4 text-center">
                <p className="text-sm text-white/70">
                  Seu nível atual
                </p>

                <p className="mt-1 text-2xl font-black">
                  {iconeCategoria(
                    categoriaAtual
                  )}{" "}
                  {categoriaAtual}
                </p>

                <p className="mt-1 text-sm font-bold text-green-300">
                  Até {infoNivel.desconto}% de benefício
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/60">
                  Cadastur
                </p>

                <p className="font-bold">
                  {
                    agencia.cadastur
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/60">
                  Pontos no mês
                </p>

                <p className="font-black text-lg">
                  {pontosMes}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/60">
                  Próximo nível
                </p>

                <p className="font-black">
                  {
                    progresso.nivelMaximo
                      ? "Nível máximo alcançado"
                      : progresso.proximoNivel
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-white/60">
                  Faltam
                </p>

                <p className="font-black">
                  {
                    progresso.nivelMaximo
                      ? "0 pontos"
                      : `${progresso.faltamPontos} pontos`
                  }
                </p>
              </div>
            </div>

            {!progresso.nivelMaximo && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span>
                    Progresso
                  </span>

                  <span>
                    {progresso.percentual}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all"
                    style={{
                      width:
                        `${progresso.percentual}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ==================================
              PROGRAMA DE PARCEIROS
          ================================== */}

          <section className="mb-6 rounded-3xl border border-white/20 bg-black/50 p-6 shadow-xl backdrop-blur">

            <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
              Programa de Parceiros Parque Mundo Novo
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Reservas para Parceiros
            </h1>

            <p className="mt-3 max-w-4xl text-slate-100">
              Quanto mais visitas efetivamente realizadas
              pelo parceiro, maior poderá ser o benefício
              conquistado para o período seguinte.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-4">

              <div className="rounded-2xl border border-amber-700/40 bg-amber-950/40 p-4">
                <p className="text-xl font-black">
                  🥉 Bronze
                </p>

                <p className="mt-2 font-black text-amber-200">
                  5% de desconto
                </p>

                <p className="mt-1 text-sm text-white/70">
                  0 a 49,5 pontos
                </p>
              </div>

              <div className="rounded-2xl border border-slate-300/40 bg-slate-700/40 p-4">
                <p className="text-xl font-black">
                  🥈 Prata
                </p>

                <p className="mt-2 font-black text-slate-100">
                  10% de desconto
                </p>

                <p className="mt-1 text-sm text-white/70">
                  50 a 99,5 pontos
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-300/40 bg-yellow-700/30 p-4">
                <p className="text-xl font-black">
                  🥇 Ouro
                </p>

                <p className="mt-2 font-black text-yellow-200">
                  15% de desconto
                </p>

                <p className="mt-1 text-sm text-white/70">
                  100 a 199,5 pontos
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200/50 bg-cyan-800/30 p-4">
                <p className="text-xl font-black">
                  💎 Diamante
                </p>

                <p className="mt-2 font-black text-cyan-100">
                  20% de desconto
                </p>

                <p className="mt-1 text-sm text-white/70">
                  200 pontos ou mais
                </p>
              </div>
            </div>

            {/* ==================================
                REGRAS PRINCIPAIS
            ================================== */}

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-5">

              <h2 className="text-xl font-black">
                📋 Regras importantes
              </h2>

              <div className="mt-4 grid gap-4 text-sm leading-relaxed md:grid-cols-2">

                <div>
                  <p className="font-black text-emerald-300">
                    ⭐ Como os pontos funcionam
                  </p>

                  <p className="mt-2">
                    Ingresso inteiro:{" "}
                    <strong>
                      1 ponto
                    </strong>
                    .
                  </p>

                  <p>
                    Idoso / meia entrada:{" "}
                    <strong>
                      0,5 ponto
                    </strong>
                    .
                  </p>

                  <p>
                    Criança com gratuidade:{" "}
                    <strong>
                      0 ponto
                    </strong>
                    , mas será contabilizada
                    no total de visitantes do grupo.
                  </p>
                </div>

                <div>
                  <p className="font-black text-emerald-300">
                    📅 Apuração do nível
                  </p>

                  <p className="mt-2">
                    O desempenho acumulado no período
                    será utilizado para definir o
                    benefício do período seguinte.
                  </p>

                  <p className="mt-2">
                    Reservas canceladas, reembolsadas,
                    não pagas ou visitas que não forem
                    efetivamente realizadas não devem
                    gerar pontuação definitiva.
                  </p>
                </div>

                <div>
                  <p className="font-black text-emerald-300">
                    💳 Pagamento antecipado
                  </p>

                  <p className="mt-2">
                    O benefício Bronze, Prata, Ouro ou
                    Diamante é aplicado somente nas
                    reservas elegíveis realizadas e
                    pagas antecipadamente pelo Portal
                    de Parceiros.
                  </p>

                  <p className="mt-2">
                    A reserva somente será considerada
                    paga após a confirmação do
                    pagamento.
                  </p>
                </div>

                <div>
                  <p className="font-black text-yellow-300">
                    🚌 Pagamento na chegada
                  </p>

                  <p className="mt-2">
                    A reserva poderá ser registrada
                    antecipadamente, porém{" "}
                    <strong>
                      não utilizará o desconto do
                      Programa de Parceiros
                    </strong>
                    .
                  </p>

                  <p className="mt-2">
                    O pagamento deverá ser realizado no
                    Parque antes da liberação da entrada.
                  </p>
                </div>

                <div>
                  <p className="font-black text-emerald-300">
                    👴 Tarifas reduzidas
                  </p>

                  <p className="mt-2">
                    Ingressos que já possuam tarifa
                    reduzida, como idoso/meia entrada,
                    não acumulam automaticamente o
                    desconto adicional do nível do
                    parceiro.
                  </p>
                </div>

                <div>
                  <p className="font-black text-emerald-300">
                    🏢 Relação da agência com o cliente
                  </p>

                  <p className="mt-2">
                    O desconto do programa é um benefício
                    comercial concedido ao parceiro na
                    compra elegível. A comercialização
                    do pacote ou serviço ao cliente final
                    é de responsabilidade do parceiro,
                    observadas as regras aplicáveis.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================
              FORMA DE PAGAMENTO
          ================================== */}

          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">

            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
              Forma de pagamento
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Como deseja pagar a reserva?
            </h2>

            <p className="mt-2 max-w-4xl text-sm text-slate-600">
              Leia atentamente. A forma de pagamento
              escolhida interfere diretamente na
              aplicação do benefício do seu nível.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              {/* PAGAMENTO ANTECIPADO */}

              <button
                type="button"
                onClick={() => {
                  setModalidadePagamento(
                    "antecipado"
                  );

                  setAceitouRegras(
                    false
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
                  Pague antecipadamente pelo checkout
                  e utilize o benefício correspondente
                  ao seu nível atual.
                </p>

                <div className="mt-4 rounded-xl bg-emerald-100 p-3">
                  <p className="text-xs font-black uppercase text-emerald-700">
                    Seu benefício atual
                  </p>

                  <p className="mt-1 text-2xl font-black text-emerald-900">
                    {iconeCategoria(
                      categoriaAtual
                    )}{" "}
                    {categoriaAtual}
                    {" • "}
                    {infoNivel.desconto}%
                  </p>
                </div>

                <p className="mt-3 text-xs font-black uppercase text-emerald-700">
                  ✓ Benefício elegível
                </p>
              </button>

              {/* PAGAMENTO NA CHEGADA */}

              <button
                type="button"
                onClick={() => {
                  setModalidadePagamento(
                    "chegada"
                  );

                  setAceitouRegras(
                    false
                  );

                  setMensagem("");
                  setTipoMensagem("");
                }}
                className={`rounded-2xl border-2 p-5 text-left transition ${modalidadePagamento ===
                    "chegada"
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-orange-300"
                  }`}
              >
                <p className="text-xl font-black text-orange-800">
                  🚌 Pagamento na chegada
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Registre o grupo agora e faça o
                  pagamento quando chegar ao Parque.
                </p>

                <div className="mt-4 rounded-xl bg-orange-100 p-3">
                  <p className="text-xs font-black uppercase text-orange-700">
                    Atenção
                  </p>

                  <p className="mt-1 font-black text-orange-900">
                    Sem desconto do Programa de Parceiros
                  </p>
                </div>

                <p className="mt-3 text-xs font-black uppercase text-orange-700">
                  ⚠ Pagamento pelo valor da reserva sem benefício do nível
                </p>
              </button>
            </div>

            {/* AVISO DINÂMICO */}

            {modalidadePagamento ===
              "antecipado" ? (
              <div className="mt-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 text-emerald-950">
                <p className="text-lg font-black">
                  ✅ Benefício do parceiro aplicado
                </p>

                <p className="mt-2 text-sm">
                  Você selecionou pagamento antecipado.
                  Nesta reserva, o benefício do nível{" "}
                  <strong>
                    {categoriaAtual}
                  </strong>{" "}
                  poderá ser aplicado aos ingressos
                  inteiros elegíveis.
                </p>

                <p className="mt-2 text-sm font-bold">
                  Benefício atual:{" "}
                  {infoNivel.desconto}%.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border-2 border-orange-300 bg-orange-50 p-5 text-orange-950">
                <p className="text-lg font-black">
                  ⚠️ Atenção antes de continuar
                </p>

                <p className="mt-2 text-sm">
                  Você selecionou{" "}
                  <strong>
                    pagamento na chegada
                  </strong>
                  .
                </p>

                <p className="mt-2 text-sm font-black">
                  O desconto Bronze, Prata, Ouro ou
                  Diamante NÃO será aplicado nesta
                  reserva.
                </p>

                <p className="mt-2 text-sm">
                  Para utilizar o benefício do seu
                  nível, selecione{" "}
                  <strong>
                    Pagamento antecipado
                  </strong>{" "}
                  antes de confirmar a reserva.
                </p>
              </div>
            )}
          </section>

          {/* ==================================
              FORMULÁRIO + RESUMO
          ================================== */}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* ==================================
                FORMULÁRIO
            ================================== */}

            <section className="rounded-3xl bg-white/95 p-6 text-slate-900 shadow-xl backdrop-blur lg:col-span-2">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <h2 className="text-2xl font-black">
                  Dados da visita
                </h2>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-black ${modalidadePagamento ===
                      "antecipado"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-orange-100 text-orange-800"
                    }`}
                >
                  {modalidadePagamento ===
                    "antecipado"
                    ? "PAGAMENTO ANTECIPADO"
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

                {/* HORA */}

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
                    Ingressos inteiros
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

                  <p className="mt-1 text-xs text-slate-500">
                    1 ponto por ingresso após a validação da visita.
                  </p>
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

                  <p className="mt-1 text-xs text-slate-500">
                    0,5 ponto por ingresso após a validação. Tarifa reduzida sem desconto adicional do nível.
                  </p>
                </label>

                {/* CRIANÇAS */}

                <label>
                  <span className="font-medium">
                    Crianças com gratuidade
                  </span>

                  <input
                    type="number"
                    min={
                      0
                    }
                    value={
                      criancas
                    }
                    onChange={(
                      e
                    ) =>
                      setCriancas(
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

                  <p className="mt-1 text-xs text-slate-500">
                    Contam como visitantes, mas não geram pontos.
                  </p>
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

                  <p className="mt-2 text-xs text-slate-500">
                    O Elevador Panorâmico não recebe desconto adicional do nível nesta modalidade do programa.
                  </p>
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

              {/* OBSERVAÇÕES */}

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

              {/* CPF */}

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
                      Necessário para identificar o responsável pelo pagamento antecipado.
                    </p>
                  </label>
                )}

              {/* ==================================
                  ACEITE OBRIGATÓRIO
              ================================== */}

              <div
                className={`mt-6 rounded-2xl border-2 p-5 ${aceitouRegras
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-orange-300 bg-orange-50"
                  }`}
              >
                <p className="text-lg font-black">
                  📋 Confirmação das regras
                </p>

                {modalidadePagamento ===
                  "antecipado" ? (
                  <p className="mt-2 text-sm leading-relaxed">
                    Confirmo que li as regras do Programa
                    de Parceiros, que estou realizando uma
                    reserva com{" "}
                    <strong>
                      pagamento antecipado
                    </strong>{" "}
                    e que o benefício do nível será aplicado
                    somente aos itens elegíveis indicados no
                    resumo.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed">
                    Confirmo que li as regras e estou ciente
                    de que escolhi{" "}
                    <strong>
                      pagamento na chegada
                    </strong>
                    , portanto esta reserva{" "}
                    <strong>
                      não receberá o desconto Bronze,
                      Prata, Ouro ou Diamante
                    </strong>
                    .
                  </p>
                )}

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-4 shadow-sm">

                  <input
                    type="checkbox"
                    checked={
                      aceitouRegras
                    }
                    onChange={(
                      e
                    ) =>
                      setAceitouRegras(
                        e.target.checked
                      )
                    }
                    className="mt-1 h-5 w-5"
                  />

                  <span className="text-sm font-bold">
                    Li, compreendi e concordo com as
                    regras da reserva e do Programa
                    de Parceiros Parque Mundo Novo.
                  </span>
                </label>
              </div>

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
                      }{" "}
                      pessoa(s)
                    </strong>
                  </p>

                  <p className="mt-1 text-sm">
                    Valor previsto na chegada:{" "}
                    <strong>
                      {formatarMoeda(
                        reservaCriada.valorFinal
                      )}
                    </strong>
                  </p>

                  <p className="mt-2 text-xs font-bold text-orange-700">
                    Reserva com pagamento na chegada:
                    benefício do nível não aplicado.
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

              <button
                type="button"
                onClick={
                  modalidadePagamento ===
                    "antecipado"
                    ? criarReservaAntecipada
                    : criarReservaChegada
                }
                disabled={
                  carregando ||
                  !aceitouRegras
                }
                className={`mt-6 w-full rounded-xl py-4 text-lg font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 ${modalidadePagamento ===
                    "antecipado"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-orange-600 hover:bg-orange-700"
                  }`}
              >
                {carregando
                  ? modalidadePagamento ===
                    "antecipado"
                    ? "Criando pagamento..."
                    : "Criando reserva..."
                  : !aceitouRegras
                    ? "Aceite as regras para continuar"
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
                Resumo da reserva
              </h2>

              {/* NÍVEL */}

              <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">

                <p className="text-xs font-bold uppercase text-white/60">
                  Seu nível
                </p>

                <p className="mt-1 text-2xl font-black">
                  {iconeCategoria(
                    categoriaAtual
                  )}{" "}
                  {categoriaAtual}
                </p>

                <p className="mt-1 text-sm text-white/80">
                  Benefício disponível:{" "}
                  <strong>
                    {infoNivel.desconto}%
                  </strong>
                </p>
              </div>

              {/* MODALIDADE */}

              {modalidadePagamento ===
                "antecipado" ? (
                <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">

                  <p className="text-xs font-black uppercase text-emerald-700">
                    Pagamento antecipado
                  </p>

                  <p className="mt-1 font-black text-emerald-900">
                    COM BENEFÍCIO DO PARCEIRO
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border-2 border-orange-300 bg-orange-50 p-4 text-center">

                  <p className="text-xs font-black uppercase text-orange-700">
                    Pagamento na chegada
                  </p>

                  <p className="mt-1 font-black text-orange-900">
                    SEM BENEFÍCIO DO PROGRAMA
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-3 text-sm">

                {/* QUANTIDADES */}

                <div className="flex justify-between">
                  <span>
                    Inteiros
                  </span>

                  <strong>
                    {
                      adultos
                    }
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span>
                    Idosos / meia
                  </span>

                  <strong>
                    {
                      idosos
                    }
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span>
                    Crianças gratuitas
                  </span>

                  <strong>
                    {
                      criancas
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

                {/* PONTOS */}

                <div className="rounded-xl bg-violet-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-violet-700">
                    Pontos potenciais desta visita
                  </p>

                  <p className="mt-1 text-3xl font-black text-violet-900">
                    {
                      calculo.pontosPotenciais
                    }
                  </p>

                  <p className="mt-1 text-xs text-violet-700">
                    Sujeitos à validação da visita.
                  </p>
                </div>

                <hr />

                {/* ADULTOS */}

                <div className="flex justify-between">
                  <span>
                    Ingressos inteiros
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
                        Desconto parceiro
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
                    Idosos / meia
                  </span>

                  <strong>
                    {formatarMoeda(
                      calculo.valorIdososFinal
                    )}
                  </strong>
                </div>

                {idosos >
                  0 && (
                    <p className="text-xs text-slate-500">
                      Tarifa reduzida sem desconto adicional do nível.
                    </p>
                  )}

                {/* CRIANÇAS */}

                {criancas >
                  0 && (
                    <div className="flex justify-between">
                      <span>
                        Crianças gratuitas
                      </span>

                      <strong>
                        R$ 0,00
                      </strong>
                    </div>
                  )}

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

                    <p className="text-xs text-slate-500">
                      Sem desconto adicional do nível.
                    </p>
                  </>
                )}

                <hr />

                {/* VALOR NORMAL */}

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

                <div
                  className={`flex justify-between ${modalidadePagamento ===
                      "antecipado"
                      ? "text-emerald-700"
                      : "text-slate-500"
                    }`}
                >
                  <span>
                    Desconto do programa
                  </span>

                  <strong>
                    {modalidadePagamento ===
                      "antecipado"
                      ? `- ${formatarMoeda(
                        calculo.valorDesconto
                      )}`
                      : "R$ 0,00"}
                  </strong>
                </div>

                {/* PERCENTUAL */}

                <div className="flex justify-between">
                  <span>
                    Percentual aplicado
                  </span>

                  <strong>
                    {
                      modalidadePagamento ===
                        "antecipado"
                        ? `${calculo.percentualDesconto}%`
                        : "0%"
                    }
                  </strong>
                </div>

                {/* TOTAL */}

                <div
                  className={`rounded-xl p-4 text-white ${modalidadePagamento ===
                      "antecipado"
                      ? "bg-emerald-700"
                      : "bg-orange-600"
                    }`}
                >
                  <p className="text-xs font-bold uppercase">
                    {modalidadePagamento ===
                      "antecipado"
                      ? "Valor a pagar agora"
                      : "Valor previsto na chegada"}
                  </p>

                  <p className="mt-1 text-3xl font-black">
                    {formatarMoeda(
                      modalidadePagamento ===
                        "antecipado"
                        ? calculo.valorFinal
                        : calculo.valorBruto
                    )}
                  </p>
                </div>
              </div>

              {/* AVISO FINAL */}

              {modalidadePagamento ===
                "antecipado" ? (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">

                  <p className="font-black">
                    ✅ Pagamento antecipado
                  </p>

                  <p className="mt-2">
                    Ao confirmar, será criado um pedido
                    vinculado a esta reserva e você
                    seguirá para o checkout.
                  </p>

                  <p className="mt-2">
                    A reserva somente será considerada
                    paga após a confirmação do pagamento.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border-2 border-orange-300 bg-orange-50 p-4 text-xs text-orange-900">

                  <p className="font-black">
                    ⚠️ Pagamento na chegada
                  </p>

                  <p className="mt-2">
                    O grupo deverá realizar o pagamento
                    no Parque antes da liberação da
                    entrada.
                  </p>

                  <p className="mt-2 font-black">
                    Esta modalidade não utiliza o
                    desconto Bronze, Prata, Ouro ou
                    Diamante.
                  </p>

                  <p className="mt-2">
                    Para utilizar o benefício do nível,
                    altere a modalidade para pagamento
                    antecipado antes de confirmar.
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