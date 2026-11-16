const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function cenario(alteracoes = {}) {
  const pedido = {
    id: 'COMBO120-teste', tipo: 'carrinho', produto: 'Carrinho Parque + Elevador',
    statusPagamento: 'pago', statusOperacional: 'utilizado', email: 'teste@example.com',
    quantidade: 2, quantidadeParque: 2, quantidadeElevador: 2,
    codigoIngresso: 'PMN-LEGADO', codigoIngressoParque: 'PMN-PARQUE',
    codigoIngressoElevador: 'PMN-ELEVADOR', qrCodeIngressoElevador: '{"codigo":"PMN-ELEVADOR"}',
    valorUnitarioElevador: 49, valorElevador: 98, valorTotal: 218, valorPago: 218,
    validadoEm: '2026-11-16T10:00:00Z', validadoPor: 'Portaria',
    elevadorValidado: false, elevadorQuantidadeValidada: 0,
    ...alteracoes,
  };
  const inicial = structuredClone(pedido);
  const emails = [], atualizacoes = [];
  const mocks = {
    '@/lib/preco-elevador': { PROMOCAO_PARQUE_ELEVADOR: 'combo-parque-elevador-site-v1' },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/pedidos': {
      buscarPedidoPorId: async () => pedido,
      atualizarPedido: async (id, dados) => { assert.equal(id, pedido.id); atualizacoes.push(dados); Object.assign(pedido, dados); },
    },
    '@/lib/email': {
      enviarIngressoPorEmail: async dados => { emails.push({ tipo: 'parque', ...dados }); return {}; },
      enviarCorrecaoIngressoElevadorPorEmail: async dados => { emails.push({ tipo: 'elevador', ...dados }); return {}; },
    },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/app/api/reenviar-ingresso/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    console: { log() {}, error() {} }, Date,
  })(id => { assert.ok(Object.hasOwn(mocks, id), id); return mocks[id]; }, module, module.exports);
  return { pedido, inicial, emails, atualizacoes,
    reenviar: tipoIngresso => module.exports.POST({ json: async () => ({ pedidoId: pedido.id, tipoIngresso }) }) };
}

function verificarPreservacao(c) {
  for (const dados of c.atualizacoes) {
    assert.ok(Object.keys(dados).every(campo => campo.startsWith('email')), 'Somente metadados de e-mail podem ser alterados');
  }
  for (const campo of Object.keys(c.inicial)) {
    assert.deepEqual(c.pedido[campo], c.inicial[campo], campo);
  }
}

test('combo utilizado reenvia dois ingressos com códigos separados e preserva preços/pagamento/validações', async () => {
  const c = cenario();
  const r = await c.reenviar();
  assert.equal(r.status, 200);
  assert.equal(c.emails.length, 2);
  assert.equal(c.emails[0].codigoIngresso, 'PMN-PARQUE');
  assert.equal(c.emails[1].codigoIngressoElevador, 'PMN-ELEVADOR');
  assert.equal(c.emails[0].quantidade, 2);
  assert.equal(c.emails[1].quantidade, 2);
  verificarPreservacao(c);
});

test('combo antigo aceita codigoIngresso somente para Parque e qtdElevador', async () => {
  const c = cenario({ id: 'antigo', codigoIngressoParque: undefined, quantidadeElevador: undefined, qtdElevador: 3 });
  assert.equal((await c.reenviar()).status, 200);
  assert.equal(c.emails[0].codigoIngresso, 'PMN-LEGADO');
  assert.equal(c.emails[1].codigoIngressoElevador, 'PMN-ELEVADOR');
  assert.equal(c.emails[1].quantidade, 3);
  verificarPreservacao(c);
});

test('COMBO120 é identificado mesmo sem tipo carrinho', async () => {
  const c = cenario({ tipo: 'parque' });
  assert.equal((await c.reenviar()).status, 200);
  assert.equal(c.emails.length, 2);
});

test('combo sem código de Elevador não usa QR nem gera código novo', async () => {
  const c = cenario({ codigoIngressoElevador: undefined });
  const r = await c.reenviar();
  assert.equal(r.status, 500);
  assert.match(r.body.error, /sem codigoIngressoElevador/);
  assert.equal(c.emails.length, 0);
  verificarPreservacao(c);
});

test('seleção de Elevador mantém envio separado', async () => {
  const c = cenario();
  assert.equal((await c.reenviar('elevador')).status, 200);
  assert.equal(c.emails.length, 1);
  assert.equal(c.emails[0].tipo, 'elevador');
  verificarPreservacao(c);
});

test('pedido antigo simples preserva código salvo', async () => {
  const c = cenario({ id: 'antigo', tipo: 'parque', produto: 'Ingresso Parque',
    quantidadeParque: undefined, quantidadeElevador: undefined,
    codigoIngressoParque: undefined, codigoIngressoElevador: undefined });
  assert.equal((await c.reenviar()).status, 200);
  assert.equal(c.emails.length, 1);
  assert.equal(c.emails[0].codigoIngresso, 'PMN-LEGADO');
  verificarPreservacao(c);
});

test('pedido simples sem código não inventa PMN a partir do ID', async () => {
  const c = cenario({ id: 'antigo', tipo: 'parque', quantidadeElevador: undefined,
    codigoIngressoParque: undefined, codigoIngressoElevador: undefined, codigoIngresso: undefined });
  assert.equal((await c.reenviar()).status, 500);
  assert.equal(c.emails.length, 0);
});

test('pedido sem pagamento confirmado continua bloqueado', async () => {
  const c = cenario({ statusPagamento: 'pendente' });
  assert.equal((await c.reenviar()).status, 400);
  assert.equal(c.emails.length, 0);
  verificarPreservacao(c);
});

test('botão usa rota existente', () => {
  const page = fs.readFileSync('src/app/admin/pedidos/[id]/page.tsx', 'utf8');
  assert.ok(page.includes('fetch("/api/reenviar-ingresso"'));
  assert.ok(!page.includes('/api/ingressos/reenviar'));
});
