import { NextResponse } from "next/server";
import https from "https";
import axios from "axios";

export const runtime = "nodejs";

function criarHttpsAgent() {
    return new https.Agent({
        cert: Buffer.from(process.env.SICREDI_CERT_BASE64 || "", "base64").toString(
            "utf8"
        ),
        key: Buffer.from(process.env.SICREDI_KEY_BASE64 || "", "base64").toString(
            "utf8"
        ),
        rejectUnauthorized: true,
    });
}

function normalizarChavePix(chave: string) {
    const chaveLimpa = String(chave || "").trim();

    if (chaveLimpa.includes("@")) {
        return chaveLimpa.toLowerCase();
    }

    return chaveLimpa.replace(/\s/g, "");
}

async function obterToken() {
    const baseUrl = process.env.SICREDI_BASE_URL!;
    const clientId = process.env.SICREDI_CLIENT_ID!;
    const clientSecret = process.env.SICREDI_CLIENT_SECRET!;

    const response = await axios.post(
        `${baseUrl}/oauth/token`,
        new URLSearchParams({
            grant_type: "client_credentials",
        }).toString(),
        {
            httpsAgent: criarHttpsAgent(),
            headers: {
                Authorization:
                    "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data.access_token;
}

export async function GET() {
    try {
        const baseUrl = process.env.SICREDI_BASE_URL!;
        const chavePix = normalizarChavePix(process.env.SICREDI_PIX_KEY || "");
        const token = await obterToken();

        const webhookUrl =
            "https://parque-mundo-novo-ingressos.vercel.app/api/sicredi/webhook";

        const response = await axios.put(
            `${baseUrl}/api/v2/webhook/${encodeURIComponent(chavePix)}`,
            {
                webhookUrl,
            },
            {
                httpsAgent: criarHttpsAgent(),
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return NextResponse.json({
            ok: true,
            mensagem: "Webhook Sicredi configurado.",
            chavePix,
            webhookUrl,
            resposta: response.data,
        });
    } catch (error: any) {
        console.error(
            "ERRO CONFIGURAR WEBHOOK:",
            JSON.stringify(error?.response?.data || error?.message, null, 2)
        );

        return NextResponse.json(
            {
                ok: false,
                error: "Erro ao configurar webhook Sicredi.",
                details: error?.response?.data || error?.message,
            },
            { status: error?.response?.status || 500 }
        );
    }
}