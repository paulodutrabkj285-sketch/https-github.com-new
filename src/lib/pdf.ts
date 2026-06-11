import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

type GerarPdfIngressoParams = {
    nome: string;
    produto: string;
    quantidade: number;
    codigoIngresso: string;
    pedidoId: string;
    dataVisita?: string;
};

export async function gerarPdfIngresso({
    nome,
    produto,
    quantidade,
    codigoIngresso,
    pedidoId,
    dataVisita,
}: GerarPdfIngressoParams): Promise<Buffer> {
    const qrConteudo = JSON.stringify({
        codigo: codigoIngresso,
        pedidoId,
    });

    const qrDataUrl = await QRCode.toDataURL(qrConteudo, {
        width: 300,
        margin: 2,
    });

    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBytes = Buffer.from(qrBase64, "base64");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const qrImage = await pdfDoc.embedPng(qrBytes);

    page.drawText("PARQUE MUNDO NOVO", {
        x: 95,
        y: 770,
        size: 28,
        font: fontBold,
        color: rgb(0.02, 0.31, 0.23),
    });

    page.drawText("INGRESSO OFICIAL", {
        x: 190,
        y: 735,
        size: 18,
        font: fontBold,
        color: rgb(0.08, 0.4, 0.2),
    });

    page.drawRectangle({
        x: 70,
        y: 610,
        width: 455,
        height: 90,
        color: rgb(0.86, 0.99, 0.91),
        borderColor: rgb(0.52, 0.94, 0.67),
        borderWidth: 1,
    });

    page.drawText("Codigo do ingresso:", {
        x: 205,
        y: 665,
        size: 14,
        font: fontBold,
        color: rgb(0.08, 0.33, 0.18),
    });

    page.drawText(codigoIngresso, {
        x: 205,
        y: 630,
        size: 30,
        font: fontBold,
        color: rgb(0.08, 0.4, 0.2),
    });

    page.drawImage(qrImage, {
        x: 185,
        y: 355,
        width: 225,
        height: 225,
    });

    let y = 300;

    const linha = (texto: string) => {
        page.drawText(texto, {
            x: 70,
            y,
            size: 14,
            font,
            color: rgb(0.07, 0.09, 0.15),
        });
        y -= 28;
    };

    linha(`Nome: ${nome}`);
    linha(`Produto: ${produto}`);
    linha(`Quantidade: ${quantidade}`);

    if (dataVisita) {
        linha(`Data da visita: ${dataVisita}`);
    }

    linha(`Pedido: ${pedidoId}`);

    page.drawText(
        "Apresente este PDF na entrada do Parque Mundo Novo. O QR Code sera validado na portaria. Este ingresso podera ser utilizado apenas uma vez.",
        {
            x: 70,
            y: 110,
            size: 11,
            font,
            color: rgb(0.35, 0.35, 0.35),
            maxWidth: 455,
            lineHeight: 16,
        }
    );

    const pdfBytes = await pdfDoc.save();

    return Buffer.from(pdfBytes);
}