import { NextRequest, NextResponse } from "next/server";
import https from "https";
import axios from "axios";

import { buscarPedidoPorId } from "@/lib/pedidos";
import { finalizarPagamento } from "@/lib/finalizar-pagamento";

export const runtime = "nodejs";

function criarHttpsAgent() {
    return new https.Agent({
        cert: Buffer.from(
            process.env.SICREDI_CERT_BASE64 || "",
            "base64"
        ).toString("utf8"),

        key: Buffer.from(
            process.env.SICREDI_KEY_BASE64 || "",
            "base64"
        ).toString("utf8"),

        rejectUnauthorized: true,
    });
}

async function obterToken() {
    const baseUrl = process.env.SICREDI_BASE_URL!;
    const clientId = process.env.SICREDI_CLIENT_ID!;
    const clientSecret = process.env.SICREDI_CLIENT_SECRET!;

    const response = await axios.post(
        `${baseUrl}/oauth/token`,
        new URLSearchParams({
            grant_type: "client_credentials",
        }).toString(),
        {
            httpsAgent: criarHttpsAgent(),

            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        `${clientId}:${clientSecret}`
                    ).toString("base64"),

                "Content-Type":
                    "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data.access_token;
}

function valorEmCentavos(valor: any) {
    return Math.round(
        Number(valor || 0) * 100
    );
}

export async function POST(
    req: NextRequest
) {
    try {
        const { pedidoId } = await req.json();

        if (!pedidoId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido não informado.",
                },
                {
                    status: 400,
                }
            );
        }

        const pedido: any =
            await buscarPedidoPorId(
                pedidoId
            );

        if (!pedido) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Pedido não encontrado.",
                },
                {
                    status: 404,
                }
            );
        }

        const txid =
            pedido.sicrediTxid;

        if (!txid) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Pedido ainda não possui TXID Sicredi.",
                },
                {
                    status: 400,
                }
            );
        }

        const baseUrl =
            process.env.SICREDI_BASE_URL!;

        const token =
            await obterToken();

        const response =
            await axios.get(
                `${baseUrl}/api/v2/cob/${txid}`,
                {
                    httpsAgent:
                        criarHttpsAgent(),

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

        const cobranca =
            response.data;

        console.log(
            "CONSULTA SICREDI:",
            JSON.stringify(
                cobranca,
                null,
                2
            )
        );

        const statusSicredi =
            cobranca?.status || "";

        if (
            statusSicredi !==
            "CONCLUIDA"
        ) {
            return NextResponse.json({
                ok: true,

                pago: false,

                status: "pendente",

                mensagem:
                    "Pagamento ainda não confirmado pelo Sicredi.",
            });
        }

        const valorPedido =
            valorEmCentavos(
                pedido.valorTotal
            );

        const pixRecebido =
            Array.isArray(
                cobranca?.pix
            )
                ? cobranca.pix[0]
                : null;

        const valorPago =
            valorEmCentavos(
                pixRecebido?.valor
            );

        if (
            valorPago !==
            valorPedido
        ) {
            return NextResponse.json({
                ok: false,

                pago: false,

                status:
                    "valor_divergente",

                mensagem:
                    "Pagamento recebido com valor diferente do pedido.",

                valorPedido:
                    valorPedido / 100,

                valorPago:
                    valorPago / 100,
            });
        }

        console.log(
            "SICREDI: PAGAMENTO CONFIRMADO. CHAMANDO FINALIZAÇÃO CENTRAL",
            {
                pedidoId,
                txid,
                valorPago:
                    valorPago / 100,
                endToEndId:
                    pixRecebido?.endToEndId ||
                    null,
            }
        );

        const resultado =
            await finalizarPagamento({
                pedidoId,

                formaPagamento:
                    "pix",

                valorPago:
                    valorPago / 100,

                pixEndToEndId:
                    pixRecebido?.endToEndId ||
                    "",

                pixHorario:
                    pixRecebido?.horario ||
                    "",

                sicrediTxid:
                    txid,
            });

        console.log(
            "SICREDI: FINALIZAÇÃO CONCLUÍDA",
            {
                pedidoId,
                resultado,
            }
        );

        return NextResponse.json({
            ok: true,

            pago: true,

            status: "pago",

            mensagem:
                "Pagamento confirmado e ingresso liberado.",

            codigoIngresso:
                resultado.codigoIngresso,

            emailEnviado:
                resultado.emailEnviado,
        });
    } catch (error: any) {
        console.error(
            "ERRO VERIFICAR PAGAMENTO:",
            JSON.stringify(
                error?.response?.data ||
                error?.message,
                null,
                2
            )
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    "Erro ao verificar pagamento Sicredi.",

                details:
                    error?.response?.data ||
                    error?.message,
            },
            {
                status:
                    error?.response?.status ||
                    500,
            }
        );
    }
}