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

function criarTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    user,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
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

export async function enviarIngressoPorEmail({
  para,
  nome,
  produto,
  quantidade,
  codigoIngresso,
  pedidoId,
  dataVisita,
}: EnviarIngressoEmailParams) {
  const config = criarTransporter();

  if (!config) {
    console.log("E-mail não configurado. Envio ignorado.");
    return;
  }

  const dataVisitaFormatada = formatarData(dataVisita);

  const pdfBuffer = await gerarPdfIngresso({
    nome,
    produto,
    quantidade,
    codigoIngresso,
    pedidoId,
    dataVisita,
  });

  const assunto = `Seu ingresso Parque Mundo Novo - ${codigoIngresso}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #f4f8f4; padding: 24px;">
      <div style="background: #064e3b; color: white; padding: 24px; border-radius: 18px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Parque Mundo Novo</h1>
        <p style="margin-top: 8px;">Ingresso confirmado</p>
      </div>

      <div style="background: white; padding: 24px; border-radius: 18px; margin-top: 20px;">
        <h2 style="color: #166534; margin-top: 0;">Olá, ${nome}!</h2>

        <p>Seu pagamento foi confirmado e seu ingresso está liberado.</p>

        <div style="background: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 16px; border-radius: 14px; margin: 20px 0; text-align: center;">
          <strong>Código do ingresso:</strong><br />
          <span style="font-size: 30px; font-weight: bold;">${codigoIngresso}</span>
        </div>

        <p><strong>Produto:</strong> ${produto}</p>
        <p><strong>Quantidade:</strong> ${quantidade}</p>
        ${dataVisitaFormatada
      ? `<p><strong>Data da visita:</strong> ${dataVisitaFormatada}</p>`
      : ""
    }

        <p style="margin-top: 24px;">
          Seu ingresso em PDF está anexado neste e-mail.
        </p>

        <div style="background: #fff7ed; border: 1px solid #fdba74; color: #7c2d12; padding: 18px; border-radius: 14px; margin-top: 24px;">
          <h3 style="margin-top: 0;">Regras de utilização do ingresso</h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>O Parque Mundo Novo funciona diariamente das 08h00 às 18h00.</li>
            <li>O ingresso é válido para a data selecionada no momento da compra.</li>
            <li>O visitante poderá antecipar sua visita em até 24 horas antes da data originalmente adquirida.</li>
            <li>O ingresso também poderá ser utilizado em até 30 dias após a data inicialmente selecionada.</li>
            <li>Cada ingresso possui código único e poderá ser utilizado apenas uma vez.</li>
            <li>Após validado na portaria, o ingresso não poderá ser reutilizado.</li>
          </ul>
        </div>

        <div style="background: #eff6ff; border: 1px solid #93c5fd; color: #1e3a8a; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">O que está incluso no ingresso do Parque</h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>Acesso às áreas abertas para visitação.</li>
            <li>Mirantes.</li>
            <li>Cachoeiras abertas ao público.</li>
            <li>Trilhas liberadas para visitação.</li>
            <li>Áreas de contemplação e lazer.</li>
          </ul>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fca5a5; color: #7f1d1d; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">O que NÃO está incluso no ingresso de entrada</h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>Camping.</li>
            <li>Elevador Panorâmico.</li>
            <li>Tirolesa.</li>
            <li>Alimentação e bebidas.</li>
            <li>Hospedagem.</li>
            <li>Produtos e serviços adicionais oferecidos pelo parque.</li>
          </ul>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">Informações importantes</h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>Algumas atrações possuem cobrança separada.</li>
            <li>O parque poderá suspender determinadas atividades por questões climáticas ou de segurança.</li>
            <li>Ao adquirir o ingresso, o visitante declara estar ciente destas condições de utilização.</li>
          </ul>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #86efac; color: #14532d; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">📍 Localização do Parque</h3>

          <p><strong>Parque Mundo Novo</strong></p>

          <p>Funcionamento diário das <strong>08h00 às 18h00</strong>.</p>

          <p>Utilize o botão abaixo para abrir a rota diretamente no Google Maps.</p>

          <a
            href="${linkMaps}"
            target="_blank"
            style="display:inline-block; background:#166534; color:white; padding:12px 18px; border-radius:12px; text-decoration:none; font-weight:bold; margin-top:10px;"
          >
            📍 Como chegar pelo Google Maps
          </a>
        </div>

        <p style="font-size: 13px; color: #666; margin-top: 24px;">
          Apresente o PDF com QR Code na entrada do Parque Mundo Novo. Este ingresso só poderá ser utilizado uma vez.
        </p>
      </div>
    </div>
  `;

  await config.transporter.sendMail({
    from: `"Parque Mundo Novo" <${config.user}>`,
    to: para,
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

  console.log("E-mail de ingresso com PDF enviado para:", para);
}

export async function enviarLembreteCompraPendente({
  para,
  nome,
  produto,
  pedidoId,
  valorTotal,
}: EnviarLembreteParams) {
  const config = criarTransporter();

  if (!config) {
    console.log("E-mail não configurado. Lembrete ignorado.");
    return;
  }

  const link = `https://parque-mundo-novo-ingressos.vercel.app/checkout/pagamento?pedidoId=${pedidoId}`;

  const valorFormatado = Number(valorTotal || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background:#f4f8f4; padding:24px;">
      <div style="background:#064e3b; color:white; padding:24px; border-radius:18px; text-align:center;">
        <h1 style="margin:0;">Parque Mundo Novo</h1>
        <p style="margin-top:8px;">Você iniciou uma compra conosco</p>
      </div>

      <div style="background:white; padding:24px; border-radius:18px; margin-top:20px;">
        <h2 style="color:#166534;">Olá, ${nome}!</h2>

        <p>
          Percebemos que você iniciou a compra do seu ingresso para o
          <strong> Parque Mundo Novo, em Urubici</strong>, mas ainda não finalizou o pagamento.
        </p>

        <div style="background:#ecfdf5; border:1px solid #86efac; color:#14532d; padding:16px; border-radius:14px; margin:20px 0;">
          <p><strong>Produto:</strong> ${produto}</p>
          <p><strong>Valor:</strong> ${valorFormatado}</p>
          <p><strong>Pedido:</strong> ${pedidoId}</p>
        </div>

        <a href="${link}" target="_blank" style="display:inline-block; background:#166534; color:white; padding:14px 20px; border-radius:12px; text-decoration:none; font-weight:bold; margin-top:10px;">
          Continuar compra
        </a>

        <p style="margin-top:24px; font-size:13px; color:#666;">
          Parque Mundo Novo - Funcionamento todos os dias das 08h às 18h.
        </p>
      </div>
    </div>
  `;

  await config.transporter.sendMail({
    from: `"Parque Mundo Novo" <${config.user}>`,
    to: para,
    subject: "Continue sua compra - Parque Mundo Novo",
    html,
  });

  console.log("Lembrete de compra pendente enviado para:", para);
}