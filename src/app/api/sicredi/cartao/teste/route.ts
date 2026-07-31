import axios from "axios";
import https from "https";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TIPOS
   ========================================================= */

type ConfiguracaoIpg = {
  url: string;
  storeId: string;
  userId: string;
  userPassword: string;
  p12Base64: string;
  p12Password: string;
};

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

function obterConfiguracao(): ConfiguracaoIpg {
  const url = process.env.SICREDI_IPG_URL?.trim();
  const storeId = process.env.SICREDI_IPG_STORE_ID?.trim();
  const userId = process.env.SICREDI_IPG_USER_ID?.trim();
  const userPassword = process.env.SICREDI_IPG_USER_PASSWORD;
  const p12Base64 = process.env.SICREDI_IPG_P12_BASE64;
  const p12Password = process.env.SICREDI_IPG_P12_PASSWORD;

  const ausentes: string[] = [];

  if (!url) ausentes.push("SICREDI_IPG_URL");
  if (!storeId) ausentes.push("SICREDI_IPG_STORE_ID");
  if (!userId) ausentes.push("SICREDI_IPG_USER_ID");
  if (!userPassword) ausentes.push("SICREDI_IPG_USER_PASSWORD");
  if (!p12Base64) ausentes.push("SICREDI_IPG_P12_BASE64");
  if (!p12Password) ausentes.push("SICREDI_IPG_P12_PASSWORD");

  if (ausentes.length > 0) {
    throw new Error(
      `Variáveis do Sicredi IPG não configuradas: ${ausentes.join(", ")}`
    );
  }

  return {
    url: url!,
    storeId: storeId!,
    userId: userId!,
    userPassword: userPassword!,
    p12Base64: p12Base64!,
    p12Password: p12Password!,
  };
}

/* =========================================================
   CERTIFICADO P12
   ========================================================= */

function criarHttpsAgent(
  p12Base64: string,
  p12Password: string
): https.Agent {
  const base64Limpo = p12Base64.replace(/\s/g, "");

  if (!base64Limpo) {
    throw new Error("O certificado P12 em Base64 está vazio.");
  }

  const pfx = Buffer.from(base64Limpo, "base64");

  if (pfx.length === 0) {
    throw new Error("Não foi possível converter o certificado P12.");
  }

  return new https.Agent({
    pfx,
    passphrase: p12Password,
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    keepAlive: false,
  });
}

/* =========================================================
   XML SEGURO PARA TESTE

   Não contém:
   - cartão;
   - CVV;
   - valor;
   - operação sale;
   - pedido real.

   O servidor pode responder com SOAP Fault, porque o Body está
   vazio. Ainda assim, isso permite verificar certificado,
   conexão TLS e autenticação HTTP.
   ========================================================= */

function criarSoapTesteSeguro(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap-env:Envelope
  xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Header/>
  <soap-env:Body/>
</soap-env:Envelope>`;
}

/* =========================================================
   LEITURA DE TAGS XML
   ========================================================= */

function extrairTag(xml: string, tag: string): string {
  const regex = new RegExp(
    `<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`,
    "i"
  );

  return xml.match(regex)?.[1]?.trim() || "";
}

function removerTagsXml(valor: string): string {
  return String(valor || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   INTERPRETAÇÃO DO STATUS
   ========================================================= */

function interpretarResultado(
  httpStatus: number,
  faultCode: string,
  faultString: string
) {
  if (httpStatus === 401) {
    return {
      etapa: "autenticacao",
      sucesso: false,
      mensagem:
        "O certificado foi carregado, mas o usuário ou a senha do IPG foram recusados.",
    };
  }

  if (httpStatus === 403) {
    return {
      etapa: "permissao",
      sucesso: false,
      mensagem:
        "A autenticação chegou ao IPG, mas o usuário não possui permissão para esta operação.",
    };
  }

  if (httpStatus >= 200 && httpStatus < 300) {
    return {
      etapa: "conexao",
      sucesso: true,
      mensagem:
        "O certificado, a conexão TLS e a autenticação foram aceitos pelo IPG.",
    };
  }

  /*
   * Um SOAP Fault com HTTP 400 ou 500 pode ser esperado aqui,
   * porque estamos enviando propositalmente um Body vazio.
   *
   * Se o servidor conseguiu interpretar e devolver faultcode ou
   * faultstring, significa que a conexão mTLS e o Basic Auth
   * provavelmente foram concluídos.
   */
  if (
    httpStatus >= 400 &&
    httpStatus < 600 &&
    (faultCode || faultString)
  ) {
    return {
      etapa: "soap",
      sucesso: true,
      mensagem:
        "O certificado e a autenticação chegaram ao servidor. O IPG recusou apenas o XML vazio do teste, como esperado.",
    };
  }

  return {
    etapa: "conexao",
    sucesso: false,
    mensagem:
      "O IPG respondeu, mas ainda não foi possível confirmar completamente a autenticação.",
  };
}

/* =========================================================
   ROTA GET DE DIAGNÓSTICO
   ========================================================= */

export async function GET() {
  const inicio = Date.now();

  try {
    const configuracao = obterConfiguracao();

    const httpsAgent = criarHttpsAgent(
      configuracao.p12Base64,
      configuracao.p12Password
    );

    /*
     * O User ID recebido da Fiserv já está completo.
     * Exemplo de formato:
     * WSXXXXXXXXXX._.1
     *
     * Portanto, não devemos adicionar novamente WS, Store ID
     * ou outros caracteres.
     */
    const username = configuracao.userId;

    const soapXml = criarSoapTesteSeguro();

    const resposta = await axios.post(
      configuracao.url,
      soapXml,
      {
        httpsAgent,
        timeout: 30000,

        auth: {
          username,
          password: configuracao.userPassword,
        },

        headers: {
          "Content-Type": "text/xml; charset=UTF-8",
          Accept: "text/xml",
          SOAPAction: "",
          "Cache-Control": "no-cache",
        },

        responseType: "text",

        /*
         * Impede o Axios de lançar erro automaticamente em
         * respostas 400, 401, 403 ou 500. Assim conseguimos
         * analisar com precisão o retorno do IPG.
         */
        validateStatus: () => true,
      }
    );

    const xmlResposta =
      typeof resposta.data === "string"
        ? resposta.data
        : JSON.stringify(resposta.data);

    const faultCode =
      extrairTag(xmlResposta, "faultcode") ||
      extrairTag(xmlResposta, "FaultCode");

    const faultStringBruta =
      extrairTag(xmlResposta, "faultstring") ||
      extrairTag(xmlResposta, "FaultString") ||
      extrairTag(xmlResposta, "ErrorMessage");

    const faultString = removerTagsXml(faultStringBruta);

    const resultado = interpretarResultado(
      resposta.status,
      faultCode,
      faultString
    );

    return NextResponse.json(
      {
        ok: resultado.sucesso,
        testeSeguro: true,
        operacaoFinanceiraEnviada: false,

        etapa: resultado.etapa,
        mensagem: resultado.mensagem,

        httpStatus: resposta.status,
        httpStatusText: resposta.statusText || null,

        certificadoCarregado: true,
        servidorRespondeu: true,

        soapFault: Boolean(faultCode || faultString),
        faultCode: faultCode || null,
        faultString: faultString || null,

        storeIdConfigurado: Boolean(configuracao.storeId),
        userIdConfigurado: Boolean(configuracao.userId),

        tempoMs: Date.now() - inicio,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const erro = error as {
      code?: string;
      message?: string;
      cause?: {
        code?: string;
        message?: string;
      };
    };

    const codigo =
      erro?.code ||
      erro?.cause?.code ||
      null;

    const mensagem =
      erro?.message ||
      erro?.cause?.message ||
      "Erro desconhecido ao conectar ao Sicredi IPG.";

    console.error("Erro no diagnóstico Sicredi IPG:", {
      codigo,
      mensagem,
    });

    return NextResponse.json(
      {
        ok: false,
        testeSeguro: true,
        operacaoFinanceiraEnviada: false,

        etapa: "certificado-ou-conexao",
        mensagem,

        codigo,
        certificadoCarregado: false,
        servidorRespondeu: false,

        tempoMs: Date.now() - inicio,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}