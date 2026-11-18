import https from "https";
import { createHash } from "crypto";
import axios from "axios";
import QRCode from "qrcode";
import { validarCobrancaPix } from "@/lib/sicredi-pix";

export const EFI_TEMPORARY_ENABLED = true;
export const EFI_TEMPORARY_END_AT = "2026-11-18T20:00:00-03:00";

const inicio = Date.parse("2026-11-18T00:00:00-03:00");
const fim = Date.parse(EFI_TEMPORARY_END_AT);
const baseUrl = "https://pix.api.efipay.com.br";
const timeout = 5000;

export function efiDisponivelParaCriacao(agora = Date.now()) {
    return EFI_TEMPORARY_ENABLED && agora >= inicio && agora < fim;
}

async function autenticar(httpsAgent: https.Agent, signal: AbortSignal) {
    const { EFI_CLIENT_ID, EFI_CLIENT_SECRET } = process.env;
    if (!EFI_CLIENT_ID?.trim() || !EFI_CLIENT_SECRET?.trim()) {
        throw new Error("Credenciais Efí ausentes.");
    }
    const token = await axios.post(`${baseUrl}/oauth/token`, { grant_type: "client_credentials" }, {
        httpsAgent, signal, timeout, maxRedirects: 0,
        auth: { username: EFI_CLIENT_ID, password: EFI_CLIENT_SECRET },
    });
    if (typeof token.data?.access_token !== "string" || !token.data.access_token.trim()) {
        throw new Error("Token Efí inválido.");
    }
    return {
        httpsAgent, signal, timeout, maxRedirects: 0,
        headers: { Authorization: `Bearer ${token.data.access_token}` },
    };
}

async function comClienteEfi<T>(
    prazo: number,
    executar: (config: Awaited<ReturnType<typeof autenticar>>) => Promise<T>,
) {
    const certificado = process.env.EFI_CERTIFICATE_P12_BASE64?.trim();
    if (!certificado) throw new Error("Certificado Efí ausente.");
    const agent = new https.Agent({ pfx: Buffer.from(certificado, "base64"), rejectUnauthorized: true });
    try {
        return await executar(await autenticar(agent, AbortSignal.timeout(prazo)));
    } finally {
        agent.destroy();
    }
}

export function efiTxidDoPedido(pedidoId: string) {
    return createHash("sha256").update(`efi-pix-2026-11-18:${pedidoId}`).digest("hex").slice(0, 35);
}

function validarCopiaCola(codigo: unknown): codigo is string {
    if (typeof codigo !== "string" || !codigo.startsWith("000201") ||
        !codigo.includes("BR.GOV.BCB.PIX") || !/6304[0-9a-f]{4}$/i.test(codigo) || codigo.length > 512) {
        return false;
    }
    let crc = 0xffff;
    for (const byte of Buffer.from(codigo.slice(0, -4))) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
        }
    }
    return crc === parseInt(codigo.slice(-4), 16);
}

export async function criarPixEfi(pedidoId: string, valor: string, devedor?: { cpf: string; nome: string }, txidSalvo?: string) {
    const agora = Date.now();
    const chave = process.env.EFI_PIX_KEY?.trim();
    if (!chave || !efiDisponivelParaCriacao(agora)) throw new Error("Criação Efí indisponível.");
    const txid = efiTxidDoPedido(pedidoId);
    return comClienteEfi(Math.min(8000, fim - agora), async config => {
        const url = `${baseUrl}/v2/cob/${txid}`;
        if (!efiDisponivelParaCriacao()) throw new Error("Janela Efí encerrada.");
        const reutilizado = txidSalvo === txid;
        const { data } = reutilizado ? await axios.get(url, config) : await axios.put(url, {
            calendario: { expiracao: 3600 },
            valor: { original: valor },
            chave,
            ...(devedor && { devedor }),
        }, config);
        const status = data?.status;
        const pixCopiaCola = data?.pixCopiaECola;
        if (data?.txid !== txid || data?.valor?.original !== valor || data?.chave !== chave ||
            (status !== "ATIVA" && status !== "CONCLUIDA")) {
            throw new Error("Cobrança Efí inválida.");
        }
        if (status === "ATIVA") {
            const expiracao = Number(data.calendario?.expiracao);
            const expiraEm = Date.parse(data.calendario?.criacao) + expiracao * 1000;
            if (!(expiraEm > Date.now()) || !validarCopiaCola(pixCopiaCola)) {
                throw new Error("Pix Efí expirado ou copia e cola inválido.");
            }
            QRCode.create(pixCopiaCola);
        } else if (!validarCobrancaPix(data, txid)) {
            throw new Error("Confirmação Efí inválida.");
        }
        return { txid, status, pixCopiaCola: typeof pixCopiaCola === "string" ? pixCopiaCola : "",
            location: typeof data.location === "string" ? data.location : "", reutilizado };
    });
}

export async function consultarPixEfiConfirmado(txid: string) {
    return comClienteEfi(8000, async config => {
        const { data } = await axios.get(`${baseUrl}/v2/cob/${encodeURIComponent(txid)}`, config);
        return validarCobrancaPix(data, txid);
    });
}

export async function cadastrarWebhookEfi() {
    const chave = process.env.EFI_PIX_KEY?.trim();
    const hmac = process.env.EFI_WEBHOOK_HMAC?.trim();
    if (!chave || !hmac) throw new Error("Configuração do webhook Efí incompleta.");

    const webhookUrl = new URL("https://www.parquemundonovooficial.com.br/api/efi/webhook");
    webhookUrl.searchParams.set("hmac", hmac);
    webhookUrl.searchParams.set("ignorar", "");

    await comClienteEfi(20000, async config => {
        await axios.put(`${baseUrl}/v2/webhook/${encodeURIComponent(chave)}`,
            { webhookUrl: webhookUrl.toString() },
            { ...config, timeout: 15000, headers: { ...config.headers, "x-skip-mtls-checking": "true" } });
    });
}
