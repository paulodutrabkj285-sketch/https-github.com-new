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

type EtapaEfi = "oauth" | "criar-cobranca" | "qrcode";

class ErroPixEfi extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
    }
}

function registrarFalhaEfi(etapa: EtapaEfi, erro: unknown, ultimoStatus?: number) {
    const { EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_CERTIFICATE_P12_BASE64, EFI_PIX_KEY } = process.env;
    const certificado = EFI_CERTIFICATE_P12_BASE64?.trim();
    const resposta = axios.isAxiosError<unknown>(erro) ? erro.response : undefined;
    const status = resposta?.status ?? (erro instanceof ErroPixEfi ? erro.status : undefined) ?? ultimoStatus;
    const codigo = erro instanceof Error && "code" in erro ? erro.code : undefined;
    const codigosSeguros = [
        "ECONNABORTED", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN",
        "EPIPE", "ERR_CANCELED", "ERR_BAD_REQUEST", "ERR_BAD_RESPONSE", "ERR_NETWORK",
        "ERR_OSSL_EVP_UNSUPPORTED", "ERR_OSSL_PKCS12_MAC_VERIFY_FAILURE",
        "ERR_SSL_TLSV1_ALERT_UNKNOWN_CA", "ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED",
        "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    ];
    const code = typeof codigo === "string" && codigosSeguros.includes(codigo) ? codigo : undefined;
    const data = resposta?.data;
    const corpo = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const errosConhecidos = [
        "invalid_request", "invalid_client", "unauthorized_client", "unsupported_grant_type",
        "invalid_scope", "server_error", "temporarily_unavailable", "chave_invalida",
        "valor_invalido", "documento_bloqueado", "txid_duplicado", "cobranca_nao_encontrada",
        "status_cobranca_invalido", "erro_aplicacao", "json_invalido", "location_nao_encontrada",
    ];
    const tipo = corpo.error ?? corpo.nome;
    // Respostas e mensagens externas podem conter segredos ou dados do pagador.
    console.warn("Pix Efí falhou.", {
        etapa,
        status,
        error: {
            code,
            message: erro instanceof ErroPixEfi ? erro.message
                : resposta ? `Efí retornou HTTP ${resposta.status}.`
                : code ? `Falha na comunicação com a Efí (${code}).`
                : "Falha local ou de transporte na integração Efí.",
        },
        response: data === undefined ? undefined : {
            data: typeof tipo === "string" && errosConhecidos.includes(tipo) ? { tipo } : "[redigido]",
        },
        certificadoBytes: certificado ? Buffer.from(certificado, "base64").length : 0,
        EFI_CLIENT_ID: Boolean(EFI_CLIENT_ID?.trim()),
        EFI_CLIENT_SECRET: Boolean(EFI_CLIENT_SECRET?.trim()),
        EFI_CERTIFICATE_P12_BASE64: Boolean(certificado),
        EFI_PIX_KEY: Boolean(EFI_PIX_KEY?.trim()),
    });
}

export function efiDisponivelParaCriacao(agora = Date.now()) {
    return EFI_TEMPORARY_ENABLED && agora >= inicio && agora < fim;
}

async function autenticar(httpsAgent: https.Agent, signal: AbortSignal, aoAutenticar?: (status: number) => void) {
    const { EFI_CLIENT_ID, EFI_CLIENT_SECRET } = process.env;
    const clientId = EFI_CLIENT_ID?.trim();
    const clientSecret = EFI_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
        throw new ErroPixEfi("Credenciais Efí ausentes.");
    }
    const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
    const token = await axios.post(`${baseUrl}/oauth/token`, { grant_type: "client_credentials" }, {
        httpsAgent, signal, timeout, maxRedirects: 0,
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    });
    if (typeof token.data?.access_token !== "string" || !token.data.access_token.trim()) {
        throw new ErroPixEfi("Resposta OAuth sem token válido.", token.status);
    }
    aoAutenticar?.(token.status);
    return {
        httpsAgent, signal, timeout, maxRedirects: 0,
        headers: { Authorization: `Bearer ${token.data.access_token}` },
    };
}

async function comClienteEfi<T>(
    prazo: number,
    executar: (config: Awaited<ReturnType<typeof autenticar>>) => Promise<T>,
    aoAutenticar?: (status: number) => void,
) {
    const { EFI_CERTIFICATE_P12_BASE64 } = process.env;
    if (!EFI_CERTIFICATE_P12_BASE64?.trim()) throw new ErroPixEfi("Certificado Efí ausente.");
    const pfx = Buffer.from(EFI_CERTIFICATE_P12_BASE64.trim(), "base64");
    if (pfx.length === 0) throw new ErroPixEfi("Certificado Efí decodificado está vazio.");
    const agent = new https.Agent({
        pfx,
        passphrase: "",
        rejectUnauthorized: true,
    });
    try {
        return await executar(await autenticar(agent, AbortSignal.timeout(prazo), aoAutenticar));
    } finally {
        agent.destroy();
    }
}

export function efiTxidDoPedido(pedidoId: string) {
    return createHash("sha256").update(`efi-pix-2026-11-18:${pedidoId}`).digest("hex").slice(0, 35);
}

function validarCopiaCola(codigo: unknown): codigo is string {
    if (typeof codigo !== "string" || !codigo.startsWith("000201") ||
        !/BR\.GOV\.BCB\.PIX/i.test(codigo) || !/6304[0-9a-f]{4}$/i.test(codigo) || codigo.length > 512) {
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
    let etapa: EtapaEfi = "criar-cobranca";
    let httpStatus: number | undefined;

    try {
        if (!chave) throw new ErroPixEfi("Chave Pix Efí ausente.");
        if (!efiDisponivelParaCriacao(agora)) throw new ErroPixEfi("Janela Efí encerrada.");

        etapa = "oauth";
        const txid = efiTxidDoPedido(pedidoId);
        return await comClienteEfi(Math.min(8000, fim - agora), async config => {
            etapa = "criar-cobranca";
            const url = `${baseUrl}/v2/cob/${txid}`;
            if (!efiDisponivelParaCriacao()) throw new ErroPixEfi("Janela Efí encerrada.");
            const reutilizado = txidSalvo === txid;
            const resposta = reutilizado ? await axios.get(url, config) : await axios.put(url, {
                calendario: { expiracao: 3600 },
                valor: { original: valor },
                chave,
                ...(devedor && { devedor }),
            }, config);
            httpStatus = resposta.status;
            const { data } = resposta;
            const status = data?.status;
            let pixCopiaCola = data?.pixCopiaECola;
            if (data?.txid !== txid || data?.valor?.original !== valor || data?.chave !== chave ||
                (status !== "ATIVA" && status !== "CONCLUIDA")) {
                throw new ErroPixEfi("Cobrança Efí inválida.");
            }
            if (status === "ATIVA") {
                const expiracao = Number(data.calendario?.expiracao);
                const expiraEm = Date.parse(data.calendario?.criacao) + expiracao * 1000;
                if (!(expiraEm > Date.now())) throw new ErroPixEfi("Cobrança Efí expirada.");

                etapa = "qrcode";
                if (!validarCopiaCola(pixCopiaCola) && Number.isSafeInteger(data.loc?.id) && data.loc.id > 0) {
                    httpStatus = undefined;
                    const qr = await axios.get(`${baseUrl}/v2/loc/${data.loc.id}/qrcode`, config);
                    httpStatus = qr.status;
                    pixCopiaCola = qr.data?.qrcode;
                }
                if (!validarCopiaCola(pixCopiaCola)) {
                    throw new ErroPixEfi("Pix copia e cola Efí ausente ou inválido.");
                }
                QRCode.create(pixCopiaCola);
            } else if (!validarCobrancaPix(data, txid)) {
                throw new ErroPixEfi("Confirmação Efí inválida.");
            }
            return { txid, status, pixCopiaCola: typeof pixCopiaCola === "string" ? pixCopiaCola : "",
                location: typeof data.location === "string" ? data.location : "", reutilizado };
        }, status => console.info("Pix Efí OAuth autorizado.", { etapa: "oauth", status }));
    } catch (erro) {
        registrarFalhaEfi(etapa, erro, httpStatus);
        throw erro;
    }
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
