import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { collection, doc, getDocs, limit, orderBy, query, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { finalizarPagamento } from "@/lib/finalizar-pagamento";

export const runtime = "nodejs";
export const maxDuration = 60;

const LIMITE_LEITURA_RECENTE = 30;
const LIMITE_CONSULTAS_BANCARIAS = 10;

function pedidoPixElegivel(pedido: Record<string, any>) {
    const statusPagamento = String(pedido.statusPagamento || "");
    const statusOperacional = String(pedido.statusOperacional || "");
    const temTxid = Boolean(String(pedido.efiTxid || "").trim() || String(pedido.sicrediTxid || "").trim());
    return ["pendente", "expirado"].includes(statusPagamento) &&
        statusOperacional !== "bloqueado" &&
        pedido.formaPagamento !== "cartao" &&
        temTxid;
}

function pedidoCartaoRecuperavel(pedido: Record<string, any>) {
    const statusPagamento = String(pedido.statusPagamento || "");
    const statusOperacional = String(pedido.statusOperacional || "");
    const valor = Number(pedido.cartaoValorAprovado);
    return ["pendente", "expirado"].includes(statusPagamento) &&
        statusOperacional !== "bloqueado" &&
        pedido.formaPagamento === "cartao" &&
        pedido.cartaoGateway === "sicredi-ipg" &&
        pedido.cartaoAprovadoPeloIpg === true &&
        pedido.cartaoAprovacaoPendenteFinalizacao === true &&
        pedido.cartaoStatus === "aprovado_pendente_finalizacao" &&
        typeof pedido.cartaoTransacaoId === "string" &&
        Boolean(pedido.cartaoTransacaoId.trim()) &&
        Number.isFinite(valor) && valor > 0 &&
        Math.round(valor * 100) === Math.round(Number(pedido.valorTotal || 0) * 100);
}

function pedidoElegivel(pedido: Record<string, any>) {
    return pedidoPixElegivel(pedido) || pedidoCartaoRecuperavel(pedido);
}

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET não configurado." }, { status: 500 });
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const inicio = Date.now();
    const owner = randomUUID();
    const ref = doc(db, "integracoes", "sicredi_pagamentos_reconciliacao");
    let adquirido = false;
    let offsetAnterior = 0;
    let proximoOffset = 0;
    let lidos = 0;
    let elegiveisTotal = 0;
    let analisados = 0;
    let pagosRecuperados = 0;
    let pendentes = 0;
    let erros = 0;
    const resultados: Array<{ pedidoId: string; resultado: string }> = [];

    try {
        const estado = await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            const atual = snap.data();
            if (Number(atual?.leaseAte || 0) > Date.now()) return null;
            tx.set(ref, { owner, leaseAte: Date.now() + 90000 }, { merge: true });
            return { offset: Math.max(0, Number(atual?.recentOffset || 0)) };
        });

        if (!estado) return NextResponse.json({ ok: true, mensagem: "Conciliação já em execução." });
        adquirido = true;
        offsetAnterior = estado.offset;

        // Prioriza pedidos recentes para recuperar Pix sem webhook e cartão Sicredi aprovado cuja finalização caiu.
        // A consulta lê no máximo 30 documentos e consulta o banco para no máximo 10 por rodada.
        const pagina = await getDocs(query(
            collection(db, "pedidos"),
            orderBy("createdAt", "desc"),
            limit(LIMITE_LEITURA_RECENTE)
        ));
        lidos = pagina.size;

        const elegiveis = pagina.docs.filter((documento) => pedidoElegivel(documento.data()));
        elegiveisTotal = elegiveis.length;

        if (elegiveis.length > 0) {
            const inicioRodizio = offsetAnterior % elegiveis.length;
            const quantidade = Math.min(LIMITE_CONSULTAS_BANCARIAS, elegiveis.length);
            const selecionados = Array.from({ length: quantidade }, (_, indice) =>
                elegiveis[(inicioRodizio + indice) % elegiveis.length]
            );
            proximoOffset = (inicioRodizio + quantidade) % elegiveis.length;

            for (const documento of selecionados) {
                const pedido = documento.data();
                if (!pedidoElegivel(pedido)) continue;
                try {
                    const cartao = pedidoCartaoRecuperavel(pedido);
                    const finalizacao = cartao
                        ? await finalizarPagamento({
                            pedidoId: documento.id,
                            formaPagamento: "cartao",
                            valorPago: Number(pedido.cartaoValorAprovado),
                            cartaoTransacaoId: String(pedido.cartaoTransacaoId),
                            cartaoAutorizacao: String(
                                pedido.cartaoAutorizacao ||
                                pedido.sicrediCartaoApprovalCode ||
                                ""
                            ),
                            cartaoStatus: "aprovado",
                            cartaoUltimosDigitos: String(pedido.cartaoUltimosDigitos || ""),
                            cartaoParcelas: Number(pedido.cartaoParcelas || 1),
                        })
                        : await finalizarPagamento({
                            pedidoId: documento.id,
                            formaPagamento: "pix",
                        });

                    analisados++;
                    resultados.push({
                        pedidoId: documento.id,
                        resultado: finalizacao.status,
                    });

                    if (finalizacao.ok) {
                        pagosRecuperados++;
                        if (cartao) {
                            await runTransaction(db, async (tx) => {
                                const refPedido = doc(db, "pedidos", documento.id);
                                const snap = await tx.get(refPedido);
                                if (!snap.exists()) return;
                                const atual = snap.data();
                                if (atual.cartaoAprovadoPeloIpg === true &&
                                    atual.cartaoTransacaoId === pedido.cartaoTransacaoId) {
                                    tx.update(refPedido, {
                                        cartaoStatus: "aprovado",
                                        cartaoAprovacaoPendenteFinalizacao: false,
                                        cartaoRecuperadoEm: new Date().toISOString(),
                                    });
                                }
                            });
                        }
                    } else if (finalizacao.status === "banco_nao_confirmado") {
                        pendentes++;
                    } else {
                        erros++;
                    }
                } catch {
                    analisados++;
                    erros++;
                    resultados.push({
                        pedidoId: documento.id,
                        resultado: pedidoCartaoRecuperavel(pedido)
                            ? "erro_recuperacao_cartao"
                            : "erro_consulta_pix",
                    });
                }
            }
        }

        return NextResponse.json({
            ok: true,
            inicio: new Date(inicio).toISOString(),
            fim: new Date().toISOString(),
            lidos,
            elegiveis: elegiveisTotal,
            analisados,
            pagosRecuperados,
            pendentes,
            erros,
            proximoOffset,
            resultados,
        });
    } catch (error) {
        console.error("ERRO RECONCILIAÇÃO PAGAMENTOS:", error instanceof Error ? error.message : "Erro desconhecido");
        return NextResponse.json({ ok: false, error: "Erro ao reconciliar Pix. A próxima execução tentará novamente." }, { status: 500 });
    } finally {
        if (adquirido) {
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (snap.data()?.owner === owner) {
                    tx.set(ref, { recentOffset: proximoOffset, leaseAte: 0 }, { merge: true });
                }
            }).catch(() => { /* O lease vence automaticamente se a liberação falhar. */ });
        }
    }
}

export async function POST(req: NextRequest) { return GET(req); }
