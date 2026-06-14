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

export async function enviarIngressoPorEmail({
  para,
  nome,
  produto,
  quantidade,
  codigoIngresso,
  pedidoId,
  dataVisita,
}: EnviarIngressoEmailParams) {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.log("E-mail não configurado. Envio ignorado.");
    return;
  }

  const pdfBuffer = await gerarPdfIngresso({
    nome,
    produto,
    quantidade,
    codigoIngresso,
    pedidoId,
    dataVisita,
  });

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
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
        ${dataVisita ? `<p><strong>Data da visita:</strong> ${dataVisita}</p>` : ""}
        <p><strong>Pedido:</strong> ${pedidoId}</p>

        <p style="margin-top: 24px;">
          Seu ingresso em PDF está anexado neste e-mail.
        </p>

        <div style="background: #fff7ed; border: 1px solid #fdba74; color: #7c2d12; padding: 18px; border-radius: 14px; margin-top: 24px;">
          <h3 style="margin-top: 0;">Regras de utilização do ingresso</h3>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>O ingresso é válido somente para a data informada na compra.</li>
            <li>O ingresso deverá ser apresentado na entrada do Parque Mundo Novo.</li>
            <li>O QR Code do ingresso poderá ser utilizado apenas uma única vez.</li>
            <li>Após validado na portaria, o ingresso não poderá ser reutilizado.</li>
            <li>Em caso de não comparecimento na data da visita, a remarcação ou conversão em crédito dependerá das regras internas definidas pelo Parque Mundo Novo.</li>
            <li>Guarde este e-mail e o PDF anexo até o momento da entrada.</li>
          </ul>
        </div>

        <div style="background: #eff6ff; border: 1px solid #93c5fd; color: #1e3a8a; padding: 18px; border-radius: 14px; margin-top: 20px;">
          <h3 style="margin-top: 0;">Importante sobre produtos e serviços</h3>

          <p style="line-height: 1.6; margin-bottom: 10px;">
            Alguns produtos, atrações e serviços do Parque Mundo Novo podem ser vendidos separadamente e não estão inclusos no ingresso de entrada do parque.
          </p>

          <ul style="padding-left: 20px; line-height: 1.7; margin-bottom: 0;">
            <li>Elevador Panorâmico</li>
            <li>Camping</li>
            <li>Produtos, alimentos e bebidas consumidos no local</li>
            <li>Serviços extras ou atrações vendidas separadamente</li>
          </ul>
        </div>

        <p style="font-size: 13px; color: #666; margin-top: 24px;">
          Apresente o PDF com QR Code na entrada do Parque Mundo Novo. Este ingresso só poderá ser utilizado uma vez.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Parque Mundo Novo" <${user}>`,
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