import { NextResponse } from "next/server";
import https from "https";

export const runtime = "nodejs";

function limparCpf(cpf: unknown) {
    return String(cpf || "")
        .replace(/\D/g, "")
        .padStart(11, "0");
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log("BODY RECEBIDO:", body);

        const nomeFinal = String(body.nome || "Cliente Parque Mundo Novo").trim();
        const cpfFinal = limparCpf(body.cpf);
        const valorFinal = Number(body.valorTotal || body.valor || 0).toFixed(2);

        console.log("CPF RECEBIDO:", body.cpf);
        console.log("CPF LIMPO:", cpfFinal);
        console.log("CPF TAMANHO:", cpfFinal.length);

        if (cpfFinal.length !== 11) {
            return NextResponse.json(
                {
                    erro: "CPF inválido ou não informado",
                    cpfRecebido: body.cpf,
                    cpfFinal,
                    tamanho: cpfFinal.length,
                },
                { status: 400 }
            );
        }

        if (Number(valorFinal) <= 0) {
            return NextResponse.json(
                { erro: "Valor inválido", valorRecebido: body.valorTotal },
                { status: 400 }
            );
        }

        const baseUrl = process.env.SICREDI_BASE_URL!;
        const clientId = process.env.SICREDI_CLIENT_ID!;
        const clientSecret = process.env.SICREDI_CLIENT_SECRET!;
        const certBase64 = process.env.SICREDI_CERT_BASE64!;
        const keyBase64 = process.env.SICREDI_KEY_BASE64!;
        const chavePix = process.env.SICREDI_PIX_KEY!;

        const cert = Buffer.from(certBase64, "base64").toString("utf8");
        const key = Buffer.from(keyBase64, "base64").toString("utf8");

        const agent = new https.Agent({
            cert,
            key,
            rejectUnauthorized: true,
        });

        const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
            method: "POST",
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials&scope=cob.write cob.read pix.write pix.read",
            // @ts-ignore
            agent,
        });

        const tokenData = await tokenResponse.json();

        console.log("TOKEN STATUS:", tokenResponse.status);

        if (!tokenResponse.ok) {
            console.error("ERRO TOKEN SICREDI:", tokenData);

            return NextResponse.json(
                {
                    erro: "Erro ao autenticar Sicredi",
                    detalhe: tokenData,
                },
                { status: tokenResponse.status }
            );
        }

        const payload = {
            calendario: {
                expiracao: 3600,
            },
            devedor: {
                cpf: cpfFinal,
                nome: nomeFinal,
            },
            valor: {
                original: valorFinal,
            },
            chave: chavePix,
            solicitacaoPagador: "Ingresso Parque Mundo Novo",
        };

        console.log("PAYLOAD SICREDI:", JSON.stringify(payload, null, 2));

        const pixResponse = await fetch(`${baseUrl}/api/v2/cob`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            // @ts-ignore
            agent,
        });

        const pixData = await pixResponse.json();

        console.log("PIX STATUS:", pixResponse.status);
        console.log("PIX RESPOSTA:", JSON.stringify(pixData, null, 2));

        if (!pixResponse.ok) {
            return NextResponse.json(
                {
                    erro: "Erro Sicredi criar Pix",
                    detalhe: pixData,
                    payloadEnviado: payload,
                },
                { status: pixResponse.status }
            );
        }

        return NextResponse.json({
            sucesso: true,
            pedidoId: body.pedidoId || "",
            txid: pixData.txid,
            status: pixData.status,
            pixCopiaECola: pixData.pixCopiaECola || pixData.brcode || "",
            qrcode: pixData.pixCopiaECola || pixData.brcode || "",
            resposta: pixData,
        });
    } catch (error: any) {
        console.error("ERRO INTERNO SICREDI:", error);

        return NextResponse.json(
            {
                erro: "Erro interno ao criar Pix Sicredi",
                detalhe: error?.message || String(error),
            },
            { status: 500 }
        );
    }
}