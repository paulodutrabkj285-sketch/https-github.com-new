import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { criarClientePix } from "@/lib/sicredi-pix";

export const runtime = "nodejs";
const webhookUrl = "https://www.parquemundonovooficial.com.br/api/sicredi/webhook";

async function executar(req: NextRequest, alterar: boolean) {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.includes("[SENSITIVE]")) {
        return NextResponse.json({ ok: false, error: "CRON_SECRET não configurado." }, { status: 500 });
    }
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    const chave = String(process.env.SICREDI_PIX_KEY || "").trim().replace(/\s/g, "");
    if (!chave || chave.includes("[SENSITIVE]")) {
        return NextResponse.json({ ok: false, error: "Chave Pix não configurada." }, { status: 500 });
    }
    try {
        const { baseUrl, config } = await criarClientePix();
        const url = `${baseUrl}/api/v2/webhook/${encodeURIComponent(chave.includes("@") ? chave.toLowerCase() : chave)}`;
        // GET consulta somente. O cadastro exige POST administrativo explícito.
        const response = alterar
            ? await axios.put(url, { webhookUrl }, config)
            : await axios.get(url, config);
        return NextResponse.json({ ok: true, webhookUrlEsperada: webhookUrl,
            callbackEsperado: `${webhookUrl}/pix`, cadastro: response.data });
    } catch (error) {
        console.error("ERRO CADASTRO WEBHOOK SICREDI:", axios.isAxiosError(error) ? error.response?.status : "erro de configuração");
        return NextResponse.json({ ok: false, error: "Não foi possível consultar ou configurar o webhook Sicredi." }, { status: 502 });
    }
}

export async function GET(req: NextRequest) { return executar(req, false); }
export async function POST(req: NextRequest) { return executar(req, true); }
