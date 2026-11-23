const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const test = require("node:test");
const { vendaEfiParaOcultar, previa, aplicar } = require("../scripts/ocultar-vendas-efi.cjs");

function pedidoEfi(pedidoId, campos = {}) {
  return {
    statusPagamento: "pago",
    statusOperacional: "ativo",
    formaPagamento: "pix",
    pixProvider: "efi",
    efiStatus: "CONCLUIDA",
    efiTxid: createHash("sha256").update(`efi-pix-2026-11-18:${pedidoId}`).digest("hex").slice(0, 35),
    pixConfirmadoEm: "2026-11-18T15:00:00.000Z",
    pagamentoConfirmadoEm: "2026-11-18T15:00:00.000Z",
    pixHorario: "2026-11-18T14:59:55.000Z",
    pixEndToEndId: "E-FICTICIO",
    valorPago: 60,
    valorTotal: 60,
    qrCodeIngresso: "QR-FICTICIO",
    emailIngressoEnviado: true,
    ...campos,
  };
}

test("exige assinatura da finalização Efí e descarta outras formas de confirmação", () => {
  const id = "pedido";
  const pedido = pedidoEfi(id, { sicrediTxid: "RESERVADO" });
  assert.ok(vendaEfiParaOcultar(id, pedido));

  for (const campos of [
    { statusPagamento: "pendente" }, { statusPagamento: "reembolsado" }, { pixProvider: "sicredi" }, { efiStatus: "ATIVA", pixProvider: "efi" },
    { efiTxid: "INCORRETO" }, { pixConfirmadoEm: undefined }, { pixHorario: undefined },
    { pixEndToEndId: "" }, { sicrediStatus: "CONCLUIDA", pixProvider: "efi" },
    { pagbankStatus: "PAID" }, { pagbankTransacaoId: "PAGBANK" }, { formaPagamento: "cartao" },
    { cartaoTransacaoId: "CARTAO" }, { origem: "parceiro" }, { agenciaId: "agencia" },
    { reservaAgenciaId: "reserva" }, { cortesia: true }, { ocultarNoAdmin: true },
  ]) {
    assert.equal(vendaEfiParaOcultar(id, { ...pedido, ...campos }), null);
  }
});

test("prévia é somente leitura e a aplicação revalida, altera um campo e pode ser retomada", async () => {
  const pedidos = {
    antigo: pedidoEfi("antigo", { email: "cliente@example.invalid" }),
    alterado: pedidoEfi("alterado"),
    novo: pedidoEfi("novo", { efiStatus: "ATIVA" }),
    fallback: pedidoEfi("fallback", { sicrediStatus: "CONCLUIDA" }),
  };
  const original = structuredClone(pedidos.antigo);
  const alteracoes = [];
  const snapshot = id => ({ id, data: () => pedidos[id] });
  const db = {
    collection(nome) {
      assert.equal(nome, "pedidos");
      const filtros = [];
      return {
        doc: id => id,
        where(...filtro) {
          filtros.push(filtro);
          return this;
        },
        select: () => ({
          stream: async function* () {
            assert.deepEqual(filtros, [
              ["statusPagamento", "==", "pago"],
              ["efiStatus", "==", "CONCLUIDA"],
              ["pixProvider", "==", "efi"],
            ]);
            for (const id of ["antigo", "alterado", "fallback"]) yield snapshot(id);
          },
        }),
      };
    },
    runTransaction: executar => executar({
      get: async id => snapshot(id),
      update: (id, campos) => {
        alteracoes.push({ id, campos });
        Object.assign(pedidos[id], campos);
      },
    }),
  };

  const manifesto = await previa(db, "projeto");
  assert.equal(manifesto.quantidade, 2);
  assert.deepEqual(manifesto.pedidos[0], {
    pedidoId: "antigo", data: original.pixConfirmadoEm, valor: 60,
  });
  assert.deepEqual(alteracoes, []);

  pedidos.alterado.sicrediStatus = "CONCLUIDA";
  pedidos.novo.efiStatus = "CONCLUIDA";
  assert.deepEqual(await aplicar(db, manifesto.pedidos), { marcados: 1, ignorados: 1 });
  assert.deepEqual(alteracoes, [{ id: "antigo", campos: { ocultarNoAdmin: true } }]);
  assert.deepEqual(pedidos.antigo, { ...original, ocultarNoAdmin: true });
  assert.equal(pedidos.novo.ocultarNoAdmin, undefined);
  assert.deepEqual(await aplicar(db, manifesto.pedidos), { marcados: 0, ignorados: 2 });
});
