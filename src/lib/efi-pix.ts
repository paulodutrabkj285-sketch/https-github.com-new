import https from "https";
import { isIP } from "net";
import { createHash } from "crypto";
import axios from "axios";
import QRCode from "qrcode";
import { validarCobrancaPix } from "@/lib/sicredi-pix";

export const EFI_TEMPORARY_ENABLED = true;

// Horários locais de America/Sao_Paulo nesse período (UTC-03:00).
const janelasEfi = [
    { inicio: Date.parse("2026-11-18T00:00:00-03:00"), fim: Date.parse("2026-11-19T13:30:00-03:00") },
    { inicio: Date.parse("2026-11-19T19:00:00-03:00"), fim: Date.parse("2026-11-20T09:00:00-03:00") },
    { inicio: Date.parse("2026-11-21T12:00:00-03:00"), fim: Date.parse("2026-11-21T13:30:00-03:00") },
    { inicio: Date.parse("2026-11-21T18:00:00-03:00"), fim: Date.parse("2026-11-22T07:30:00-03:00") },
    { inicio: Date.parse("2026-11-22T18:20:00-03:00"), fim: Date.parse("2026-11-23T07:00:00-03:00") },
    { inicio: Date.parse("2026-11-23T22:12:00-03:00"), fim: Date.parse("2026-11-24T08:00:00-03:00") },
    { inicio: Date.parse("2026-11-24T22:25:00-03:00"), fim: Date.parse("2026-11-25T08:00:00-03:00") },
    { inicio: Date.parse("2026-11-25T20:57:00-03:00"), fim: Date.parse("2026-11-26T07:30:00-03:00") },
];
const baseUrl = "https://pix.api.efipay.com.br";
const timeout = 5000;

type EtapaEfi = "oauth" | "criar-cobranca" | "qrcode";

class ErroPixEfi extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
    }
}

const codigoTransporte = /^(?:E[A-Z][A-Z0-9_]{1,63}|(?:CERT|UNABLE|DEPTH|SELF|HOSTNAME)_[A-Z0-9_]{1,63})$/;
const mensagensTransporte = [
    /^(?:mac verify failure|unsupported|unsupported algorithm|wrong tag|header too long|not enough data|nested asn1 error|bad decrypt|no start line|unknown pbe algorithm|parse error|invalid password|socket hang up|canceled|Network Error|unable to verify the first certificate|unable to get local issuer certificate|self-signed certificate(?: in certificate chain)?|certificate has expired|Client network socket disconnected before secure TLS connection was established)$/,
    /^(?:Request failed with status code \d{3}|timeout of \d{1,8}ms exceeded)$/,
    /^(?:connect|read|write|getaddrinfo|getnameinfo) E[A-Z0-9_]{1,63}(?: (?:pix\.api\.efipay\.com\.br|[\da-fA-F.:\[\]]+)(?::\d{1,5})?)?$/,
    /^(?:write |read )?EPROTO$/,
    /^error:[\da-fA-F]{8}:[a-zA-Z0-9 ._-]+:[a-zA-Z0-9 ._-]*:[a-zA-Z0-9 ._-]+$/,
];

function mensagemTransporte(valor: unknown) {
    if (typeof valor !== "string") return undefined;
    // OpenSSL pode anexar caminhos e detalhes após o diagnóstico.
    const mensagem = valor.split("\n", 1)[0].trim();
    if (mensagem.length <= 240 && mensagensTransporte.some(padrao => padrao.test(mensagem))) return mensagem;
    const openssl = /\berror:[\da-fA-F]{8}:[a-zA-Z0-9 ._-]+:[a-zA-Z0-9 ._-]*:[a-zA-Z0-9 ._-]+/.exec(mensagem)?.[0];
    return openssl && openssl.length <= 240 ? openssl.trimEnd() : "[redigido]";
}

function registrarFalhaEfi(etapa: EtapaEfi, erro: unknown, ultimoStatus?: number) {
    const { EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_CERTIFICATE_P12_BASE64, EFI_PIX_KEY } = process.env;
    const certificado = EFI_CERTIFICATE_P12_BASE64?.trim();
    const erroAxios = axios.isAxiosError<unknown>(erro) ? erro : undefined;
    const resposta = erroAxios?.response;
    const status = resposta?.status ?? (erro instanceof ErroPixEfi ? erro.status : undefined) ?? ultimoStatus;
    const original = erro && typeof erro === "object" ? erro as Record<string, unknown> : {};
    const causa = original.cause && typeof original.cause === "object"
        ? original.cause as Record<string, unknown> : undefined;
    const authorization = erroAxios?.config?.headers?.get?.("Authorization");
    const credenciais = [EFI_CLIENT_ID, EFI_CLIENT_SECRET, certificado, EFI_PIX_KEY,
        typeof authorization === "string" ? authorization.replace(/^(?:Basic|Bearer)\s+/i, "") : undefined];
    if (EFI_CLIENT_ID?.trim() && EFI_CLIENT_SECRET?.trim()) {
        credenciais.push(Buffer.from(`${EFI_CLIENT_ID.trim()}:${EFI_CLIENT_SECRET.trim()}`).toString("base64"));
    }
    const segredos = credenciais.flatMap(valor => valor?.trim() ? [valor, valor.trim(), encodeURIComponent(valor.trim())] : []);
    const proteger = (valor: string | undefined) => (
        valor && segredos.some(segredo => valor.includes(segredo)) ? "[redigido]" : valor
    );
    const codigoSeguro = (valor: unknown) => (
        typeof valor === "string" && codigoTransporte.test(valor) ? proteger(valor) : undefined
    );
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
            name: typeof original.name === "string" &&
                /^(?:Error|AxiosError|CanceledError|TypeError|RangeError|AggregateError|SystemError|AbortError|TimeoutError)$/.test(original.name)
                ? proteger(original.name) : undefined,
            code: codigoSeguro(original.code),
            errno: typeof original.errno === "number" ? original.errno : codigoSeguro(original.errno),
            syscall: typeof original.syscall === "string" &&
                /^(?:connect|read|write|writev|getaddrinfo|getnameinfo|socket|lookup|bind)$/.test(original.syscall)
                ? proteger(original.syscall) : undefined,
            address: typeof original.address === "string" && (isIP(original.address) || original.address === "pix.api.efipay.com.br")
                ? proteger(original.address) : undefined,
            port: typeof original.port === "number" && Number.isInteger(original.port) && original.port >= 0 && original.port <= 65535
                ? original.port : undefined,
            message: proteger(erro instanceof ErroPixEfi ? erro.message : mensagemTransporte(original.message)),
            cause: causa && { code: codigoSeguro(causa.code), message: proteger(mensagemTransporte(causa.message)) },
        },
        axiosError: erroAxios && {
            code: codigoSeguro(erroAxios.code),
            message: proteger(mensagemTransporte(erroAxios.message)),
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

// Teste temporário de ponta a ponta, restrito a um ID configurado no servidor.
export const VALOR_TESTE_EFI = 0.01;

export function pedidoAutorizadoParaTesteEfi(
    pedidoId: string,
    pedido: { email?: unknown; origem?: unknown; agenciaId?: unknown; cortesia?: unknown },
) {
    return pedidoId === process.env.EFI_TESTE_PEDIDO_ID?.trim() &&
        typeof pedido.email === "string" &&
        pedido.email.trim().toLowerCase() === "paulodutrabkj285@gmail.com" &&
        (pedido.origem === undefined || pedido.origem === "site") &&
        !pedido.agenciaId && !pedido.cortesia;
}

function janelaEfiAtiva(agora: number) {
    if (!EFI_TEMPORARY_ENABLED) return undefined;
    return janelasEfi.find(({ inicio, fim }) => agora >= inicio && agora < fim);
}

export function efiDisponivelParaCriacao(agora = Date.now()) {
    return janelaEfiAtiva(agora) !== undefined;
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
        const janela = janelaEfiAtiva(agora);
        if (!janela) throw new ErroPixEfi("Janela Efí encerrada.");

        etapa = "oauth";
        const txid = efiTxidDoPedido(pedidoId);
        return await comClienteEfi(Math.min(8000, janela.fim - agora), async config => {
            etapa = "criar-cobranca";
            const url = `${baseUrl}/v2/cob/${txid}`;
            if (janelaEfiAtiva(Date.now()) !== janela) throw new ErroPixEfi("Janela Efí encerrada.");
            // Um TXID reservado pode estar no Firestore antes de existir no banco.
            const existente = txidSalvo === txid
                ? await axios.get(url, { ...config, validateStatus: status => status === 200 || status === 404 })
                : undefined;
            const reutilizado = existente?.status === 200;
            if (!reutilizado && janelaEfiAtiva(Date.now()) !== janela) {
                throw new ErroPixEfi("Janela Efí encerrada.");
            }
            const resposta = existente?.status === 200 ? existente : await axios.put(url, {
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
        const { data, status } = await axios.get(`${baseUrl}/v2/cob/${encodeURIComponent(txid)}`, {
            ...config, validateStatus: status => status === 200 || status === 404,
        });
        return status === 404 ? null : validarCobrancaPix(data, txid);
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
