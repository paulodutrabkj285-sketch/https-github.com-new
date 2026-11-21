import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { finalizarPagamento, pedidoEncerraRecuperacaoPix } from "@/lib/finalizar-pagamento";

type AlvoPix = {
    pedidoId: string;
    provider: "efi" | "sicredi";
    txid: string;
    efiEndToEndId?: string;
};

const atrasosMs = [2000, 8000];

export async function recuperarPix(
    { pedidoId, provider, txid, efiEndToEndId }: AlvoPix,
    prazo: number
) {
    // Sicredi pode gastar até 15 s no OAuth e 15 s na consulta.
    const margemConsulta = provider === "efi" ? 12000 : 34000;
    if (Date.now() + atrasosMs[0] + margemConsulta >= prazo) return;

    const campoTxid = provider === "efi" ? "efiTxid" : "sicrediTxid";
    const campoRecuperacao = provider === "efi" ? "pixRecuperacaoEfiTxid" : "pixRecuperacaoSicrediTxid";
    const referencia = doc(db, "pedidos", pedidoId);

    // Uma sequência por TXID, inclusive quando a entrega é repetida em outra instância.
    const reservada = await runTransaction(db, async tx => {
        const pedido = (await tx.get(referencia)).data();
        if (!pedido || pedidoEncerraRecuperacaoPix(pedido) ||
            pedido[campoTxid] !== txid || pedido[campoRecuperacao] === txid) return false;
        tx.update(referencia, { [campoRecuperacao]: txid });
        return true;
    }).catch(() => false);
    if (!reservada) return;

    for (const atraso of atrasosMs) {
        if (Date.now() + atraso + margemConsulta >= prazo) return;
        await new Promise(resolve => setTimeout(resolve, atraso));
        try {
            const resultado = await finalizarPagamento({
                pedidoId,
                formaPagamento: "pix",
                recuperacaoPix: true,
                ...(provider === "efi" ? { efiTxid: txid, efiEndToEndId } : { sicrediTxid: txid }),
            });
            if (resultado.status !== "banco_nao_confirmado") return;
        } catch {
            // A próxima tentativa relê o pedido antes de consultar o banco.
        }
    }
}
