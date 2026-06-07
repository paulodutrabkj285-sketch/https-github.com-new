import { NextRequest, NextResponse } from "next/server";
import https from "https";
import axios from "axios";
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

async function obterToken() {
    const baseUrl = process.env.SICREDI_BASE_URL;
    const clientId = process.env.SICREDI_CLIENT_ID;
    const clientSecret = process.env.SICREDI_CLIENT_SECRET;

    if (!baseUrl || !clientId || !clientSecret) {
        throw new Error("Credenciais Sicredi não configuradas.");
    }

    const agent = criarHttpsAgent();

    try {
        const response = await axios.post(
            `${baseUrl}/oauth/token`,
            new URLSearchParams({
                grant_type: "client_credentials",
                scope: "cob.write cob.read pix.write pix.read webhook.write webhook.read",
            }).toString(),
            {
                httpsAgent: agent,
                headers: {
                    Authorization:
                        "Basic " +
                        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        return response.data.access_token as string;
    } catch (error: any) {
        console.error(
            "Erro ao obter token Sicredi:",
            JSON.stringify(error?.response?.data || error?.message, null, 2)
        );

        throw new Error("Erro ao obter token Sicredi.");
    }
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
            throw new Error("Variáveis Sicredi não configuradas.");
        }

        const token = await obterToken();
        const agent = criarHttpsAgent();

        const txid =
            somenteDigitos(pedidoId).slice(0, 35) ||
            pedidoId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 35);

        const payload = {
            calendario: {
                expiracao: 3600,
            },
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
                {
                    nome: "Pedido",
                    valor: pedidoId,
                },
                {
                    nome: "Quantidade",
                    valor: String(quantidade || 1),
                },
            ],
        };

        try {
            const response = await axios.put(`${baseUrl}/api/v2/cob/${txid}`, payload, {
                httpsAgent: agent,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const data = response.data;

            await atualizarPedido(pedidoId, {
                statusPagamento: "pendente",
                sicrediTxid: data?.txid || txid,
                sicrediStatus: data?.status || "ATIVA",
                sicrediPixCopiaCola: data?.pixCopiaECola || "",
                sicrediLocation: data?.location || "",
            });

            return NextResponse.json({
                ok: true,
                txid: data?.txid || txid,
                status: data?.status || "",
                pixCopiaCola: data?.pixCopiaECola || "",
                location: data?.location || "",
                raw: data,
            });
        } catch (error: any) {
            console.error(
                "Erro Sicredi criar Pix:",
                JSON.stringify(error?.response?.data || error?.message, null, 2)
            );

            return NextResponse.json(
                {
                    ok: false,
                    error: "Erro ao criar Pix Sicredi.",
                    details: error?.response?.data || error?.message,
                },
                { status: error?.response?.status || 500 }
            );
        }
    } catch (error) {
        console.error("Erro ao criar Pix Sicredi:", error);

        return NextResponse.json(
            { ok: false, error: "Erro ao processar Pix Sicredi." },
            { status: 500 }
        );
    }
}