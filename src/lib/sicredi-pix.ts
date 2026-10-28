import https from "https";
import axios from "axios";

export function validarCobrancaPix(cobranca: unknown, txid: string) {
    const cob = cobranca as { status?: string; txid?: string; pix?: Array<{
        txid?: string; valor?: string; endToEndId?: string; horario?: string; devolucoes?: unknown[];
    }> } | null;
    if (cob?.status !== "CONCLUIDA" || cob.txid !== txid || !Array.isArray(cob.pix)) return null;
    // Não inferir recebimento de valor.original nem do valor local do pedido.
    if (cob.pix.length !== 1) return null;
    const pix = cob.pix[0];
    if (!pix || typeof pix !== "object") return null;
    const valor = Number(pix.valor);
    if ((Array.isArray(pix.devolucoes) && pix.devolucoes.length > 0) || (pix.txid && pix.txid !== txid) || (typeof pix.endToEndId !== "string" || !pix.endToEndId.trim()) ||
        typeof pix.horario !== "string" || !Number.isFinite(Date.parse(pix.horario)) ||
        !Number.isFinite(valor) || valor <= 0) return null;
    return { valor, endToEndId: pix.endToEndId, horario: pix.horario };
}

let tokenEmCache: { chave: string; valor: string; ate: number } | undefined;
let tokenPendente: { chave: string; promessa: Promise<string> } | undefined;

export async function criarClientePix() {
    const { SICREDI_BASE_URL: baseUrl, SICREDI_CLIENT_ID: clientId,
        SICREDI_CLIENT_SECRET: clientSecret, SICREDI_CERT_BASE64: cert,
        SICREDI_KEY_BASE64: key } = process.env;
    if (!baseUrl || !clientId || !clientSecret || !cert || !key ||
        [baseUrl, clientId, clientSecret, cert, key].some(valor => valor.includes("[SENSITIVE]"))) {
        throw new Error("Configuração Pix Sicredi incompleta.");
    }
    const httpsAgent = new https.Agent({
        cert: Buffer.from(cert, "base64").toString("utf8"),
        key: Buffer.from(key, "base64").toString("utf8"),
        rejectUnauthorized: true,
    });
    const chaveCache = JSON.stringify([baseUrl, clientId, clientSecret, cert, key]);
    const obterToken = async () => {
    const token = await axios.post(`${baseUrl}/oauth/token`,
        new URLSearchParams({ grant_type: "client_credentials" }).toString(), {
            httpsAgent, timeout: 15000,
            headers: {
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
    if (!token.data?.access_token) throw new Error("Sicredi não retornou access_token.");
    const duracao = Number(token.data.expires_in);
    if (Number.isFinite(duracao) && duracao > 30) tokenEmCache = { chave: chaveCache, valor: token.data.access_token, ate: Date.now() + (duracao - 30) * 1000 };
    return String(token.data.access_token);
    };
    let accessToken: string;
    if (tokenEmCache?.chave === chaveCache && tokenEmCache.ate > Date.now()) accessToken = tokenEmCache.valor;
    else {
        if (tokenPendente?.chave !== chaveCache) tokenPendente = { chave: chaveCache, promessa: obterToken() };
        const pendente = tokenPendente;
        try { accessToken = await pendente.promessa; }
        finally { if (tokenPendente === pendente) tokenPendente = undefined; }
    }
    return { baseUrl, config: { httpsAgent, timeout: 15000, headers: { Authorization: `Bearer ${accessToken}` } } };
}

export async function consultarPixConfirmado(txid: string) {
    const { baseUrl, config } = await criarClientePix();
    const response = await axios.get(`${baseUrl}/api/v2/cob/${encodeURIComponent(txid)}`, config);
    return validarCobrancaPix(response.data, txid);
}
