const { createHash, timingSafeEqual } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const { parseArgs } = require("node:util");

const campos = [
  "ocultarNoAdmin", "statusPagamento", "formaPagamento", "pixProvider", "efiStatus", "efiTxid",
  "pixConfirmadoEm", "pagamentoConfirmadoEm", "pixEndToEndId", "pixHorario", "valorPago",
  "sicrediStatus", "pagbankStatus", "pagbankTransacaoId", "cartaoTransacaoId",
  "origem", "agenciaId", "reservaAgenciaId", "cortesia",
];

function vendaEfiParaOcultar(pedidoId, pedido) {
  if (!pedido || pedido.ocultarNoAdmin === true ||
    pedido.statusPagamento !== "pago" || pedido.pixProvider !== "efi" ||
    pedido.formaPagamento !== "pix" || pedido.efiStatus !== "CONCLUIDA" ||
    pedido.origem === "parceiro" || pedido.agenciaId || pedido.reservaAgenciaId ||
    pedido.cortesia === true || pedido.sicrediStatus === "CONCLUIDA" ||
    pedido.pagbankStatus === "PAID" || pedido.pagbankTransacaoId || pedido.cartaoTransacaoId) {
    return null;
  }

  // Mesmo TXID determinístico usado desde a introdução da Efí.
  const txid = createHash("sha256").update(`efi-pix-2026-11-18:${pedidoId}`).digest("hex").slice(0, 35);
  // O checkout antigo também podia gravar efiStatus antes da finalização.
  // Exigir os campos gravados juntos no recebimento e excluir sinais de outro provedor.
  if (pedido.efiTxid !== txid ||
    typeof pedido.pixEndToEndId !== "string" || !pedido.pixEndToEndId.trim() ||
    typeof pedido.pixHorario !== "string" || !Number.isFinite(Date.parse(pedido.pixHorario)) ||
    typeof pedido.pixConfirmadoEm !== "string" || !Number.isFinite(Date.parse(pedido.pixConfirmadoEm)) ||
    pedido.pixConfirmadoEm !== pedido.pagamentoConfirmadoEm ||
    !Number.isFinite(pedido.valorPago) || pedido.valorPago <= 0) {
    return null;
  }

  return { pedidoId, data: pedido.pixConfirmadoEm, valor: pedido.valorPago };
}

async function previa(db, projeto) {
  const pedidos = [];
  const consulta = db.collection("pedidos")
    .where("statusPagamento", "==", "pago")
    .where("efiStatus", "==", "CONCLUIDA")
    .where("pixProvider", "==", "efi")
    .select(...campos);
  for await (const documento of consulta.stream()) {
    const venda = vendaEfiParaOcultar(documento.id, documento.data());
    if (venda) pedidos.push(venda);
  }
  return { projeto, quantidade: pedidos.length, pedidos };
}

function manifestoValido(manifesto, projeto) {
  if (manifesto?.projeto !== projeto || !Array.isArray(manifesto.pedidos) ||
    manifesto.quantidade !== manifesto.pedidos.length) return false;

  const ids = new Set();
  for (const pedido of manifesto.pedidos) {
    if (typeof pedido?.pedidoId !== "string" || !pedido.pedidoId ||
      pedido.pedidoId.includes("/") || [".", ".."].includes(pedido.pedidoId) ||
      ids.has(pedido.pedidoId) ||
      typeof pedido.data !== "string" || !Number.isFinite(Date.parse(pedido.data)) ||
      !Number.isFinite(pedido.valor) || pedido.valor <= 0) return false;
    ids.add(pedido.pedidoId);
  }
  return true;
}

async function aplicar(db, pedidos) {
  let marcados = 0;
  for (const pedido of pedidos) {
    const atualizado = await db.runTransaction(async (tx) => {
      const ref = db.collection("pedidos").doc(pedido.pedidoId);
      const snap = await tx.get(ref);
      const venda = vendaEfiParaOcultar(snap.id, snap.data());
      if (!venda || venda.data !== pedido.data || venda.valor !== pedido.valor) return false;
      tx.update(ref, { ocultarNoAdmin: true });
      return true;
    });
    if (atualizado) marcados++;
  }
  return { marcados, ignorados: pedidos.length - marcados };
}

function autorizarAplicacao(token, segredo) {
  if (!token || !segredo) return false;
  const hash = valor => createHash("sha256").update(valor).digest();
  return timingSafeEqual(hash(token), hash(segredo));
}

async function executar() {
  const { values } = parseArgs({
    options: {
      project: { type: "string" },
      preview: { type: "boolean" },
      apply: { type: "string" },
    },
  });
  const { project, preview = false, apply } = values;
  if (!project || apply === "" || (preview && apply)) {
    throw new Error("Use --project PROJETO para a prévia ou acrescente --apply ARQUIVO_DA_PREVIA para aplicar.");
  }
  if (apply && !autorizarAplicacao(process.env.BACKFILL_ADMIN_TOKEN, process.env.CRON_SECRET)) {
    throw new Error("Aplicação negada. Informe o token administrativo em BACKFILL_ADMIN_TOKEN.");
  }
  const manifesto = apply ? JSON.parse(await readFile(apply, "utf8")) : null;
  if (apply && !manifestoValido(manifesto, project)) {
    throw new Error("A prévia é inválida ou pertence a outro projeto.");
  }

  const { applicationDefault, deleteApp, initializeApp } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  const credencial = applicationDefault();
  const app = initializeApp({ credential: credencial, projectId: project });
  try {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      try {
        await credencial.getAccessToken();
      } catch {
        throw new Error("Credenciais padrão do Google (ADC) indisponíveis. Configure acesso ao projeto Firestore.");
      }
    }
    const db = getFirestore(app);
    const resultado = !apply ? await previa(db, project) : await aplicar(db, manifesto.pedidos);
    console.log(JSON.stringify(resultado, null, 2));
  } finally {
    await deleteApp(app);
  }
}

if (require.main === module) {
  executar().catch((erro) => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}

module.exports = { vendaEfiParaOcultar, previa, aplicar };
