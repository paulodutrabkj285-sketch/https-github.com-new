import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { atualizarPedido } from "@/lib/pedidos";

export const runtime = "nodejs";

function somenteDigitos(valor: string) {
    return (valor || "").replace(/\D/g, "");
}

function criarHttpsAgent() {
    const certBase64 = process.env.SICREDI_CERT_BASE64;
    const keyBase64 = process.env.SICREDI_KEY_BASE64;

    if (!certBase64 || !keyBase64) {
        throw new Error("Certificado Sicredi não configurado.");
    }

    return new https.Agent({
        cert: Buffer.from(certBase64, "base64").toString("utf8"),
        key: Buffer.from(keyBase64, "base64").toString("utf8"),
        rejectUnauthorized: true,
    });
}

async function lerResposta(resposta: Response) {
    const texto = await resposta.text();

    try {
        return JSON.parse(texto);
    } catch {
        return {
            erroTexto: texto.slice(0, 500),
            status: resposta.status,
        };
    }
}

async function obterToken() {
    const baseUrl = process.env.SICREDI_BASE_URL;
    const clientId = process.env.SICREDI_CLIENT_ID;
    const clientSecret = process.env.SICREDI_CLIENT_SECRET;

    if (!baseUrl || !clientId || !clientSecret) {
        throw new Error("Credenciais Sicredi não configuradas.");
    }

    const agent = criarHttpsAgent();

    const resposta = await fetch(`${baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
            Authorization:
                "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: "cob.write cob.read pix.write pix.read webhook.write webhook.read",
        }).toString(),
        // @ts-expect-error agent é aceito no runtime Node
        agent,
        cache: "no-store",
    });

    const data = await lerResposta(resposta);

    if (!resposta.ok) {
        console.error("Erro ao obter token Sicredi:", data);
        throw new Error("Erro ao obter token Sicredi.");
    }

    return data.access_token as string;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { pedidoId, nome, email, cpf, produto, valorTotal, quantidade } = body;

        if (!pedidoId || !nome || !email || !cpf || !produto || !valorTotal) {
            return NextResponse.json(
                { ok: false, error: "Dados obrigatórios não enviados." },
                { status: 400 }
            );
        }

        const baseUrl = process.env.SICREDI_BASE_URL;
        const chavePix = process.env.SICREDI_PIX_KEY;

        if (!baseUrl || !chavePix) {
            return NextResponse.json(
                { ok: false, error: "Variáveis Sicredi não configuradas." },
                { status: 500 }
            );
        }

        const token = await obterToken();
        const agent = criarHttpsAgent();

        const txid = somenteDigitos(pedidoId).slice(0, 35) || pedidoId.slice(0, 35);

        const payload = {
            calendario: { expiracao: 3600 },
            devedor: {
                cpf: somenteDigitos(cpf),
                nome,
            },
            valor: {
                original: Number(valorTotal).toFixed(2),
            },
            chave: chavePix,
            solicitacaoPagador: `Ingresso ${produto}`,
            infoAdicionais: [
                { nome: "Pedido", valor: pedidoId },
                { nome: "Produto", valor: produto },
                { nome: "Quantidade", valor: String(quantidade || 1) },
            ],
        };

        const resposta = await fetch(`${baseUrl}/api/v2/cob/${txid}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            // @ts-expect-error agent é aceito no runtime Node
            agent,
            cache: "no-store",
        });

        const data = await lerResposta(resposta);

        if (!resposta.ok) {
            console.error("Erro Sicredi criar Pix:", data);

            return NextResponse.json(
                { ok: false, error: "Erro ao criar Pix no Sicredi.", details: data },
                { status: resposta.status }
            );
        }

        await atualizarPedido(pedidoId, {
            pagbankCheckoutId: "",
            pagbankReferenceId: "",
            pagbankPayUrl: "",
            pagbankStatus: "",
            statusPagamento: "pendente",
            sicrediTxid: data?.txid || txid,
            sicrediStatus: data?.status || "ATIVA",
            sicrediPixCopiaCola: data?.pixCopiaECola || "",
            sicrediLocation: data?.location || "",
            sicrediQrCode: data?.loc?.location || "",
        });

        return NextResponse.json({
            ok: true,
            txid: data?.txid || txid,
            status: data?.status || "",
            pixCopiaCola: data?.pixCopiaECola || "",
            location: data?.location || "",
            raw: data,
        });
    } catch (error) {
        console.error("Erro ao criar Pix Sicredi:", error);

        return NextResponse.json(
            { ok: false, error: "Erro ao processar Pix Sicredi." },
            { status: 500 }
        );
    }
}