import PDFDocument from "pdfkit";
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
        codigoIngresso,
        pedidoId,
    });

    const qrDataUrl = await QRCode.toDataURL(qrConteudo, {
        width: 300,
        margin: 2,
    });

    const qrBase64 = qrDataUrl.replace(
        /^data:image\/png;base64,/,
        ""
    );

    const qrBuffer = Buffer.from(qrBase64, "base64");

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margin: 50,
        });

        const buffers: Buffer[] = [];

        doc.on("data", (data) => buffers.push(data));

        doc.on("end", () => {
            resolve(Buffer.concat(buffers));
        });

        doc.on("error", reject);

        // Cabeçalho
        doc
            .fillColor("#064e3b")
            .fontSize(28)
            .text("PARQUE MUNDO NOVO", {
                align: "center",
            });

        doc.moveDown();

        doc
            .fontSize(18)
            .fillColor("#166534")
            .text("INGRESSO OFICIAL", {
                align: "center",
            });

        doc.moveDown(2);

        // Código
        doc
            .fontSize(14)
            .fillColor("black")
            .text("Código do ingresso:", {
                align: "center",
            });

        doc
            .fontSize(26)
            .fillColor("#166534")
            .text(codigoIngresso, {
                align: "center",
            });

        doc.moveDown();

        // QR Code
        doc.image(qrBuffer, 170, 180, {
            width: 250,
            height: 250,
        });

        doc.moveDown(12);

        // Dados
        doc
            .fontSize(14)
            .fillColor("black")
            .text(`Nome: ${nome}`);

        doc.text(`Produto: ${produto}`);

        doc.text(`Quantidade: ${quantidade}`);

        if (dataVisita) {
            doc.text(`Data da visita: ${dataVisita}`);
        }

        doc.text(`Pedido: ${pedidoId}`);

        doc.moveDown(2);

        doc
            .fillColor("#666666")
            .fontSize(12)
            .text(
                "Apresente este PDF na entrada do Parque Mundo Novo. O QR Code será validado na portaria. Este ingresso poderá ser utilizado apenas uma vez.",
                {
                    align: "justify",
                }
            );

        doc.end();
    });
}