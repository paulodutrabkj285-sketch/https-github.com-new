import axios from "axios";
import https from "https";

/* =========================================================
   TIPOS
   ========================================================= */

export type ConfiguracaoIpg = {
  url: string;
  storeId: string;
  userId: string;
  userPassword: string;
  p12Base64: string;
  p12Password: string;
};

export type DadosVendaCartao = {
  numeroCartao: string;
  mesValidade: string;
  anoValidade: string;
  cvv: string;
  valor: number;
  pedidoId: string;
  nomeEstabelecimento?: string;
};

export type RespostaIpg = {
  httpStatus: number;
  transactionResult: string;
  orderId: string;
  approvalCode: string;
  processorResponseCode: string;
  processorResponseMessage: string;
  processorApprovalCode: string;
  processorReceiptNumber: string;
  processorTraceNumber: string;
  processorReferenceNumber: string;
  terminalId: string;
  transactionTime: string;
  tDate: string;
  errorMessage: string;
  faultCode: string;
  faultString: string;
  aprovado: boolean;
  recusado: boolean;
  fraude: boolean;
  xmlResposta: string;
};

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

export function obterConfiguracaoIpg(): ConfiguracaoIpg {
  const url = process.env.SICREDI_IPG_URL?.trim();
  const storeId = process.env.SICREDI_IPG_STORE_ID?.trim();
  const userId = process.env.SICREDI_IPG_USER_ID?.trim();
  const userPassword = process.env.SICREDI_IPG_USER_PASSWORD;
  const p12Base64 = process.env.SICREDI_IPG_P12_BASE64;
  const p12Password = process.env.SICREDI_IPG_P12_PASSWORD;

  const ausentes: string[] = [];

  if (!url) {
    ausentes.push("SICREDI_IPG_URL");
  }

  if (!storeId) {
    ausentes.push("SICREDI_IPG_STORE_ID");
  }

  if (!userId) {
    ausentes.push("SICREDI_IPG_USER_ID");
  }

  if (!userPassword) {
    ausentes.push("SICREDI_IPG_USER_PASSWORD");
  }

  if (!p12Base64) {
    ausentes.push("SICREDI_IPG_P12_BASE64");
  }

  if (!p12Password) {
    ausentes.push("SICREDI_IPG_P12_PASSWORD");
  }

  if (ausentes.length > 0) {
    throw new Error(
      `Variáveis do Sicredi IPG ausentes: ${ausentes.join(", ")}`
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
   CERTIFICADO
   ========================================================= */

export function criarAgentIpg(
  p12Base64: string,
  p12Password: string
): https.Agent {
  const base64Limpo = p12Base64.replace(/\s/g, "");

  if (!base64Limpo) {
    throw new Error("O certificado P12 está vazio.");
  }

  const pfx = Buffer.from(base64Limpo, "base64");

  if (pfx.length === 0) {
    throw new Error(
      "Não foi possível decodificar o certificado P12."
    );
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
   VALIDAÇÕES
   ========================================================= */

export function somenteDigitos(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function validarNumeroCartao(
  numeroCartao: string
): boolean {
  const numero = somenteDigitos(numeroCartao);

  if (
    numero.length < 13 ||
    numero.length > 19
  ) {
    return false;
  }

  let soma = 0;
  let dobrar = false;

  for (
    let indice = numero.length - 1;
    indice >= 0;
    indice--
  ) {
    let digito = Number(numero[indice]);

    if (dobrar) {
      digito *= 2;

      if (digito > 9) {
        digito -= 9;
      }
    }

    soma += digito;
    dobrar = !dobrar;
  }

  return soma % 10 === 0;
}

export function validarValidadeCartao(
  mesValidade: string,
  anoValidade: string
): boolean {
  const mes = Number(
    somenteDigitos(mesValidade)
  );

  let ano = Number(
    somenteDigitos(anoValidade)
  );

  if (
    mes < 1 ||
    mes > 12
  ) {
    return false;
  }

  if (ano < 100) {
    ano += 2000;
  }

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1;

  if (ano < anoAtual) {
    return false;
  }

  if (
    ano === anoAtual &&
    mes < mesAtual
  ) {
    return false;
  }

  return ano <= anoAtual + 20;
}

export function validarCvv(
  cvv: string
): boolean {
  const numeros = somenteDigitos(cvv);

  return (
    numeros.length === 3 ||
    numeros.length === 4
  );
}

/* =========================================================
   XML
   ========================================================= */

function escaparXml(
  valor: unknown
): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatarMes(
  mes: string
): string {
  return somenteDigitos(mes)
    .padStart(2, "0")
    .slice(-2);
}

function formatarAno(
  ano: string
): string {
  const numeros =
    somenteDigitos(ano);

  if (numeros.length === 4) {
    return numeros.slice(-2);
  }

  return numeros
    .padStart(2, "0")
    .slice(-2);
}

function formatarValor(
  valor: number
): string {
  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    throw new Error(
      "Valor da transação inválido."
    );
  }

  return valor.toFixed(2);
}

/* =========================================================
   CRIAÇÃO DA VENDA À VISTA
   ========================================================= */

export function criarXmlVendaCartao(
  configuracao: ConfiguracaoIpg,
  dados: DadosVendaCartao
): string {
  const numeroCartao =
    somenteDigitos(dados.numeroCartao);

  const cvv =
    somenteDigitos(dados.cvv);

  const mesValidade =
    formatarMes(dados.mesValidade);

  const anoValidade =
    formatarAno(dados.anoValidade);

  const valor =
    formatarValor(dados.valor);

  const nomeEstabelecimento = (
    dados.nomeEstabelecimento ||
    "PARQUE MUNDO NOVO"
  )
    .trim()
    .slice(0, 25);

  /*
   * Venda de cartão de crédito à vista.
   *
   * Não envia:
   * numberOfInstallments
   * installmentsInterest
   */
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Header/>
  <soap-env:Body>
    <ipgapi:IPGApiOrderRequest
      xmlns:ipgapi="http://ipg-online.com/ipgapi/schemas/ipgapi"
      xmlns:v1="http://ipg-online.com/ipgapi/schemas/v1">
      <v1:Transaction>
        <v1:CreditCardTxType>
          <v1:StoreId>${escaparXml(
    configuracao.storeId
  )}</v1:StoreId>
          <v1:Type>sale</v1:Type>
        </v1:CreditCardTxType>

        <v1:CreditCardData>
          <v1:CardNumber>${escaparXml(
    numeroCartao
  )}</v1:CardNumber>
          <v1:ExpMonth>${escaparXml(
    mesValidade
  )}</v1:ExpMonth>
          <v1:ExpYear>${escaparXml(
    anoValidade
  )}</v1:ExpYear>
          <v1:CardCodeValue>${escaparXml(
    cvv
  )}</v1:CardCodeValue>
        </v1:CreditCardData>

        <v1:cardFunction>credit</v1:cardFunction>

        <v1:Payment>
          <v1:ChargeTotal>${escaparXml(
    valor
  )}</v1:ChargeTotal>
          <v1:Currency>986</v1:Currency>
        </v1:Payment>

        <v1:TransactionDetails>
          <v1:OrderId>${escaparXml(
    dados.pedidoId
  )}</v1:OrderId>
          <v1:DynamicMerchantName>${escaparXml(
    nomeEstabelecimento
  )}</v1:DynamicMerchantName>
        </v1:TransactionDetails>
      </v1:Transaction>
    </ipgapi:IPGApiOrderRequest>
  </soap-env:Body>
</soap-env:Envelope>`;
}

/* =========================================================
   LEITURA DA RESPOSTA XML
   ========================================================= */

function extrairTag(
  xml: string,
  tag: string
): string {
  const regex = new RegExp(
    `<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`,
    "i"
  );

  return (
    xml.match(regex)?.[1]?.trim() ||
    ""
  );
}

function removerTagsXml(
  valor: string
): string {
  return String(valor || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function interpretarRespostaIpg(
  httpStatus: number,
  xmlResposta: string
): RespostaIpg {
  const transactionResult =
    extrairTag(
      xmlResposta,
      "TransactionResult"
    ).toUpperCase();

  const resposta: RespostaIpg = {
    httpStatus,
    transactionResult,

    orderId:
      extrairTag(
        xmlResposta,
        "OrderId"
      ),

    approvalCode:
      extrairTag(
        xmlResposta,
        "ApprovalCode"
      ),

    processorResponseCode:
      extrairTag(
        xmlResposta,
        "ProcessorResponseCode"
      ),

    processorResponseMessage:
      removerTagsXml(
        extrairTag(
          xmlResposta,
          "ProcessorResponseMessage"
        )
      ),

    processorApprovalCode:
      extrairTag(
        xmlResposta,
        "ProcessorApprovalCode"
      ),

    processorReceiptNumber:
      extrairTag(
        xmlResposta,
        "ProcessorReceiptNumber"
      ),

    processorTraceNumber:
      extrairTag(
        xmlResposta,
        "ProcessorTraceNumber"
      ),

    processorReferenceNumber:
      extrairTag(
        xmlResposta,
        "ProcessorReferenceNumber"
      ),

    terminalId:
      extrairTag(
        xmlResposta,
        "TerminalID"
      ),

    transactionTime:
      extrairTag(
        xmlResposta,
        "TransactionTime"
      ),

    tDate:
      extrairTag(
        xmlResposta,
        "TDate"
      ),

    errorMessage:
      removerTagsXml(
        extrairTag(
          xmlResposta,
          "ErrorMessage"
        )
      ),

    faultCode:
      extrairTag(
        xmlResposta,
        "faultcode"
      ),

    faultString:
      removerTagsXml(
        extrairTag(
          xmlResposta,
          "faultstring"
        )
      ),

    aprovado:
      transactionResult ===
      "APPROVED",

    recusado:
      transactionResult ===
      "DECLINED" ||
      transactionResult ===
      "FAILED",

    fraude:
      transactionResult ===
      "FRAUD",

    xmlResposta,
  };

  return resposta;
}

/* =========================================================
   ENVIO SOAP
   ========================================================= */

export async function enviarSoapIpg(
  xml: string
): Promise<RespostaIpg> {
  const configuracao =
    obterConfiguracaoIpg();

  const httpsAgent =
    criarAgentIpg(
      configuracao.p12Base64,
      configuracao.p12Password
    );

  const resposta =
    await axios.post(
      configuracao.url,
      xml,
      {
        httpsAgent,
        timeout: 30000,

        auth: {
          username:
            configuracao.userId,

          password:
            configuracao.userPassword,
        },

        headers: {
          "Content-Type":
            "text/xml; charset=UTF-8",

          Accept: "text/xml",

          SOAPAction: "",

          "Cache-Control":
            "no-cache",
        },

        responseType: "text",

        validateStatus:
          () => true,
      }
    );

  const xmlResposta =
    typeof resposta.data === "string"
      ? resposta.data
      : JSON.stringify(
        resposta.data
      );

  return interpretarRespostaIpg(
    resposta.status,
    xmlResposta
  );
}