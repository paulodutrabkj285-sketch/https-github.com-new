const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

// Compila os módulos reais, substituindo todas as fronteiras externas.
// Nenhum teste inicializa Firebase, acessa banco ou envia mensagens.
function carregar(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    Buffer, URL, URLSearchParams, Date, Set, process, console: { log() {}, error() {} },
  })((id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (['https', 'crypto'].includes(id)) return require(id);
    throw new Error(`Dependência externa não simulada: ${id}`);
  }, module, module.exports);
  return module.exports;
}
const next = { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
function memoria(initial) {
  const store = new Map(Object.entries(initial));
  let fila = Promise.resolve();
  const snap = (id) => ({ id, exists: () => store.has(id), data: () => structuredClone(store.get(id)) });
  const firestore = {
    doc: (_db, col, id) => `${col}/${id}`,
    updateDoc: async (id, data) => store.set(id, { ...store.get(id), ...data }),
    runTransaction: (_db, fn) => {
      const result = fila.then(() => fn({
        get: async (id) => snap(id),
        update: (id, data) => store.set(id, { ...store.get(id), ...data }),
        set: (id, data) => store.set(id, { ...store.get(id), ...data }),
      }));
      fila = result.catch(() => {});
      return result;
    },
    collection: (_db, col) => col,
    documentId: () => '__name__',
    where: (...args) => ({ where: args }), orderBy: () => ({}),
    startAfter: (id) => ({ after: id }), limit: (n) => ({ limit: n }),
    query: (col, ...constraints) => ({ col, constraints }),
    getDocs: async ({ col, constraints }) => {
      const after = constraints.find(c => c.after)?.after || '';
      const size = constraints.find(c => c.limit)?.limit || Infinity;
      const docs = [...store].filter(([key, value]) => key.startsWith(`${col}/`) &&
        key.slice(col.length + 1) > after && ['pendente', 'expirado'].includes(value.statusPagamento))
        .sort(([a], [b]) => a.localeCompare(b)).slice(0, size)
        .map(([key]) => ({ id: key.slice(col.length + 1), data: () => structuredClone(store.get(key)) }));
      return { docs, empty: docs.length === 0 };
    },
  };
  return { store, firestore };
}
function central(pedido, banco) {
  const mem = memoria({ 'pedidos/ficticio': { id: 'ficticio', valorTotal: 60, statusPagamento: 'pendente',
    statusOperacional: 'pendente', sicrediTxid: 'TX-FICTICIO', codigoIngresso: 'QR-EXISTENTE', ...pedido } });
  let emails = 0;
  const mod = carregar('src/lib/finalizar-pagamento.ts', {
    '@/lib/firebase': { db: {} }, 'firebase/firestore': mem.firestore,
    '@/lib/pedidos': {
      buscarPedidoPorId: async id => structuredClone(mem.store.get(`pedidos/${id}`)),
      atualizarPedido: async (id, data) => mem.firestore.updateDoc(`pedidos/${id}`, data),
    },
    '@/lib/email': { enviarIngressoPorEmail: async () => { emails++; return {}; } },
    '@/lib/sicredi-pix': { consultarPixConfirmado: banco || (async () => ({ valor: 60, endToEndId: 'E-FICTICIO', horario: '2026-01-01T12:00:00Z' })) },
    '@/lib/pagbank-notificacao': carregar('src/lib/pagbank-notificacao.ts'),
  });
  return { ...mem, finalizar: (extra = {}) => mod.finalizarPagamento({ pedidoId: 'ficticio', formaPagamento: 'pix', ...extra }), emails: () => emails };
}

test('prova Pix exige conclusão, TXID, recebimento, valor, identificador e horário', () => {
  const { validarCobrancaPix } = carregar('src/lib/sicredi-pix.ts', { axios: {} });
  const cob = { status: 'CONCLUIDA', txid: 'T', pix: [{ valor: '60.00', endToEndId: 'E-FICTICIO', horario: '2026-01-01T12:00:00Z' }] };
  assert.equal(validarCobrancaPix(cob, 'T').valor, 60);
  for (const invalid of [null, { ...cob, status: 'ATIVA' }, { ...cob, txid: 'OUTRO' },
    { ...cob, pix: [] }, { ...cob, pix: [{ ...cob.pix[0], valor: 'NaN' }] },
    { ...cob, pix: [{ ...cob.pix[0], valor: '0' }] }, { ...cob, pix: [{ valor: '60' }] }]) {
    assert.equal(validarCobrancaPix(invalid, 'T'), null);
  }
});

test('expiração local não impede recuperação; QR e uso do elevador são preservados', async () => {
  const c = central({ statusPagamento: 'expirado', statusOperacional: 'expirado', expiracaoPix: '2020-01-01',
    tipo: 'carrinho', quantidadeParque: 1, quantidadeElevador: 1,
    codigoIngressoParque: 'PARQUE-ANTIGO', codigoIngressoElevador: 'ELEV-ANTIGO',
    qrCodeIngresso: 'QR-ANTIGO', elevadorValidado: true, elevadorQuantidadeValidada: 1 });
  assert.equal((await c.finalizar()).status, 'pago');
  const pedido = c.store.get('pedidos/ficticio');
  assert.equal(pedido.qrCodeIngresso, 'QR-ANTIGO');
  assert.equal(pedido.codigoIngresso, 'QR-EXISTENTE');
  assert.equal(pedido.codigoIngressoElevador, 'ELEV-ANTIGO');
  assert.equal(pedido.elevadorValidado, true);
  assert.equal(pedido.elevadorQuantidadeValidada, 1);
});

test('dados de webhook forjados não substituem confirmação bancária', async () => {
  const c = central({}, async () => null);
  const resultado = await c.finalizar({ valorPago: 60, pixEndToEndId: 'FORJADO' });
  assert.equal(resultado.ok, false);
  assert.equal(c.store.get('pedidos/ficticio').statusPagamento, 'pendente');
});

test('erro do banco e valor divergente não liberam ingresso', async () => {
  const erro = central({}, async () => { throw new Error('timeout'); });
  await assert.rejects(erro.finalizar());
  assert.equal(erro.store.get('pedidos/ficticio').statusPagamento, 'pendente');
  const divergente = central({}, async () => ({ valor: 1, endToEndId: 'E', horario: '2026-01-01' }));
  assert.equal((await divergente.finalizar()).status, 'valor_divergente');
  assert.notEqual(divergente.store.get('pedidos/ficticio').statusPagamento, 'pago');
});

test('chamadas simultâneas confirmam uma vez e enviam um e-mail', async () => {
  const c = central({ email: 'ficticio@example.invalid' });
  const resultados = await Promise.all([c.finalizar(), c.finalizar(), c.finalizar()]);
  assert.equal(resultados.filter(r => r.status === 'pago').length, 1);
  assert.equal(c.emails(), 1);
  assert.equal((await c.finalizar()).status, 'ja_pago');
  assert.equal(c.emails(), 1);
});

test('confirmação não reativa ingresso cancelado ou utilizado', async () => {
  for (const statusOperacional of ['cancelado', 'utilizado', 'bloqueado']) {
    const c = central({ statusOperacional });
    await c.finalizar();
    assert.equal(c.store.get('pedidos/ficticio').statusOperacional, statusOperacional);
  }
});

test('cartão continua usando finalização central sem consulta Pix', async () => {
  const c = central({}, async () => { throw new Error('Não deve consultar Pix'); });
  assert.equal((await c.finalizar({ formaPagamento: 'cartao', valorPago: 60,
    cartaoStatus: 'aprovado', cartaoTransacaoId: 'TRANSACAO-FICTICIA' })).status, 'pago');
});

test('paginação ultrapassa 50 sem TXID, retoma limite e reinicia ao chegar ao fim', async () => {
  const initial = {};
  for (let n = 1; n <= 1005; n++) initial[`pedidos/${String(n).padStart(4, '0')}`] = {
    statusPagamento: n === 1005 ? 'expirado' : 'pendente', ...(n > 100 ? { sicrediTxid: `T${n}` } : {}) };
  const mem = memoria(initial);
  const visitados = [];
  const route = carregar('src/app/api/sicredi/reconciliar-pix/route.ts', {
    'next/server': next, 'firebase/firestore': mem.firestore, '@/lib/firebase': { db: {} },
    '@/lib/finalizar-pagamento': { finalizarPagamento: async ({ pedidoId }) => {
      visitados.push(pedidoId);
      if (pedidoId === '0101') throw new Error('Banco indisponível');
      mem.store.get(`pedidos/${pedidoId}`).statusPagamento = 'pago';
      return { ok: true, status: 'pago' };
    } },
  });
  process.env.CRON_SECRET = 'teste-local';
  const req = { headers: { get: () => 'Bearer teste-local' } };
  assert.equal((await route.GET({ headers: { get: () => null } })).status, 401);
  const primeiro = await route.GET(req);
  assert.equal(primeiro.body.analisados, 1000);
  assert.equal(primeiro.body.proximoCursor, '1000');
  assert.ok(visitados.includes('0102'));
  assert.equal(primeiro.body.erros, 1);
  const segundo = await route.GET(req);
  assert.equal(segundo.body.analisados, 5);
  assert.equal(segundo.body.concluido, true);
  assert.ok(visitados.includes('1005'));
  assert.equal(mem.store.get('integracoes/sicredi_pix_reconciliacao').cursor, '');
  await route.GET(req);
  assert.equal(visitados.filter(id => id === '0101').length, 2);
});

test('webhook processa lote após falha parcial e pede reentrega; alias mantém handler', async () => {
  const chamadas = [];
  const webhook = carregar('src/app/api/sicredi/webhook/route.ts', {
    'next/server': next,
    '@/lib/pedidos': { buscarPedidoPorTxid: async txid => ({ id: txid }) },
    '@/lib/finalizar-pagamento': { finalizarPagamento: async ({ pedidoId }) => {
      chamadas.push(pedidoId);
      if (pedidoId === 'FALHA') throw new Error('timeout');
      return { ok: true, status: 'pago' };
    } },
  });
  const res = await webhook.POST({ json: async () => ({ pix: [{ txid: 'FALHA' }, { txid: 'OK' }, { txid: 'OK' }] }) });
  assert.equal(res.status, 503);
  assert.deepEqual(chamadas, ['FALHA', 'OK']);
  const alias = carregar('src/app/api/sicredi/webhook/pix/route.ts', { '../route': webhook });
  assert.equal(alias.POST, webhook.POST);
});

test('verificação não responde pago quando finalização recusa', async () => {
  const route = carregar('src/app/api/sicredi/verificar-pagamento/route.ts', {
    'next/server': next, '@/lib/finalizar-pagamento': { finalizarPagamento: async () => ({ ok: false, status: 'valor_divergente' }) },
  });
  assert.equal((await route.POST({ json: async () => ({ pedidoId: 'ficticio' }) })).body.pago, false);
});

test('PagBank exige assinatura íntegra e usa finalização central', async () => {
  process.env.PAGBANK_TOKEN = 'TOKEN-APENAS-TESTE';
  const mod = carregar('src/lib/pagbank-notificacao.ts');
  const raw = JSON.stringify({ reference_id: 'ficticio', charges: [{ id: 'CHAR-FICTICIO', status: 'PAID',
    amount: { currency: 'BRL', summary: { paid: 6000, refunded: 0 } }, payment_method: { type: 'PIX' } }] });
  const assinatura = crypto.createHash('sha256').update(`TOKEN-APENAS-TESTE-${raw}`).digest('hex');
  assert.throws(() => mod.lerNotificacaoPagbank(raw + ' ', assinatura));
  assert.throws(() => mod.lerNotificacaoPagbank(raw, ''));
  const c = central({}, async () => { throw new Error('Pix PagBank não usa Sicredi'); });
  assert.equal((await c.finalizar({ pagbankNotificacao: { raw, assinatura } })).status, 'pago');
  assert.equal(c.store.get('pedidos/ficticio').pagbankStatus, 'PAID');
});

test('pedido já pago é reconhecido mesmo com API bancária indisponível', async () => {
  const c = central({ statusPagamento: 'pago', emailIngressoEnviado: true }, async () => { throw new Error('Banco indisponível'); });
  assert.equal((await c.finalizar()).status, 'ja_pago');
  assert.equal(c.emails(), 0);
});

test('respostas bancárias malformadas são recusadas sem lançar TypeError', () => {
  const { validarCobrancaPix } = carregar('src/lib/sicredi-pix.ts', { axios: {} });
  for (const pix of [null, { valor: '60.00', endToEndId: 1, horario: '2026-01-01' },
    { valor: '60.00', endToEndId: 'E', horario: {} }]) {
    assert.equal(validarCobrancaPix({ status: 'CONCLUIDA', txid: 'T', pix: [pix] }, 'T'), null);
  }
});

test('token OAuth é reutilizado em consultas concorrentes', async () => {
  const names = ['SICREDI_BASE_URL', 'SICREDI_CLIENT_ID', 'SICREDI_CLIENT_SECRET', 'SICREDI_CERT_BASE64', 'SICREDI_KEY_BASE64'];
  const anterior = Object.fromEntries(names.map(k => [k, process.env[k]]));
  try {
    for (const k of names) process.env[k] = 'FICTICIO';
    let tokens = 0;
    const mod = carregar('src/lib/sicredi-pix.ts', { axios: {
      post: async () => { tokens++; return { data: { access_token: 'TOKEN-FICTICIO', expires_in: 300 } }; },
      get: async () => ({ data: { status: 'ATIVA' } }),
    } });
    await Promise.all([mod.consultarPixConfirmado('T1'), mod.consultarPixConfirmado('T2')]);
    await mod.consultarPixConfirmado('T3');
    assert.equal(tokens, 1);
  } finally { for (const k of names) { if (anterior[k] === undefined) delete process.env[k]; else process.env[k] = anterior[k]; } }
});

test('cadastro webhook: GET somente consulta, POST configura URL base, ambos autenticados', async () => {
  const requests = [];
  process.env.CRON_SECRET = 'teste-local';
  const anterior = process.env.SICREDI_PIX_KEY;
  process.env.SICREDI_PIX_KEY = 'ficticio@example.invalid';
  try {
    const route = carregar('src/app/api/sicredi/configurar-webhook/route.ts', {
      'next/server': next,
      '@/lib/sicredi-pix': { criarClientePix: async () => ({ baseUrl: 'https://banco.invalid', config: {} }) },
      axios: { get: async url => { requests.push(['GET', url]); return { data: {} }; },
        put: async (url, data) => { requests.push(['PUT', url, data]); return { data: {} }; } },
    });
    const req = { headers: { get: () => 'Bearer teste-local' } };
    assert.equal((await route.GET({ headers: { get: () => null } })).status, 401);
    assert.equal(requests.length, 0);
    assert.equal((await route.GET(req)).status, 200);
    assert.equal(requests[0][0], 'GET');
    assert.equal((await route.POST(req)).status, 200);
    assert.equal(requests[1][2].webhookUrl, 'https://www.parquemundonovooficial.com.br/api/sicredi/webhook');
  } finally { if (anterior === undefined) delete process.env.SICREDI_PIX_KEY; else process.env.SICREDI_PIX_KEY = anterior; }
});

test('promoção Elevador preserva valores e valida pedido promocional', () => {
  const mod = carregar('src/lib/preco-elevador.ts');
  for (const [qtd, total] of [[1, 75], [2, 120], [3, 195], [4, 240]]) {
    assert.equal(mod.calcularPrecoElevador(qtd).valorTotal, total);
    assert.equal(mod.valorPromocionalValido({ tipo: 'elevador', origem: 'site', promocao: mod.PROMOCAO_ELEVADOR, quantidade: qtd, valorTotal: total }), true);
  }
  assert.equal(mod.valorPromocionalValido({ tipo: 'elevador', origem: 'site', promocao: mod.PROMOCAO_ELEVADOR, quantidade: 2, valorTotal: 150 }), false);
});
