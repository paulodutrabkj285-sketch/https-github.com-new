import { NextRequest, NextResponse } from "next/server";
import https from "https";
import axios from "axios";

import {
    collection,
    getDocs,
    limit,
    query,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
    atualizarPedido,
    Pedido,
} from "@/lib/pedidos";

import {
    finalizarPagamento,
} from "@/lib/finalizar-pagamento";

export const runtime = "nodejs";

/* ==========================================
   CONFIGURAÇÃO HTTPS SICREDI
========================================== */

function criarHttpsAgent() {
    const certBase64 =
        process.env.SICREDI_CERT_BASE64 || "";

    const keyBase64 =
        process.env.SICREDI_KEY_BASE64 || "";

    if (!certBase64 || !keyBase64) {
        throw new Error(
            "Certificado Sicredi não configurado."
        );
    }

    return new https.Agent({
        cert: Buffer.from(
            certBase64,
            "base64"
        ).toString("utf8"),

        key: Buffer.from(
            keyBase64,
            "base64"
        ).toString("utf8"),

        rejectUnauthorized: true,
    });
}

/* ==========================================
   TOKEN SICREDI
========================================== */

async function obterToken() {
    const baseUrl =
        process.env.SICREDI_BASE_URL;

    const clientId =
        process.env.SICREDI_CLIENT_ID;

    const clientSecret =
        process.env.SICREDI_CLIENT_SECRET;

    if (
        !baseUrl ||
        !clientId ||
        !clientSecret
    ) {
        throw new Error(
            "Credenciais Sicredi incompletas."
        );
    }

    const response =
        await axios.post(
            `${baseUrl}/oauth/token`,

            new URLSearchParams({
                grant_type:
                    "client_credentials",
            }).toString(),

            {
                httpsAgent:
                    criarHttpsAgent(),

                headers: {
                    Authorization:
                        "Basic " +
                        Buffer.from(
                            `${clientId}:${clientSecret}`
                        ).toString(
                            "base64"
                        ),

                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },

                timeout: 15000,
            }
        );

    const token =
        response.data?.access_token;

    if (!token) {
        throw new Error(
            "Sicredi não retornou access_token."
        );
    }

    return token;
}

/* ==========================================
   VERIFICAR SE PASSOU DA EXPIRAÇÃO
========================================== */

function passouDaExpiracao(
    pedido: Pedido
) {
    if (!pedido.expiracaoPix) {
        return false;
    }

    const expiracao =
        new Date(
            pedido.expiracaoPix
        ).getTime();

    if (
        !Number.isFinite(
            expiracao
        )
    ) {
        return false;
    }

    return (
        Date.now() >
        expiracao
    );
}

/* ==========================================
   GET - CHAMADO PELO CRON DA VERCEL
========================================== */

export async function GET(
    req: NextRequest
) {
    const inicio =
        new Date().toISOString();

    try {
        /* ======================================
           SEGURANÇA DO CRON
        ====================================== */

        const cronSecret =
            process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error(
                "RECONCILIAÇÃO: CRON_SECRET NÃO CONFIGURADO"
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "CRON_SECRET não configurado.",
                },
                {
                    status: 500,
                }
            );
        }

        const authorization =
            req.headers.get(
                "authorization"
            );

        if (
            authorization !==
            `Bearer ${cronSecret}`
        ) {
            console.warn(
                "RECONCILIAÇÃO: ACESSO NÃO AUTORIZADO"
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Não autorizado.",
                },
                {
                    status: 401,
                }
            );
        }

        console.log(
            "======================================"
        );

        console.log(
            "INICIANDO RECONCILIAÇÃO PIX:",
            inicio
        );

        /* ======================================
           BUSCAR PEDIDOS PENDENTES
        ====================================== */

        const q =
            query(
                collection(
                    db,
                    "pedidos"
                ),

                where(
                    "statusPagamento",
                    "==",
                    "pendente"
                ),

                /*
                 * Evita uma execução enorme.
                 *
                 * Os próximos entram
                 * na rodada seguinte.
                 */
                limit(50)
            );

        const snapshot =
            await getDocs(q);

        const pedidos =
            snapshot.docs.map(
                (documento) => ({
                    id:
                        documento.id,

                    ...documento.data(),
                })
            ) as Pedido[];

        console.log(
            "RECONCILIAÇÃO: PEDIDOS PENDENTES:",
            pedidos.length
        );

        if (
            pedidos.length === 0
        ) {
            return NextResponse.json({
                ok: true,

                inicio,

                fim:
                    new Date()
                        .toISOString(),

                analisados: 0,

                pagosRecuperados:
                    0,

                expirados:
                    0,

                pendentes:
                    0,

                erros:
                    0,

                mensagem:
                    "Nenhum Pix pendente para reconciliar.",
            });
        }

        /* ======================================
           AUTENTICAÇÃO SICREDI
        ====================================== */

        const baseUrl =
            process.env
                .SICREDI_BASE_URL;

        if (!baseUrl) {
            throw new Error(
                "SICREDI_BASE_URL não configurada."
            );
        }

        const token =
            await obterToken();

        /* ======================================
           CONTADORES
        ====================================== */

        let pagosRecuperados =
            0;

        let expirados =
            0;

        let continuamPendentes =
            0;

        let erros =
            0;

        const resultados: any[] =
            [];

        /* ======================================
           PROCESSAR PEDIDOS
        ====================================== */

        for (
            const pedido
            of pedidos
        ) {
            const txid =
                String(
                    pedido.sicrediTxid ||
                    ""
                ).trim();

            /* ==================================
               PEDIDO SEM TXID
            ================================== */

            if (!txid) {
                console.warn(
                    "RECONCILIAÇÃO: PEDIDO SEM TXID",
                    {
                        pedidoId:
                            pedido.id,
                    }
                );

                resultados.push({
                    pedidoId:
                        pedido.id,

                    resultado:
                        "sem_txid",
                });

                continuamPendentes++;

                continue;
            }

            try {
                /* ==================================
                   CONSULTAR SICREDI
                ================================== */

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

                            timeout:
                                15000,
                        }
                    );

                const cobranca =
                    response.data;

                const statusSicredi =
                    String(
                        cobranca?.status ||
                        ""
                    );

                const pixLista =
                    Array.isArray(
                        cobranca?.pix
                    )
                        ? cobranca.pix
                        : [];

                const pixRecebido =
                    pixLista.length > 0
                        ? pixLista[0]
                        : null;

                console.log(
                    "RECONCILIAÇÃO: CONSULTA",
                    {
                        pedidoId:
                            pedido.id,

                        txid,

                        statusSicredi,

                        possuiPix:
                            Boolean(
                                pixRecebido
                            ),
                    }
                );

                /* ==================================
                   PAGAMENTO CONFIRMADO
                ================================== */

                if (
                    statusSicredi ===
                    "CONCLUIDA" ||
                    pixRecebido
                ) {
                    /*
                     * Preferimos o valor recebido
                     * retornado no Pix.
                     *
                     * Caso a resposta de cobrança
                     * não traga o objeto pix,
                     * usamos o valor.original
                     * da própria cobrança.
                     */

                    const valorPago =
                        Number(
                            pixRecebido
                                ?.valor ||
                            cobranca
                                ?.valor
                                ?.original ||
                            pedido
                                .valorTotal ||
                            0
                        );

                    const resultado =
                        await finalizarPagamento(
                            {
                                pedidoId:
                                    pedido.id,

                                formaPagamento:
                                    "pix",

                                valorPago,

                                pixEndToEndId:
                                    String(
                                        pixRecebido
                                            ?.endToEndId ||
                                        ""
                                    ),

                                pixHorario:
                                    String(
                                        pixRecebido
                                            ?.horario ||
                                        ""
                                    ),

                                sicrediTxid:
                                    txid,
                            }
                        );

                    pagosRecuperados++;

                    resultados.push(
                        {
                            pedidoId:
                                pedido.id,

                            txid,

                            resultado:
                                "pagamento_recuperado",

                            status:
                                resultado.status,

                            codigoIngresso:
                                resultado
                                    .codigoIngresso ||
                                null,

                            emailEnviado:
                                resultado
                                    .emailEnviado ??
                                false,
                        }
                    );

                    console.log(
                        "RECONCILIAÇÃO: PAGAMENTO RECUPERADO",
                        {
                            pedidoId:
                                pedido.id,

                            txid,

                            codigoIngresso:
                                resultado
                                    .codigoIngresso,

                            emailEnviado:
                                resultado
                                    .emailEnviado,
                        }
                    );

                    continue;
                }

                /* ==================================
                   NÃO PAGO E PRAZO TERMINOU
                ================================== */

                if (
                    passouDaExpiracao(
                        pedido
                    )
                ) {
                    const agora =
                        new Date()
                            .toISOString();

                    /*
                     * Agora sim podemos expirar.
                     *
                     * Antes disso acabamos
                     * de consultar o Sicredi.
                     */

                    await atualizarPedido(
                        pedido.id,
                        {
                            statusPagamento:
                                "expirado",

                            statusOperacional:
                                "expirado",

                            sicrediStatus:
                                statusSicredi,

                            pixExpiradoEm:
                                agora,

                            reconciliacaoUltimaEm:
                                agora,

                            reconciliacaoResultado:
                                "nao_pago_expirado",
                        }
                    );

                    expirados++;

                    resultados.push(
                        {
                            pedidoId:
                                pedido.id,

                            txid,

                            resultado:
                                "expirado",

                            sicrediStatus:
                                statusSicredi,
                        }
                    );

                    console.log(
                        "RECONCILIAÇÃO: PIX EXPIRADO APÓS CONSULTA",
                        {
                            pedidoId:
                                pedido.id,

                            txid,

                            statusSicredi,
                        }
                    );

                    continue;
                }

                /* ==================================
                   AINDA DENTRO DO PRAZO
                ================================== */

                const agora =
                    new Date()
                        .toISOString();

                await atualizarPedido(
                    pedido.id,
                    {
                        sicrediStatus:
                            statusSicredi,

                        reconciliacaoUltimaEm:
                            agora,

                        reconciliacaoResultado:
                            "aguardando_pagamento",
                    }
                );

                continuamPendentes++;

                resultados.push(
                    {
                        pedidoId:
                            pedido.id,

                        txid,

                        resultado:
                            "aguardando",

                        sicrediStatus:
                            statusSicredi,
                    }
                );
            } catch (
            error: any
            ) {
                erros++;

                const detalhe =
                    error?.response
                        ?.data ||
                    error?.message ||
                    String(error);

                /*
                 * MUITO IMPORTANTE:
                 *
                 * Se a consulta ao Sicredi
                 * der erro, NÃO expiramos
                 * o pedido.
                 *
                 * Ele fica pendente para
                 * tentar novamente na
                 * próxima execução.
                 */

                console.error(
                    "RECONCILIAÇÃO: ERRO NO PEDIDO",
                    {
                        pedidoId:
                            pedido.id,

                        txid,

                        erro:
                            detalhe,
                    }
                );

                try {
                    await atualizarPedido(
                        pedido.id,
                        {
                            reconciliacaoUltimaEm:
                                new Date()
                                    .toISOString(),

                            reconciliacaoResultado:
                                "erro_consulta_sicredi",

                            reconciliacaoErro:
                                typeof detalhe ===
                                    "string"
                                    ? detalhe
                                    : JSON.stringify(
                                        detalhe
                                    ),
                        }
                    );
                } catch (
                updateError
                ) {
                    console.error(
                        "RECONCILIAÇÃO: ERRO AO REGISTRAR FALHA:",
                        updateError
                    );
                }

                resultados.push(
                    {
                        pedidoId:
                            pedido.id,

                        txid,

                        resultado:
                            "erro",
                    }
                );
            }
        }

        /* ======================================
           RESULTADO FINAL
        ====================================== */

        const fim =
            new Date()
                .toISOString();

        console.log(
            "RECONCILIAÇÃO FINALIZADA:",
            {
                inicio,
                fim,

                analisados:
                    pedidos.length,

                pagosRecuperados,

                expirados,

                pendentes:
                    continuamPendentes,

                erros,
            }
        );

        console.log(
            "======================================"
        );

        return NextResponse.json({
            ok: true,

            inicio,

            fim,

            analisados:
                pedidos.length,

            pagosRecuperados,

            expirados,

            pendentes:
                continuamPendentes,

            erros,

            resultados,
        });
    } catch (
    error: any
    ) {
        const detalhe =
            error?.response
                ?.data ||
            error?.message ||
            String(error);

        console.error(
            "ERRO GERAL NA RECONCILIAÇÃO PIX:",
            detalhe
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    "Erro ao reconciliar pagamentos Pix.",

                details:
                    detalhe,
            },
            {
                status: 500,
            }
        );
    }
}

/* ==========================================
   POST OPCIONAL PARA TESTE MANUAL

   Mantém a mesma proteção CRON_SECRET.
========================================== */

export async function POST(
    req: NextRequest
) {
    return GET(req);
}