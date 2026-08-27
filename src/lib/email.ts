import nodemailer from "nodemailer";

import { gerarPdfIngresso } from "@/lib/pdf";

type EnviarIngressoEmailParams = {
  para: string;

  nome: string;

  produto: string;

  quantidade: number;

  codigoIngresso: string;

  pedidoId: string;

  dataVisita?: string;

  // WhatsApp
  telefone?: string;
  whatsappPdfUrl?: string;
};

type EnviarLembreteParams = {
  para: string;

  nome: string;

  produto: string;

  pedidoId: string;

  valorTotal: number;
};

const linkMaps =
  "https://maps.google.com/maps?vet=10CAAQoqAOahcKEwiA3azy-YeVAxUAAAAAHQAAAAAQBg..i&pvq=CgwvZy8xcHYyZl9kaGIiFwoRcGFycXVlIG11bmRvIG5vdm8QAhgD&lqi=ChlwYXJxdWUgbXVuZG8gbm92byB1cnViaWNpSOrj_qbolYCACFopEAAQARACGAAYARgCGAMiGXBhcnF1ZSBtdW5kbyBub3ZvIHVydWJpY2mSAQpmYWlyZ3JvdW5k&fvr=1&cs=0&um=1&ie=UTF-8&fb=1&gl=br&sa=X&ftid=0x952046a2f62d7365:0x34bd4695f0794ad2";

const telefoneParque = "(49) 99129-9991";

const emailIngressos = "ingressosparquemundonovo@gmail.com";

type EnviarIngressoWhatsAppParams = {
  telefone: string;
  nome: string;
  dataVisita?: string;
  codigoIngresso: string;
  pdfUrl: string;
};

function normalizarTelefoneWhatsApp(telefone: string) {
  const somenteNumeros = String(telefone || "").replace(/\D/g, "");

  if (!somenteNumeros) {
    throw new Error("Telefone do WhatsApp não informado.");
  }

  // Se vier com 10 ou 11 dígitos, assume Brasil e adiciona DDI 55.
  if (somenteNumeros.length === 10 || somenteNumeros.length === 11) {
    return `55${somenteNumeros}`;
  }

  // Se já vier com DDI 55, mantém.
  if (
    (somenteNumeros.length === 12 || somenteNumeros.length === 13) &&
    somenteNumeros.startsWith("55")
  ) {
    return somenteNumeros;
  }

  throw new Error(
    `Telefone inválido para WhatsApp: ${telefone}. Informe DDD + número.`
  );
}

async function enviarIngressoPorWhatsApp({
  telefone,
  nome,
  dataVisita,
  codigoIngresso,
  pdfUrl,
}: EnviarIngressoWhatsAppParams) {
  const token = process.env.RESPOND_IO_TOKEN?.trim();

  if (!token) {
    console.warn(
      "RESPOND_IO_TOKEN não configurado. Envio por WhatsApp ignorado."
    );

    return {
      enviado: false,
      motivo: "token_ausente",
    };
  }

  if (!pdfUrl || !/^https:\/\/.+/i.test(pdfUrl)) {
    console.warn(
      "URL HTTPS do PDF não informada. Envio por WhatsApp ignorado."
    );

    return {
      enviado: false,
      motivo: "pdf_url_ausente",
    };
  }

  const telefoneNormalizado =
    normalizarTelefoneWhatsApp(telefone);

  const dataFormatada =
    formatarData(dataVisita) || "Não informada";

  const payloadBaseRaw =
    process.env.RESPOND_IO_TEMPLATE_PAYLOAD?.trim();

  if (!payloadBaseRaw) {
    console.warn(
      "RESPOND_IO_TEMPLATE_PAYLOAD não configurado. " +
      "Envio por WhatsApp ignorado."
    );

    return {
      enviado: false,
      motivo: "template_payload_ausente",
    };
  }

  let payload: any;

  try {
    payload = JSON.parse(payloadBaseRaw);
  } catch {
    throw new Error(
      "RESPOND_IO_TEMPLATE_PAYLOAD não contém um JSON válido."
    );
  }

  if (!payload.message) {
    throw new Error(
      "Payload do respond.io inválido: propriedade message não encontrada."
    );
  }

  if (payload.message.type !== "whatsapp_template") {
    throw new Error(
      `Payload do respond.io inválido. Tipo recebido: ${payload.message.type || "não informado"
      }`
    );
  }

  const template = payload.message.template;

  if (!template) {
    throw new Error(
      "Payload do respond.io inválido: template não encontrado."
    );
  }

  if (template.name !== "ingresso_parque_mundo_novo") {
    console.warn(
      "Nome inesperado do template do WhatsApp:",
      template.name
    );
  }

  const components = Array.isArray(template.components)
    ? template.components
    : [];

  /*
   * HEADER DO TEMPLATE
   *
   * Aqui colocamos o PDF real do ingresso.
   */
  const header = components.find(
    (component: any) =>
      String(component?.type || "").toLowerCase() === "header"
  );

  if (!header) {
    throw new Error(
      "Template do WhatsApp não possui componente HEADER."
    );
  }

  if (
    !Array.isArray(header.parameters) ||
    header.parameters.length === 0
  ) {
    throw new Error(
      "HEADER do template não possui parâmetro para o PDF."
    );
  }

  const parametroDocumento =
    header.parameters.find(
      (parameter: any) =>
        String(parameter?.type || "").toLowerCase() === "document"
    ) || header.parameters[0];

  parametroDocumento.type = "document";

  parametroDocumento.document = {
    ...(parametroDocumento.document || {}),
    link: pdfUrl,
    caption:
      parametroDocumento.document?.caption ||
      `Ingresso ${codigoIngresso} - Parque Mundo Novo`,
  };

  /*
   * BODY DO TEMPLATE
   *
   * {{1}} = Nome
   * {{2}} = Data da visita
   * {{3}} = Código do ingresso
   */
  const body = components.find(
    (component: any) =>
      String(component?.type || "").toLowerCase() === "body"
  );

  if (!body) {
    throw new Error(
      "Template do WhatsApp não possui componente BODY."
    );
  }

  body.parameters = [
    {
      type: "text",
      text: nome?.trim() || "Cliente",
    },
    {
      type: "text",
      text: dataFormatada,
    },
    {
      type: "text",
      text: codigoIngresso,
    },
  ];

  /*
   * O payload copiado pelo respond.io também contém o texto
   * com {{1}}, {{2}} e {{3}}.
   *
   * Mantemos esse texto e substituímos os placeholders.
   */
  if (typeof body.text === "string") {
    body.text = body.text
      .replaceAll("{{1}}", nome?.trim() || "Cliente")
      .replaceAll("{{2}}", dataFormatada)
      .replaceAll("{{3}}", codigoIngresso);
  }

  if (!payload.channelId) {
    console.warn(
      "channelId não encontrado no payload do respond.io."
    );
  }

  const endpoint =
    `https://api.respond.io/v2/contact/phone:${encodeURIComponent(
      telefoneNormalizado
    )}/message`;

  console.log("ENVIANDO INGRESSO PELO WHATSAPP", {
    telefone: telefoneNormalizado,
    codigoIngresso,
    dataVisita: dataFormatada,
    template: template.name,
    channelId: payload.channelId || null,
    pdfUrl,
  });

  const resposta = await fetch(endpoint, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },

    body: JSON.stringify(payload),
  });

  const respostaTexto = await resposta.text();

  let respostaJson: unknown = null;

  if (respostaTexto) {
    try {
      respostaJson = JSON.parse(respostaTexto);
    } catch {
      respostaJson = respostaTexto;
    }
  }

  if (!resposta.ok) {
    console.error(
      "ERRO RESPOND.IO AO ENVIAR INGRESSO",
      {
        telefone: telefoneNormalizado,
        codigoIngresso,
        status: resposta.status,
        resposta: respostaTexto,
      }
    );

    throw new Error(
      `Falha ao enviar ingresso pelo WhatsApp/respond.io. ` +
      `HTTP ${resposta.status}: ${respostaTexto || "sem resposta"
      }`
    );
  }

  console.log(
    "WHATSAPP DE INGRESSO ENVIADO",
    {
      telefone: telefoneNormalizado,
      codigoIngresso,
      status: resposta.status,
      resposta: respostaJson,
    }
  );

  return {
    enviado: true,
    telefone: telefoneNormalizado,
    resposta: respostaJson,
  };
}

function criarTransporter() {
  const host = process.env.EMAIL_HOST?.trim();

  const port = Number(process.env.EMAIL_PORT || 587);

  const user = process.env.EMAIL_USER?.trim();

  const pass = process.env.EMAIL_PASS;

  const variaveisAusentes: string[] = [];

  if (!host) variaveisAusentes.push("EMAIL_HOST");

  if (!user) variaveisAusentes.push("EMAIL_USER");

  if (!pass) variaveisAusentes.push("EMAIL_PASS");

  if (variaveisAusentes.length > 0) {
    throw new Error(
      `Configuração de e-mail incompleta. Variáveis ausentes: ${variaveisAusentes.join(
        ", "
      )}.`
    );
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(
      "A variável EMAIL_PORT possui um valor inválido."
    );
  }

  const transporter = nodemailer.createTransport({
    host,

    port,

    secure: port === 465,

    auth: {
      user,

      pass,
    },

    connectionTimeout: 30000,

    greetingTimeout: 30000,

    socketTimeout: 45000,
  });

  return {
    user,

    transporter,
  };
}

function formatarData(data?: string) {
  if (!data) return "";

  const partes = data.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return data;
}

function escaparHtml(valor: unknown) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validarDestinatario(email: string) {
  const emailLimpo = String(email || "").trim();

  if (!emailLimpo) {
    throw new Error(
      "O endereço de e-mail do destinatário não foi informado."
    );
  }

  const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!formatoEmail.test(emailLimpo)) {
    throw new Error(
      `O endereço de e-mail informado é inválido: ${emailLimpo}`
    );
  }

  return emailLimpo;
}

export async function enviarIngressoPorEmail({
  para,

  nome,

  produto,

  quantidade,

  codigoIngresso,

  pedidoId,

  dataVisita,

  telefone,

  whatsappPdfUrl,
}: EnviarIngressoEmailParams) {
  const emailDestino = validarDestinatario(para);

  const config = criarTransporter();

  const nomeSeguro = escaparHtml(nome || "Cliente");

  const produtoSeguro = escaparHtml(
    produto || "Ingresso Parque Mundo Novo"
  );

  const codigoSeguro = escaparHtml(codigoIngresso);

  const pedidoSeguro = escaparHtml(pedidoId);

  const quantidadeValida = Number(quantidade || 1);

  const dataVisitaFormatada =
    formatarData(dataVisita);

  const pdfBuffer = await gerarPdfIngresso({
    nome,

    produto,

    quantidade: quantidadeValida,

    codigoIngresso,

    pedidoId,

    dataVisita,
  });

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error(
      "O PDF do ingresso foi gerado vazio e não pôde ser anexado."
    );
  }

  const assunto =
    `Seu ingresso Parque Mundo Novo - ${codigoIngresso}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; background: #f4f8f4; padding: 24px;">
      <div style="background: #064e3b; color: white; padding: 26px; border-radius: 18px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">
          Parque Mundo Novo
        </h1>

        <p style="margin-top: 8px; font-size: 16px;">
          Ingresso confirmado
        </p>
      </div>

      <div style="background: white; padding: 24px; border-radius: 18px; margin-top: 20px;">
        <h2 style="color: #166534; margin-top: 0;">
          Olá, ${nomeSeguro}!
        </h2>

        <p>
          Seu pagamento foi confirmado e seu ingresso está liberado.
        </p>

        <div style="background: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 16px; border-radius: 14px; margin: 20px 0; text-align: center;">
          <strong>Código do ingresso:</strong>

          <br />

          <span style="font-size: 30px; font-weight: bold;">
            ${codigoSeguro}
          </span>
        </div>

        <p>
          <strong>Produto:</strong>
          ${produtoSeguro}
        </p>

        <p>
          <strong>Quantidade:</strong>
          ${quantidadeValida}
        </p>

        <p>
          <strong>Pedido:</strong>
          ${pedidoSeguro}
        </p>

        ${dataVisitaFormatada
      ? `<p><strong>Data informada:</strong> ${escaparHtml(
        dataVisitaFormatada
      )}</p>`
      : ""
    }

        <p style="margin-top: 24px;">
          Seu ingresso em PDF está anexado neste e-mail.
          Apresente o QR Code impresso ou diretamente pelo
          celular na entrada do Parque Mundo Novo.
        </p>

        <div style="background:#eff6ff; border:1px solid #93c5fd; color:#1e3a8a; padding:18px; border-radius:14px; margin-top:20px;">
          <h3 style="margin-top:0;">
            ℹ️ Informações importantes
          </h3>

          <ul style="padding-left:20px; line-height:1.8; margin-bottom:0;">
            <li>
              Apresente o QR Code na entrada do parque.
            </li>

            <li>
              Documento oficial com foto poderá ser solicitado na portaria.
            </li>

            <li>
              Caso tenha adquirido Meia Entrada,
              o documento comprobatório deverá estar
              no mesmo nome do comprador informado neste ingresso.
            </li>

            <li>
              O Elevador Panorâmico possui ingresso próprio
              e é vendido separadamente.
            </li>

            <li>
              O ingresso de entrada do parque não dá direito
              ao acesso ao Elevador Panorâmico.
            </li>
          </ul>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 14px; margin-top: 24px;">
          <h3 style="margin-top: 0;">
            📌 Informações principais
          </h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>
              Funcionamento todos os dias,
              das <strong>08h00 às 17h30</strong>.
            </li>

            <li>
              O ingresso é válido por
              <strong>6 meses</strong>
              a partir da data da compra.
            </li>

            <li>
              Cada ingresso possui código único
              e poderá ser utilizado apenas uma vez.
            </li>

            <li>
              Após validado na portaria,
              o ingresso não poderá ser reutilizado.
            </li>

            <li>
              O Elevador Panorâmico é uma atração
              opcional vendida separadamente.
            </li>

            <li>
              O ingresso do parque não dá direito
              ao acesso ao Elevador Panorâmico.
            </li>

            <li>
              A meia entrada é pessoal e intransferível.
            </li>

            <li>
              O documento que comprova o benefício deve
              estar no mesmo nome do comprador informado
              neste ingresso.
            </li>

            <li>
              A apresentação do documento original
              é obrigatória na portaria.
            </li>
          </ul>
        </div>

        <div style="background: #eff6ff; border: 1px solid #93c5fd; color: #1e3a8a; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            🎫 O que está incluso no ingresso do Parque
          </h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>Acesso às áreas abertas para visitação.</li>
            <li>Mirantes.</li>
            <li>Cachoeiras abertas ao público.</li>
            <li>Trilhas liberadas para visitação.</li>
            <li>Áreas de contemplação e lazer.</li>
            <li>Área Kids, quando disponível.</li>
          </ul>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fca5a5; color: #7f1d1d; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            ⚠️ Atrações e serviços cobrados separadamente
          </h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>Elevador Panorâmico.</li>
            <li>Tirolesa.</li>
            <li>Tirolesa Infantil.</li>
            <li>Salto de Pêndulo.</li>
            <li>Alimentação e bebidas.</li>
            <li>Hospedagem.</li>

            <li>
              Produtos e serviços adicionais oferecidos
              por parceiros dentro do parque.
            </li>
          </ul>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            🏕️ Informações sobre o Camping
          </h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>
              O camping pertence ao Parque Mundo Novo
              e possui voucher próprio com cobrança por diária.
            </li>

            <li>
              1ª diária:
              <strong> R$ 100,00 por pessoa</strong>.
            </li>

            <li>
              A partir da 2ª diária:
              <strong> R$ 80,00 por pessoa/noite</strong>.
            </li>

            <li>
              Crianças até
              <strong>10 anos completos</strong>
              não pagam, desde que acompanhadas por responsável.
            </li>

            <li>
              Após a confirmação do pagamento,
              será emitido um voucher de check-in
              com data, dados da reserva e QR Code.
            </li>

            <li>
              Caso deseje permanecer por mais dias,
              a extensão da hospedagem deverá ser solicitada
              diretamente na recepção do parque,
              com pagamento das diárias adicionais.
            </li>

            <li>
              O camping aceita motorhomes,
              conforme disponibilidade e orientação da equipe local.
            </li>
          </ul>
        </div>
                <div style="background: #fff7ed; border: 1px solid #fdba74; color: #7c2d12; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            🔄 Política de compra e cancelamento
          </h3>

          <p style="line-height: 1.7;">
            Conforme o artigo 49 do Código de Defesa do Consumidor,
            você pode solicitar o cancelamento da compra em até
            <strong> 7 dias corridos</strong>
            após a data do pagamento,
            desde que o ingresso ainda não tenha sido utilizado.
          </p>

          <p style="line-height: 1.7; margin-bottom: 0;">
            Nesse caso, o valor pago será devolvido integralmente
            pelo mesmo meio de pagamento utilizado na compra.
            Após o prazo de 7 dias ou após a utilização do ingresso,
            não será possível solicitar reembolso.
          </p>
        </div>

        <div style="background: #fffbeb; border: 1px solid #facc15; color: #713f12; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            🚗 Estacionamento e cuidado com pertences
          </h3>

          <p style="line-height: 1.7;">
            O Parque Mundo Novo possui estacionamento próprio
            para maior comodidade dos visitantes.
          </p>

          <ul style="padding-left: 20px; line-height: 1.7;">
            <li>Mantenha o veículo sempre trancado.</li>

            <li>
              Não deixe objetos de valor à vista.
            </li>

            <li>
              Confira portas, vidros e porta-malas
              antes de iniciar a visita.
            </li>

            <li>
              Certifique-se de que o veículo esteja
              devidamente fechado.
            </li>
          </ul>

          <p style="line-height: 1.7; font-weight: bold; margin-bottom: 0;">
            O Parque Mundo Novo não se responsabiliza
            por objetos esquecidos, perdidos, furtados
            ou danificados no interior dos veículos,
            no estacionamento ou nas áreas de circulação do parque.
          </p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            🎢 Serviços terceirizados
          </h3>

          <p style="line-height: 1.7;">
            Alguns serviços disponíveis dentro do Parque Mundo Novo
            são operados por empresas parceiras
            e possuem administração própria.
          </p>

          <ul style="padding-left: 20px; line-height: 1.7;">
            <li>Tirolesa.</li>
            <li>Tirolesa Infantil.</li>
            <li>Salto de Pêndulo.</li>
            <li>Restaurante.</li>
            <li>Bistrô.</li>
            <li>Café El Torrador.</li>
          </ul>

          <p style="line-height: 1.7;">
            Esses serviços são contratados diretamente no local,
            com seus respectivos operadores.
            O Parque Mundo Novo disponibiliza apenas o espaço físico
            e não se responsabiliza pela operação,
            horários, valores, manutenção,
            disponibilidade, cancelamentos ou alterações
            desses serviços.
          </p>

          <p style="line-height: 1.7; margin-bottom: 0;">
            Por segurança, atividades terceirizadas
            podem ser suspensas em caso de chuva,
            ventos fortes, neblina intensa
            ou outras condições climáticas adversas.
          </p>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            🍽️ Estrutura disponível no parque
          </h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>Cachoeira Mundo Novo.</li>
            <li>Cascata do Avencal.</li>
            <li>Elevador Panorâmico.</li>
            <li>Mirantes.</li>
            <li>Réplica da Pedra Furada.</li>
            <li>Camping.</li>
            <li>Área para Motorhome.</li>
            <li>Área Kids.</li>
            <li>Pet Friendly.</li>
            <li>Restaurante.</li>
            <li>Bistrô.</li>
            <li>Café El Torrador.</li>
            <li>Estacionamento próprio.</li>
          </ul>
        </div>

        <div style="background: #064e3b; color: white; padding: 20px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            🌿 Preserve a natureza
          </h3>

          <p style="line-height: 1.7;">
            A natureza é o maior patrimônio do Parque Mundo Novo.
            Pedimos a colaboração de todos para manter
            este ambiente limpo, seguro e preservado.
          </p>

          <ul style="padding-left: 20px; line-height: 1.7;">
            <li>Respeite a fauna e a flora.</li>

            <li>
              Utilize as lixeiras ou leve seu lixo
              até um local adequado.
            </li>

            <li>
              Permaneça nas trilhas e áreas sinalizadas.
            </li>

            <li>
              Preserve rios, cachoeiras e nascentes.
            </li>

            <li>
              Não alimente nem capture animais silvestres.
            </li>

            <li>
              Não faça fogo em locais não autorizados.
            </li>
          </ul>

          <p style="line-height: 1.7; font-weight: bold; margin-bottom: 0;">
            Da natureza, leve apenas fotografias,
            lembranças e momentos inesquecíveis.
            Deixe apenas suas pegadas e o respeito
            por este lugar tão especial.
          </p>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">
            📍 Localização e atendimento
          </h3>

          <p>
            <strong>Parque Mundo Novo</strong>
          </p>

          <p>
            <strong>Endereço:</strong>
            SC-110 KM 34 - Urubici/SC
          </p>

          <p>
            <strong>Funcionamento:</strong>
            todos os dias, das 08h00 às 17h30
          </p>

          <p>
            <strong>WhatsApp:</strong>
            ${telefoneParque}
          </p>

          <p>
            <strong>E-mail para ingressos:</strong>
            ${emailIngressos}
          </p>

          <a
            href="${linkMaps}"
            target="_blank"
            style="display:inline-block; background:#166534; color:white; padding:12px 18px; border-radius:12px; text-decoration:none; font-weight:bold; margin-top:10px;"
          >
            📍 Como chegar pelo Google Maps
          </a>
        </div>

        <p style="font-size: 13px; color: #666; margin-top: 24px;">
          Apresente o PDF com QR Code na entrada do Parque Mundo Novo.
          Este ingresso só poderá ser utilizado uma vez.
        </p>
      </div>
    </div>
  `;

  const resultadoEnvio =
    await config.transporter.sendMail({
      from: `"Parque Mundo Novo" <${config.user}>`,

      // O ingresso continua indo para o e-mail cadastrado pelo cliente.
      to: emailDestino,

      subject: assunto,

      html,

      attachments: [
        {
          filename: `Ingresso-${codigoIngresso}.pdf`,

          content: pdfBuffer,

          contentType: "application/pdf",
        },
      ],
    });

  const aceitos =
    Array.isArray(resultadoEnvio.accepted)
      ? resultadoEnvio.accepted.map(String)
      : [];

  const rejeitados =
    Array.isArray(resultadoEnvio.rejected)
      ? resultadoEnvio.rejected.map(String)
      : [];

  if (aceitos.length === 0) {
    throw new Error(
      `O servidor de e-mail não aceitou o destinatário ${emailDestino}. Rejeitados: ${rejeitados.join(", ") || "não informado"
      }.`
    );
  }

  console.log(
    "E-MAIL DE INGRESSO ACEITO PELO SERVIDOR",
    {
      para: emailDestino,

      messageId:
        resultadoEnvio.messageId || null,

      accepted: aceitos,

      rejected: rejeitados,

      response:
        resultadoEnvio.response || null,

      pdfBytes: pdfBuffer.length,
    }
  );

  /*
   * Depois que o e-mail for enviado com sucesso,
   * tentamos enviar também o ingresso pelo WhatsApp.
   *
   * IMPORTANTE:
   * se o WhatsApp falhar, a compra NÃO será invalidada
   * e o e-mail NÃO será reenviado.
   */
  let whatsapp: unknown = null;

  if (telefone && whatsappPdfUrl) {
    try {
      whatsapp = await enviarIngressoPorWhatsApp({
        telefone,

        nome,

        dataVisita,

        codigoIngresso,

        pdfUrl: whatsappPdfUrl,
      });
    } catch (erroWhatsApp) {
      console.error(
        "ERRO AO ENVIAR INGRESSO PELO WHATSAPP",
        {
          pedidoId,

          codigoIngresso,

          telefone,

          erro:
            erroWhatsApp instanceof Error
              ? erroWhatsApp.message
              : String(erroWhatsApp),
        }
      );

      whatsapp = {
        enviado: false,

        erro:
          erroWhatsApp instanceof Error
            ? erroWhatsApp.message
            : String(erroWhatsApp),
      };
    }
  } else {
    console.log(
      "WHATSAPP DE INGRESSO NÃO DISPARADO",
      {
        pedidoId,

        temTelefone: Boolean(telefone),

        temPdfUrl: Boolean(whatsappPdfUrl),
      }
    );
  }

  return {
    enviado: true,

    messageId:
      resultadoEnvio.messageId || null,

    accepted: aceitos,

    rejected: rejeitados,

    whatsapp,
  };
}

export async function enviarLembreteCompraPendente({
  para,

  nome,

  produto,

  pedidoId,

  valorTotal,
}: EnviarLembreteParams) {
  const emailDestino =
    validarDestinatario(para);

  const config =
    criarTransporter();

  const nomeSeguro =
    escaparHtml(nome || "Cliente");

  const produtoSeguro =
    escaparHtml(
      produto ||
      "Ingresso Parque Mundo Novo"
    );

  const pedidoSeguro =
    escaparHtml(pedidoId);

  const link =
    `https://www.parquemundonovooficial.com.br/checkout/pagamento?pedidoId=${encodeURIComponent(
      pedidoId
    )}`;

  const valorFormatado =
    Number(valorTotal || 0).toLocaleString(
      "pt-BR",
      {
        style: "currency",

        currency: "BRL",
      }
    );

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background:#f4f8f4; padding:24px;">
      <div style="background:#064e3b; color:white; padding:24px; border-radius:18px; text-align:center;">
        <h1 style="margin:0;">
          Parque Mundo Novo
        </h1>

        <p style="margin-top:8px;">
          Você iniciou uma compra conosco
        </p>
      </div>

      <div style="background:white; padding:24px; border-radius:18px; margin-top:20px;">
        <h2 style="color:#166534;">
          Olá, ${nomeSeguro}!
        </h2>

        <p>
          Percebemos que você iniciou a compra
          do seu ingresso para o
          <strong> Parque Mundo Novo, em Urubici</strong>,
          mas ainda não finalizou o pagamento.
        </p>

        <div style="background:#ecfdf5; border:1px solid #86efac; color:#14532d; padding:16px; border-radius:14px; margin:20px 0;">
          <p>
            <strong>Produto:</strong>
            ${produtoSeguro}
          </p>

          <p>
            <strong>Valor:</strong>
            ${valorFormatado}
          </p>

          <p>
            <strong>Pedido:</strong>
            ${pedidoSeguro}
          </p>
        </div>

        <a
          href="${link}"
          target="_blank"
          style="display:inline-block; background:#166534; color:white; padding:14px 20px; border-radius:12px; text-decoration:none; font-weight:bold; margin-top:10px;"
        >
          Continuar compra
        </a>

        <div style="background:#f0fdf4; border:1px solid #86efac; color:#14532d; padding:16px; border-radius:14px; margin-top:22px;">
          <h3 style="margin-top:0;">
            Informações rápidas
          </h3>

          <ul style="padding-left:20px; line-height:1.7; margin-bottom:0;">
            <li>
              Funcionamento todos os dias,
              das <strong>08h às 17h30</strong>.
            </li>

            <li>
              Ingresso digital com QR Code.
            </li>

            <li>
              Validade de 6 meses após a compra.
            </li>

            <li>
              Dúvidas: WhatsApp ${telefoneParque}.
            </li>

            <li>
              E-mail: ${emailIngressos}.
            </li>
          </ul>
        </div>

        <p style="margin-top:24px; font-size:13px; color:#666;">
          Parque Mundo Novo -
          Funcionamento todos os dias
          das 08h às 17h30.
        </p>
      </div>
    </div>
  `;

  const resultadoEnvio =
    await config.transporter.sendMail({
      from:
        `"Parque Mundo Novo" <${config.user}>`,

      // O lembrete também vai para o e-mail do cliente.
      to: emailDestino,

      subject:
        "Continue sua compra - Parque Mundo Novo",

      html,
    });

  const aceitos =
    Array.isArray(resultadoEnvio.accepted)
      ? resultadoEnvio.accepted.map(String)
      : [];

  const rejeitados =
    Array.isArray(resultadoEnvio.rejected)
      ? resultadoEnvio.rejected.map(String)
      : [];

  if (aceitos.length === 0) {
    throw new Error(
      `O servidor de e-mail não aceitou o destinatário ${emailDestino}. Rejeitados: ${rejeitados.join(", ") ||
      "não informado"
      }.`
    );
  }

  console.log(
    "LEMBRETE DE COMPRA ACEITO PELO SERVIDOR",
    {
      para: emailDestino,

      messageId:
        resultadoEnvio.messageId || null,

      accepted: aceitos,

      rejected: rejeitados,

      response:
        resultadoEnvio.response || null,
    }
  );

  return {
    enviado: true,

    messageId:
      resultadoEnvio.messageId || null,

    accepted: aceitos,

    rejected: rejeitados,
  };
}
/* =========================================================
   WHATSAPP - ENVIO DE INGRESSO VIA RESPOND.IO
========================================================= */

type EnviarIngressoWhatsappParams = {
  telefone: string;
  nome: string;
  dataVisita: string;
  codigoIngresso: string;
  pdfUrl: string;
  pedidoId: string;
};

export async function enviarIngressoPorWhatsapp({
  telefone,
  nome,
  dataVisita,
  codigoIngresso,
  pdfUrl,
  pedidoId,
}: EnviarIngressoWhatsappParams) {

  /* =====================================================
     VARIÁVEIS DE AMBIENTE
  ===================================================== */

  const token =
    String(
      process.env.RESPOND_IO_TOKEN ||
      ""
    ).trim();

  const payloadBaseRaw =
    String(
      process.env.RESPOND_IO_TEMPLATE_PAYLOAD ||
      ""
    ).trim();

  if (!token) {
    throw new Error(
      "RESPOND_IO_TOKEN não configurado."
    );
  }

  if (!payloadBaseRaw) {
    throw new Error(
      "RESPOND_IO_TEMPLATE_PAYLOAD não configurado."
    );
  }

  /* =====================================================
     VALIDAR DADOS
  ===================================================== */

  const telefoneLimpo =
    String(
      telefone || ""
    ).replace(
      /\D/g,
      ""
    );

  if (!telefoneLimpo) {
    throw new Error(
      "Telefone não informado para envio pelo WhatsApp."
    );
  }

  if (!pdfUrl) {
    throw new Error(
      "URL do PDF do ingresso não informada."
    );
  }

  /* =====================================================
     LER PAYLOAD SALVO NA VERCEL
  ===================================================== */

  let payloadBase: any;

  try {
    payloadBase =
      JSON.parse(
        payloadBaseRaw
      );
  } catch (error) {
    console.error(
      "ERRO AO LER RESPOND_IO_TEMPLATE_PAYLOAD:",
      error
    );

    throw new Error(
      "RESPOND_IO_TEMPLATE_PAYLOAD contém JSON inválido."
    );
  }

  /* =====================================================
     CLONAR PAYLOAD
  ===================================================== */

  const payload =
    JSON.parse(
      JSON.stringify(
        payloadBase
      )
    );

  /* =====================================================
     GARANTIR ESTRUTURA
  ===================================================== */

  if (
    !payload?.message ||
    payload.message.type !==
    "whatsapp_template"
  ) {
    throw new Error(
      "Payload do respond.io não possui message.type whatsapp_template."
    );
  }

  if (
    !payload?.message?.template
  ) {
    throw new Error(
      "Payload do respond.io não possui template."
    );
  }

  const components =
    payload.message.template
      .components;

  if (
    !Array.isArray(
      components
    )
  ) {
    throw new Error(
      "Template do respond.io não possui components."
    );
  }

  /* =====================================================
     HEADER - PDF
  ===================================================== */

  const header =
    components.find(
      (component: any) =>
        component?.type ===
        "header"
    );

  if (!header) {
    throw new Error(
      "Header do template não encontrado."
    );
  }

  if (
    !Array.isArray(
      header.parameters
    ) ||
    !header.parameters[0]
  ) {
    throw new Error(
      "Parâmetro do documento no header não encontrado."
    );
  }

  header.parameters[0] = {
    type:
      "document",

    document: {
      link:
        pdfUrl,

      caption:
        `Ingresso ${codigoIngresso}`,
    },
  };

  /* =====================================================
     BODY
  ===================================================== */

  const body =
    components.find(
      (component: any) =>
        component?.type ===
        "body"
    );

  if (!body) {
    throw new Error(
      "Body do template não encontrado."
    );
  }

  /*
   * Template aprovado:
   *
   * {{1}} = nome
   * {{2}} = data da visita
   * {{3}} = código do ingresso
   */

  body.parameters = [
    {
      type:
        "text",

      text:
        String(
          nome ||
          "Cliente"
        ),
    },
    {
      type:
        "text",

      text:
        String(
          dataVisita ||
          ""
        ),
    },
    {
      type:
        "text",

      text:
        String(
          codigoIngresso ||
          ""
        ),
    },
  ];

  /* =====================================================
     LOG DO PAYLOAD
  ===================================================== */

  console.log(
    "RESPOND.IO - ENVIANDO TEMPLATE:",
    {
      pedidoId,

      telefone:
        telefoneLimpo,

      nome,

      dataVisita,

      codigoIngresso,

      pdfUrl,

      template:
        payload.message
          ?.template
          ?.name,

      channelId:
        payload.channelId,
    }
  );

  /* =====================================================
     ENDPOINT RESPOND.IO
  ===================================================== */

  const endpoint =
    `https://api.respond.io/v2/contact/phone:${encodeURIComponent(
      telefoneLimpo
    )}/message`;

  /* =====================================================
     ENVIAR
  ===================================================== */

  const response =
    await fetch(
      endpoint,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  /* =====================================================
     LER RESPOSTA
  ===================================================== */

  const responseText =
    await response.text();

  let responseData: any =
    null;

  if (responseText) {
    try {
      responseData =
        JSON.parse(
          responseText
        );
    } catch {
      responseData =
        responseText;
    }
  }

  /* =====================================================
     ERRO RESPOND.IO
  ===================================================== */

  if (!response.ok) {

    console.error(
      "RESPOND.IO - ERRO:",
      {
        status:
          response.status,

        statusText:
          response.statusText,

        pedidoId,

        telefone:
          telefoneLimpo,

        resposta:
          responseData,
      }
    );

    const detalhe =
      typeof responseData ===
        "string"
        ? responseData
        : JSON.stringify(
          responseData
        );

    throw new Error(
      `Erro respond.io (${response.status}): ${detalhe}`
    );
  }

  /* =====================================================
     SUCESSO
  ===================================================== */

  console.log(
    "RESPOND.IO - SUCESSO:",
    {
      pedidoId,

      telefone:
        telefoneLimpo,

      codigoIngresso,

      resposta:
        responseData,
    }
  );

  return {
    ok:
      true,

    pedidoId,

    telefone:
      telefoneLimpo,

    codigoIngresso,

    response:
      responseData,
  };
}