import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { collection, doc, documentId, getDocs, limit, orderBy, query, runTransaction, startAfter, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { finalizarPagamento } from "@/lib/finalizar-pagamento";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET não configurado." }, { status: 500 });
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    const inicio = Date.now();
    const owner = randomUUID();
    const ref = doc(db, "integracoes", "sicredi_pix_reconciliacao");
    let adquirido = false;
    let cursor = "";
    let analisados = 0, pagosRecuperados = 0, pendentes = 0, erros = 0;
    const resultados = [];
    try {
        const estado = await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            const atual = snap.data();
            if (Number(atual?.leaseAte || 0) > Date.now()) return null;
            tx.set(ref, { owner, leaseAte: Date.now() + 120000 }, { merge: true });
            return { cursor: typeof atual?.cursor === "string" ? atual.cursor : "" };
        });
        if (!estado) return NextResponse.json({ ok: true, mensagem: "Conciliação já em execução." });
        adquirido = true;
        cursor = estado.cursor;
        let concluido = false;
        // Cursor por ID, nunca offset: mudar o status de um documento não desloca a próxima página.
        // O checkpoint inclui pedidos sem TXID e falhas, evitando bloquear a fila.
        while (analisados < 1000 && Date.now() - inicio < 20000) {
            const pagina = await getDocs(query(collection(db, "pedidos"),
                where("statusPagamento", "in", ["pendente", "expirado"]),
                orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(50)));
            if (pagina.empty) { cursor = ""; concluido = true; break; }
            for (const documento of pagina.docs) {
                if (analisados >= 1000 || Date.now() - inicio >= 20000) break;
                const pedido = documento.data();
                const txid = String(pedido.sicrediTxid || "").trim();
                let resultado = "sem_txid";
                if (txid && pedido.formaPagamento !== "cartao") {
                    try {
                        const finalizacao = await finalizarPagamento({ pedidoId: documento.id, formaPagamento: "pix", sicrediTxid: txid });
                        resultado = finalizacao.status;
                        if (finalizacao.ok) pagosRecuperados++;
                        else if (finalizacao.status === "banco_nao_confirmado") pendentes++;
                        else erros++;
                    } catch { resultado = "erro_consulta_sicredi"; erros++; }
                } else { pendentes++; }
                // Não expirar nem rebaixar status por relógio local ou resposta de erro.
                // A API central recupera expirados somente com prova bancária válida.
                cursor = documento.id;
                await runTransaction(db, async (tx) => {
                    const snap = await tx.get(ref);
                    if (snap.data()?.owner !== owner) throw new Error("Lease da conciliação perdida.");
                    tx.set(ref, { cursor, leaseAte: Date.now() + 120000 }, { merge: true });
                });
                analisados++;
                resultados.push({ pedidoId: documento.id, resultado });
            }
        }
        // Reinício somente ao alcançar o fim; a próxima execução retoma o checkpoint.
        if (concluido) await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (snap.data()?.owner !== owner) throw new Error("Lease da conciliação perdida.");
            tx.set(ref, { cursor: "" }, { merge: true });
        });
        return NextResponse.json({ ok: true, inicio: new Date(inicio).toISOString(), fim: new Date().toISOString(),
            analisados, pagosRecuperados, expirados: 0, pendentes, erros, concluido, proximoCursor: cursor || null, resultados });
    } catch (error) {
        console.error("ERRO RECONCILIAÇÃO PIX:", error instanceof Error ? error.message : "Erro desconhecido");
        return NextResponse.json({ ok: false, error: "Erro ao reconciliar Pix. O checkpoint será retomado." }, { status: 500 });
    } finally {
        if (adquirido) {
            await runTransaction(db, async (tx) => {
                const snap = await tx.get(ref);
                if (snap.data()?.owner === owner) tx.set(ref, { leaseAte: 0 }, { merge: true });
            }).catch(() => { /* Em caso de falha, o lease vence automaticamente. */ });
        }
    }
}

export async function POST(req: NextRequest) { return GET(req); }
