import { NextRequest, NextResponse } from "next/server";
import https from "https";
import axios from "axios";
import { atualizarPedido, buscarPedidoPorId } from "@/lib/pedidos";

export const runtime = "nodejs";

function somenteDigitos(valor: any) {
    return String(valor || "").replace(/\D/g, "");
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

    const response = await axios.post(
        `${baseUrl}/oauth/token`,
        new URLSearchParams({
            grant_type: "client_credentials",
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
}

function cpfValido(cpf: string) {
    const numeros = somenteDigitos(cpf);

    if (numeros.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numeros)) return false;

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(numeros[i]) * (10 - i);
    }

    let digito1 = 11 - (soma % 11);
    if (digito1 >= 10) digito1 = 0;

    if (digito1 !== Number(numeros[9])) return false;

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(numeros[i]) * (11 - i);
    }

    let digito2 = 11 - (soma % 11);
    if (digito2 >= 10) digito2 = 0;

    return digito2 === Number(numeros[10]);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log("BODY RECEBIDO:", JSON.stringify(body, null, 2));

        const { pedidoId, nome, cpf, produto, valorTotal, quantidade } = body;

        if (!pedidoId || !produto || !valorTotal) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Dados obrigatórios não enviados.",
                },
                { status: 400 }
            );
        }

        const pedidoSalvo: any = await buscarPedidoPorId(pedidoId).catch(() => null);

        const nomeFinal = String(nome || pedidoSalvo?.nome || "Cliente").trim();
        const cpfFinal = somenteDigitos(cpf || pedidoSalvo?.cpf || "");
        const valorFinal = Number(valorTotal || pedidoSalvo?.valorTotal || 0).toFixed(2);

        console.log("CPF BODY:", cpf);
        console.log("CPF PEDIDO:", pedidoSalvo?.cpf);
        console.log("CPF FINAL:", cpfFinal);
        console.log("CPF TAMANHO:", cpfFinal.length);
        console.log("CPF VALIDO:", cpfValido(cpfFinal));

        if (!cpfValido(cpfFinal)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "CPF inválido ou não encontrado no pedido.",
                    cpfRecebido: cpf,
                    cpfPedido: pedidoSalvo?.cpf || null,
                    cpfFinal,
                    tamanho: cpfFinal.length,
                },
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
            solicitacaoPagador: produto,
        };

        console.log("PAYLOAD SICREDI:", JSON.stringify(payload, null, 2));

        const response = await axios.post(`${baseUrl}/api/v2/cob`, payload, {
            httpsAgent: agent,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        const data = response.data;

        console.log("RESPOSTA SICREDI:", JSON.stringify(data, null, 2));

        const pixCopiaCola =
            data?.pixCopiaECola ||
            data?.brcode ||
            data?.pixCopiaCola ||
            data?.emv ||
            "";

        await atualizarPedido(pedidoId, {
            statusPagamento: "pendente",
            sicrediTxid: data?.txid || "",
            sicrediStatus: data?.status || "ATIVA",
            sicrediPixCopiaCola: pixCopiaCola,
            sicrediLocation: data?.location || "",
        });

        return NextResponse.json({
            ok: true,
            txid: data?.txid || "",
            status: data?.status || "",
            pixCopiaCola,
            location: data?.location || "",
            raw: data,
        });
    } catch (error: any) {
        console.error(
            "ERRO SICREDI FINAL:",
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
}