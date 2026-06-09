import nodemailer from "nodemailer";
import QRCode from "qrcode";

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

  const qrConteudo = JSON.stringify({
    codigo: codigoIngresso,
    pedidoId,
  });

  const qrCodeBase64 = await QRCode.toDataURL(qrConteudo, {
    width: 260,
    margin: 2,
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
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f4f8f4; padding: 24px;">
      <div style="background: #064e3b; color: white; padding: 24px; border-radius: 18px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Parque Mundo Novo</h1>
        <p style="margin-top: 8px;">Ingresso confirmado</p>
      </div>

      <div style="background: white; padding: 24px; border-radius: 18px; margin-top: 20px;">
        <h2 style="color: #166534; margin-top: 0;">Olá, ${nome}!</h2>

        <p>Seu pagamento foi confirmado e seu ingresso está liberado.</p>

        <div style="background: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 16px; border-radius: 14px; margin: 20px 0; text-align: center;">
          <strong>Código do ingresso:</strong><br />
          <span style="font-size: 26px; font-weight: bold;">${codigoIngresso}</span>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <p style="font-weight: bold; color: #166534;">QR Code do ingresso</p>
          <img src="${qrCodeBase64}" alt="QR Code do ingresso" style="width: 260px; max-width: 100%; border: 1px solid #ddd; border-radius: 16px; padding: 10px; background: white;" />
        </div>

        <p><strong>Produto:</strong> ${produto}</p>
        <p><strong>Quantidade:</strong> ${quantidade}</p>
        ${dataVisita ? `<p><strong>Data da visita:</strong> ${dataVisita}</p>` : ""}
        <p><strong>Pedido:</strong> ${pedidoId}</p>

        <p style="margin-top: 24px;">
          Apresente este QR Code na entrada do Parque Mundo Novo.
        </p>

        <p style="font-size: 13px; color: #666;">
          Este ingresso só poderá ser utilizado uma vez.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Parque Mundo Novo" <${user}>`,
    to: para,
    subject: assunto,
    html,
  });

  console.log("E-mail de ingresso enviado para:", para);
}