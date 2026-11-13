const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

// Executa os módulos reais com banco, navegador e transportes substituídos.
// Não consulta produção, cobra, emite mensagens ou altera pedidos reais.
function carregar(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    Buffer, URL, URLSearchParams, Date, Intl, Set, console: { log() {}, error() {}, warn() {} },
    process: { env: { CRON_SECRET: 'segredo-exclusivo-dos-testes', NODE_ENV: 'test' } }, ...globals,
  })(id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === 'node:crypto' || id === 'crypto') return crypto;
    if (id === 'server-only') return {};
    throw new Error(`Dependência externa não simulada: ${id}`);
  }, module, module.exports);
  return module.exports;
}

const preco = carregar('src/lib/preco-elevador.ts');
const servidor = carregar('src/lib/combo-parque-elevador-server.ts', { './preco-elevador': preco });
const preparar = carregar('src/lib/preparar-pedido.ts', { './preco-elevador': preco });
const next = { NextResponse: {
  json: (body, options) => ({ body, status: options?.status || 200 }),
  redirect: url => ({ url: url.toString(), headers: new Map(), cookies: {
    set(name, value, options) { this[name] = { value, options }; },
  } }),
} };

const dados = {
  nome: 'Visitante Teste', telefone: '48999999999', email: 'teste@example.invalid',
  tipoDocumento: 'cpf', cpf: '12345678901', documento: '12345678901',
  dataVisita: '2999-01-01', quantidade: 1, quantidadeParque: 1, quantidadeElevador: 1,
  aceiteNaturalExtremo: true,
};

function cenario() {
  const pedidos = new Map();
  const atualizacoes = [];
  const firestore = {
    doc: (_db, _collection, id) => ({ id }),
    runTransaction: async (_db, fn) => fn({
      get: async ref => ({ exists: () => pedidos.has(ref.id), data: () => pedidos.get(ref.id) }),
      set: (ref, pedido) => pedidos.set(ref.id, structuredClone(pedido)),
      update: (ref, update) => { atualizacoes.push(update); Object.assign(pedidos.get(ref.id), update); },
    }),
    updateDoc: async (ref, update) => { atualizacoes.push(update); Object.assign(pedidos.get(ref.id), update); },
  };
  const route = carregar('src/app/api/ingressos/combo/route.ts', {
    'next/server': next, 'firebase/firestore': firestore, '@/lib/firebase': { db: {} },
    '@/lib/preparar-pedido': preparar, '@/lib/preco-elevador': preco,
    '@/lib/combo-parque-elevador-server': servidor,
  });
  const request = (body = dados, token, path = '/api/ingressos/combo', origin = 'https://parque.test') => ({
    url: 'https://parque.test' + path, nextUrl: new URL('https://parque.test' + path),
    headers: { get: name => name === 'origin' ? origin : null },
    cookies: { get: () => token ? { value: token } : undefined }, json: async () => body,
  });
  async function criar(body = dados) {
    const inicio = await route.GET(request());
    const token = inicio.cookies[servidor.COOKIE_COMBO].value;
    const resposta = await route.POST(request(body, token));
    assert.equal(resposta.status, 200);
    const pedidoId = resposta.body.pedidoId;
    return { pedidoId, pedido: pedidos.get(pedidoId), token };
  }
  return { pedidos, atualizacoes, firestore, route, request, criar };
}

test('CTA emite cookie HttpOnly assinado; query e cookie forjado não autorizam desconto', async () => {
  const c = cenario();
  const inicio = await c.route.GET(c.request());
  const cookie = inicio.cookies[servidor.COOKIE_COMBO];
  assert.equal(inicio.url, 'https://parque.test/ingressos/parque?combo=parque-elevador');
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, 'lax');
  assert.equal((await c.route.GET(c.request(dados, undefined, '/api/ingressos/combo?verificar=1'))).status, 403);
  assert.equal((await c.route.POST(c.request(dados))).status, 403);
  assert.equal((await c.route.POST(c.request(dados, cookie.value.replace(/.$/, 'x')))).status, 403);
  assert.equal((await c.route.POST(c.request(dados, cookie.value, undefined, 'https://outro.test'))).status, 403);
  assert.equal((await c.route.GET(c.request(dados, cookie.value, '/api/ingressos/combo?verificar=1'))).status, 200);
  assert.equal(c.pedidos.size, 0);
});

test('autorização expira; segredo ausente nunca concede a promoção', () => {
  const token = servidor.iniciarAutorizacaoCombo();
  class Depois extends Date { static now() { return Date.now() + 2 * 60 * 60 * 1000; } }
  const expirado = carregar('src/lib/combo-parque-elevador-server.ts', { './preco-elevador': preco }, { Date: Depois });
  assert.equal(expirado.lerAutorizacaoCombo(token), null);
  const semSegredo = carregar('src/lib/combo-parque-elevador-server.ts', { './preco-elevador': preco }, { process: { env: {} } });
  assert.throws(() => semSegredo.iniciarAutorizacaoCombo());
  assert.equal(semSegredo.pedidoComboValidoNoServidor('ANTIGO', { valorTotal: 60 }), true);
});

test('servidor ignora preços, status, origem, cortesia e códigos enviados pelo navegador', async () => {
  const c = cenario();
  const { pedido, pedidoId, token } = await c.criar({ ...dados,
    valorTotal: 1, valorParque: 0, valorElevador: 1, valorUnitario: 0, valorUnitarioElevador: 1,
    origem: 'parceiro', cortesia: true, statusPagamento: 'pago', codigoIngressoElevador: 'FORJADO',
  });
  assert.equal(pedido.valorTotal, 120);
  assert.equal(pedido.valorParque, 60);
  assert.equal(pedido.valorElevador, 60);
  assert.equal(pedido.valorUnitarioElevador, 60);
  assert.equal(pedido.origem, 'site');
  assert.equal(pedido.cortesia, undefined);
  assert.equal(pedido.statusPagamento, 'pendente');
  assert.equal(pedido.tipo, 'carrinho');
  assert.equal(pedido.promocao, preco.PROMOCAO_PARQUE_ELEVADOR);
  assert.equal(pedido.quantidadeParque, 1);
  assert.equal(pedido.quantidadeElevador, 1);
  assert.notEqual(pedido.codigoIngressoParque, pedido.codigoIngressoElevador);
  assert.notEqual(pedido.codigoIngressoElevador, 'FORJADO');
  assert.equal(pedido.itensCarrinho.length, 2);
  assert(pedido.itensCarrinho.every(item => item.valorUnitario === 60 && item.valorTotal === 60));
  assert.equal(servidor.pedidoComboValidoNoServidor(pedidoId, pedido), true);
  const repetido = await c.route.POST(c.request(dados, token));
  assert.equal(repetido.body.pedidoId, pedidoId);
  assert.equal(c.pedidos.size, 1);
  assert.equal(c.pedidos.get(pedidoId).codigoIngressoElevador, pedido.codigoIngressoElevador);
});

test('combos múltiplos custam R$ 120 por par; dados e quantidades inválidas não geram pedidos', async () => {
  const c = cenario();
  const { pedido } = await c.criar({ ...dados, quantidade: 2, quantidadeParque: 2, quantidadeElevador: 2 });
  assert.equal(pedido.valorTotal, 240);
  for (const alteracao of [{ quantidade: 0 }, { quantidade: 1.5 }, { quantidadeElevador: 2 },
    { quantidadeParque: 0 }, { aceiteNaturalExtremo: false }, { email: 'invalido' },
    { dataVisita: '2020-01-01' }, { dataVisita: '2999-02-30' }, { cpf: '123' }]) {
    const token = servidor.iniciarAutorizacaoCombo();
    assert.equal((await c.route.POST(c.request({ ...dados, ...alteracao }, token))).status, 400);
  }
  assert.equal(c.pedidos.size, 1);
});

test('assinatura bloqueia adulteração no pedido salvo e não é transferível a outro pedido', async () => {
  const { pedido, pedidoId } = await cenario().criar();
  for (const alteracao of [{ valorTotal: 1 }, { valorElevador: 75 }, { valorUnitarioElevador: 75 },
    { quantidadeParque: 2 }, { quantidadeElevador: 2 }, { quantidade: 2 }, { origem: 'parceiro' },
    { cortesia: true }, { tipo: 'elevador' }, { promocao: '' }, { comboAssinatura: '' },
    { codigoIngressoElevador: pedido.codigoIngressoParque }]) {
    assert.equal(servidor.pedidoComboValidoNoServidor(pedidoId, { ...pedido, ...alteracao }), false);
  }
  assert.equal(servidor.pedidoComboValidoNoServidor('COMBO120-outro', pedido), false);
  assert.equal(servidor.pedidoComboValidoNoServidor('ID-COMUM', pedido), false);
});

test('Pix e cartão finalizam combo por R$ 120, mantendo os dois códigos e QRs', async () => {
  for (const formaPagamento of ['pix', 'cartao']) {
    const c = cenario();
    const { pedido, pedidoId } = await c.criar();
    pedido.sicrediTxid = 'TX-COMBO-TESTE';
    const envios = [];
    const finalizar = carregar('src/lib/finalizar-pagamento.ts', {
      '@/lib/preco-elevador': preco, '@/lib/combo-parque-elevador-server': servidor,
      '@/lib/firebase': { db: {} }, 'firebase/firestore': c.firestore,
      '@/lib/pedidos': { buscarPedidoPorId: async id => ({ ...c.pedidos.get(id), id }),
        atualizarPedido: async (id, update) => Object.assign(c.pedidos.get(id), update) },
      '@/lib/email': { enviarIngressoPorEmail: async data => { envios.push(data); return {}; } },
      '@/lib/sicredi-pix': { consultarPixConfirmado: async () => ({ valor: 120,
        endToEndId: 'E-COMBO', horario: '2026-11-13T12:00:00Z' }) },
      '@/lib/pagbank-notificacao': {},
    });
    const res = await finalizar.finalizarPagamento({ pedidoId, formaPagamento,
      ...(formaPagamento === 'cartao' ? { valorPago: 120, cartaoStatus: 'aprovado', cartaoTransacaoId: 'TRANSACAO-FICTICIA' } : {}) });
    assert.equal(res.status, 'pago');
    const salvo = c.pedidos.get(pedidoId);
    assert.equal(salvo.valorPago, 120);
    assert.equal(salvo.valorTotal, 120);
    assert.equal(salvo.valorUnitarioElevador, 60);
    assert.equal(salvo.qrCodeIngressoParque, pedido.codigoIngressoParque);
    assert.equal(salvo.qrCodeIngressoElevador, pedido.codigoIngressoElevador);
    assert.equal(salvo.quantidadeParque, 1);
    assert.equal(salvo.quantidadeElevador, 1);
    assert.equal(envios.length, 2);
    assert.equal(servidor.pedidoComboValidoNoServidor(pedidoId, salvo), true);
  }
});

test('rotas de cobrança recusam combo salvo adulterado antes de acessar o provedor', async () => {
  const { pedido, pedidoId } = await cenario().criar();
  let chamadasExternas = 0;
  const proibido = () => { chamadasExternas++; throw new Error('Provedor não deve ser chamado'); };
  const pedidos = { buscarPedidoPorId: async () => ({ ...pedido, valorTotal: 1 }), atualizarPedido: proibido };
  const comum = { 'next/server': next, '@/lib/pedidos': pedidos,
    '@/lib/preco-elevador': preco, '@/lib/combo-parque-elevador-server': servidor };
  const pix = carregar('src/app/api/sicredi/criar-pix/route.ts', {
    ...comum, https: {}, axios: { post: proibido, get: proibido, put: proibido },
  });
  const cartao = carregar('src/app/api/sicredi/cartao/pagar/route.ts', {
    ...comum, '@/lib/sicredi-ipg': { somenteDigitos: value => String(value || '').replace(/\D/g, ''),
      validarNumeroCartao: () => true, validarValidadeCartao: () => true, validarCvv: () => true,
      criarXmlVendaCartao: proibido, enviarSoapIpg: proibido, obterConfiguracaoIpg: proibido },
    '../../../../../lib/finalizar-pagamento': { finalizarPagamento: proibido },
  }, { process: { env: { SICREDI_IPG_CARTAO_ATIVO: 'true' } } });
  const pagbank = carregar('src/app/api/pagbank/criar-checkout/route.ts', comum, { fetch: proibido });
  const req = { url: 'https://parque.test/api/pagar', headers: { get: () => 'parque.test' },
    nextUrl: new URL('https://parque.test/api/pagar'), json: async () => ({ pedidoId,
      nome: dados.nome, cpf: dados.cpf, email: dados.email, produto: 'Combo', valorTotal: 1 }) };
  for (const route of [pix, cartao, pagbank]) assert.equal((await route.POST(req)).status, 400);
  assert.equal(chamadasExternas, 0);
});

test('compras normais, parceiros e cortesias mantêm a preparação e preços existentes', () => {
  const base = { produto: 'Ingresso Parque', tipo: 'ingresso', quantidade: 1, valorUnitario: 60,
    quantidadeParque: 1, quantidadeElevador: 1, valorParque: 60, valorElevador: 75, valorTotal: 135 };
  assert.equal(preparar.prepararPedido(base).valorTotal, 135);
  assert.equal(preparar.prepararPedido({ ...base, quantidadeElevador: 0, valorTotal: 60 }).valorTotal, 60);
  assert.equal(preparar.prepararPedido({ produto: 'Elevador Panorâmico', tipo: 'elevador',
    quantidade: 1, valorUnitario: 75, valorTotal: 75 }).valorTotal, 75);
  assert.equal(preparar.prepararPedido({ ...base, origem: 'parceiro', valorParque: 40, valorElevador: 50 }).valorTotal, 90);
  const cortesia = preparar.prepararPedido({ ...base, cortesia: true, valorParque: 0, valorElevador: 0, valorTotal: 0 });
  assert.equal(cortesia.valorTotal, 0);
  assert.equal(cortesia.qrCodeIngressoParque, cortesia.codigoIngressoParque);
  assert.equal(cortesia.qrCodeIngressoElevador, cortesia.codigoIngressoElevador);
  assert.equal(cortesia.expiracaoPix, undefined);
  assert.equal(servidor.pedidoComboValidoNoServidor('PARCEIRO-ANTIGO', { ...base, origem: 'parceiro' }), true);
  assert.equal(servidor.pedidoComboValidoNoServidor('CORTESIA-ANTIGA', cortesia), true);
});

test('correção legada ignora novos combos e mantém o tratamento de pedidos antigos', async () => {
  const { pedido, pedidoId } = await cenario().criar();
  const alterados = [];
  const rota = carregar('src/app/api/corrigir-preco-elevador/route.ts', {
    'next/server': next, '@/lib/preco-elevador': preco, '@/lib/pedidos': {
      listarPedidos: async () => [
        { ...pedido, id: pedidoId, statusPagamento: 'pago' },
        { ...pedido, id: 'ANTIGO', promocao: undefined, statusPagamento: 'pago', valorTotal: 135 },
      ],
      atualizarPedido: async (id, update) => alterados.push({ id, ...update }),
    },
  });
  const res = await rota.POST({ json: async () => ({ confirmar: true }) });
  assert.equal(res.status, 200);
  assert.equal(alterados.length, 1);
  assert.equal(alterados[0].id, 'ANTIGO');
  assert.equal(alterados[0].valorUnitarioElevador, 75);
});

test('reenvio mantém R$ 60 no novo combo, R$ 75 no antigo e códigos separados', async () => {
  const { pedido, pedidoId } = await cenario().criar();
  for (const promocional of [true, false]) {
    const salvo = { ...pedido, id: promocional ? pedidoId : 'ANTIGO', statusPagamento: 'pago',
      promocao: promocional ? preco.PROMOCAO_PARQUE_ELEVADOR : undefined,
      valorTotal: promocional ? 120 : 135, valorUnitarioElevador: promocional ? 60 : 75,
      valorElevador: promocional ? 60 : 75 };
    const envios = [];
    const rota = carregar('src/app/api/reenviar-ingresso/route.ts', {
      'next/server': next, '@/lib/preco-elevador': preco,
      '@/lib/pedidos': { buscarPedidoPorId: async () => salvo,
        atualizarPedido: async (_id, update) => Object.assign(salvo, update) },
      '@/lib/email': { enviarIngressoPorEmail: async data => envios.push(data),
        enviarCorrecaoIngressoElevadorPorEmail: async data => envios.push(data) },
    });
    const res = await rota.POST({ json: async () => ({ pedidoId: salvo.id }) });
    assert.equal(res.status, 200);
    assert.equal(salvo.valorUnitarioElevador, promocional ? 60 : 75);
    assert.equal(salvo.valorTotal, promocional ? 120 : 135);
    assert.equal(envios.length, 2);
    assert.equal(envios[0].codigoIngresso, pedido.codigoIngressoParque);
    assert.equal(envios[1].codigoIngressoElevador, pedido.codigoIngressoElevador);
  }
});

test('Purchase usa valorPago do pedido confirmado; pendente não dispara evento', async () => {
  for (const pago of [true, false]) {
    const eventos = [];
    const sessoes = new Map();
    const mod = carregar('src/app/checkout/sucesso/page.tsx', {
      '@/lib/pedidos': { buscarPedidoPorId: async () => ({ id: 'COMBO-TESTE', valorTotal: 135,
        valorPago: 120, statusPagamento: pago ? 'pago' : 'pendente' }) },
      qrcode: { toDataURL: async () => 'data:teste' }, 'next/link': {},
      react: { useState: value => [value, () => {}], useEffect: fn => fn() },
      'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    }, {
      window: { location: { search: '?pedidoId=COMBO-TESTE' }, fbq: (...args) => eventos.push(args) },
      sessionStorage: { getItem: key => sessoes.get(key), setItem: (key, value) => sessoes.set(key, value) },
    });
    mod.default();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(eventos.length, pago ? 1 : 0);
    if (pago) { assert.equal(eventos[0][1], 'Purchase'); assert.equal(eventos[0][2].value, 120); }
  }
});
