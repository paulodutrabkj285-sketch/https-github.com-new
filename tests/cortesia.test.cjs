const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function carregar(file, mocks = {}, env = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    Date, URL, process: { env }, console: { log() {}, error() {} },
  })(id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw new Error(`Dependência não simulada: ${id}`);
  }, module, module.exports);
  return module.exports;
}

function cenario({ claims = { admin: true }, uid = 'admin-teste', invalido = false,
  falhaAuth = false, semPermissaoFirestore = false, falhaEmail = false, uids = '' } = {}) {
  const appExistente = {};
  const sessoes = [], liberadas = [], emails = [], pedidos = new Map();
  let acessosFirestore = 0;
  const firestore = {
    doc: (_db, col, id) => ({ path: `${col}/${id}`, id }),
    getFirestore: app => { acessosFirestore++; assert(sessoes.includes(app)); return app; },
    runTransaction: async (_db, fn) => {
      if (semPermissaoFirestore) throw Object.assign(new Error('Negado'), { code: 'permission-denied' });
      return fn({
        get: async ref => ({ exists: () => pedidos.has(ref.path), data: () => pedidos.get(ref.path) }),
        set: (ref, dados) => pedidos.set(ref.path, dados),
      });
    },
    updateDoc: async (ref, dados) => pedidos.set(ref.path, { ...pedidos.get(ref.path), ...dados }),
  };
  const preco = carregar('src/lib/preco-elevador.ts');
  const preparar = carregar('src/lib/preparar-pedido.ts', { './preco-elevador': preco });
  const email = { enviarIngressoPorEmail: async dados => {
    if (falhaEmail) throw new Error('Falha SMTP simulada');
    emails.push(dados); return {};
  } };
  const finalizar = carregar('src/lib/finalizar-pagamento.ts', {
    crypto: { randomUUID: () => 'lease' }, '@/lib/sicredi-pix': {}, '@/lib/pagbank-notificacao': {},
    '@/lib/pedidos': {}, '@/lib/firebase': {}, 'firebase/firestore': firestore,
    '@/lib/email': email,
  });
  const rota = carregar('src/app/api/admin/emitir-acessos/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    'firebase/app': {
      initializeServerApp: (app, options) => {
        assert.equal(app, appExistente);
        assert.equal(options.authIdToken, 'token-teste');
        const sessao = {}; sessoes.push(sessao); return sessao;
      },
      deleteApp: async app => liberadas.push(app),
    },
    'firebase/auth': { getAuth: app => {
      assert(sessoes.includes(app));
      let pronto = false;
      return {
        authStateReady: async () => { if (falhaAuth) throw new Error('Token inválido'); pronto = true; },
        get currentUser() { assert(pronto); return invalido ? null : {
          uid, getIdTokenResult: async () => ({ claims }),
        }; },
      };
    } },
    'firebase/firestore': firestore,
    '@/lib/firebase': { auth: { app: appExistente } },
    '@/lib/preparar-pedido': preparar,
    // A rota não deve depender do wrapper interno de envio da finalização.
    '@/lib/finalizar-pagamento': { gerarCodigoIngresso: finalizar.gerarCodigoIngresso,
      obterCodigosCarrinho: finalizar.obterCodigosCarrinho },
    '@/lib/email': email,
  }, { ADMIN_EMISSAO_UIDS: uids });
  const emitir = (dados = {}, token = 'token-teste') => rota.POST({
    headers: { get: () => token ? `Bearer ${token}` : null },
    json: async () => ({ nome: 'Visitante Teste', email: 'teste@example.com', dataVisita: '2026-11-15',
      quantidade: 2, parque: true, elevador: true, chaveIdempotencia: 'teste-cortesia-123456', ...dados }),
  });
  return { emitir, pedidos, emails, sessoes, liberadas, acessos: () => acessosFirestore };
}

test('sem token, sessão inválida e usuário comum não acessam o Firestore', async () => {
  for (const [opcoes, token, esperado] of [[{}, '', 401], [{ invalido: true }, 'token-teste', 401],
    [{ falhaAuth: true }, 'token-teste', 401], [{ claims: {} }, 'token-teste', 403]]) {
    const c = cenario(opcoes);
    assert.equal((await c.emitir({}, token)).status, esperado);
    assert.equal(c.acessos(), 0); assert.equal(c.pedidos.size, 0); assert.equal(c.emails.length, 0);
    assert.equal(c.liberadas.length, c.sessoes.length);
  }
});

test('UID autorizado no servidor pode emitir sem custom claim e sem service account', async () => {
  const c = cenario({ claims: {}, uids: ' outro, admin-teste ' });
  assert.equal((await c.emitir()).status, 200);
  assert.equal(c.pedidos.size, 1);
});

for (const [parque, elevador] of [[true, false], [false, true], [true, true]]) {
  test(`formato e envio existentes: parque=${parque}, elevador=${elevador}`, async () => {
    const c = cenario();
    const r = await c.emitir({ parque, elevador });
    assert.equal(r.status, 200); assert.equal(r.body.emailEnviado, true);
    const p = [...c.pedidos.values()][0];
    assert.equal(p.formaPagamento, 'cortesia'); assert.equal(p.cortesia, true);
    assert.equal(p.statusPagamento, 'pago'); assert.equal(p.statusOperacional, 'ativo');
    assert.equal(p.valorTotal, 0); assert.equal(p.expiracaoPix, undefined);
    assert.equal(p.emitidoPor, 'admin-teste'); assert.equal(p.quantidade, 2);
    assert.equal(p.qrCodeIngresso, p.codigoIngresso);
    assert.equal(p.tipo, parque && elevador ? 'carrinho' : parque ? 'ingresso' : 'elevador');
    assert.equal(c.emails.length, parque && elevador ? 2 : 1);
    assert(c.emails.every(e => e.quantidade === 2 && e.dataVisita === '2026-11-15'));
    if (parque && elevador) {
      assert.notEqual(p.codigoIngressoParque, p.codigoIngressoElevador);
      assert.equal(p.qrCodeIngressoParque, p.codigoIngressoParque);
      assert.equal(p.qrCodeIngressoElevador, p.codigoIngressoElevador);
      assert.equal(p.quantidadeParque, 2); assert.equal(p.quantidadeElevador, 2);
      assert.equal(p.elevadorValidado, false); assert.equal(p.elevadorQuantidadeValidada, 0);
      assert.equal(c.emails[0].codigoIngresso, p.codigoIngressoParque);
      assert.equal(c.emails[1].codigoIngresso, p.codigoIngressoElevador);
      assert(p.itensCarrinho.every(i => i.valorUnitario === 0 && i.valorTotal === 0));
    }
    assert.equal(c.liberadas.length, 1);
    assert.equal((await c.emitir({ parque, elevador })).body.criado, false);
    assert.equal(c.pedidos.size, 1); assert.equal(c.emails.length, parque && elevador ? 2 : 1);
  });
}

test('não contorna negação das regras Firestore e libera a sessão', async () => {
  const c = cenario({ semPermissaoFirestore: true });
  assert.equal((await c.emitir()).status, 403);
  assert.equal(c.pedidos.size, 0); assert.equal(c.emails.length, 0); assert.equal(c.liberadas.length, 1);
});

test('e-mail opcional e falha SMTP não desfazem a cortesia nem emitem outra na repetição', async () => {
  const semEmail = cenario();
  assert.equal((await semEmail.emitir({ email: '' })).status, 200);
  assert.equal(semEmail.emails.length, 0);
  const c = cenario({ falhaEmail: true });
  const resposta = await c.emitir();
  assert.equal(resposta.status, 200); assert.equal(resposta.body.emailEnviado, false);
  assert.match(resposta.body.aviso, /Falha no e-mail/);
  assert.equal([...c.pedidos.values()][0].statusPagamento, 'pago');
  assert.equal((await c.emitir()).body.criado, false); assert.equal(c.pedidos.size, 1);
});

test('dados inválidos não gravam nem enviam', async () => {
  for (const dados of [{ parque: false, elevador: false }, { quantidade: 0 }, { quantidade: 1.5 },
    { dataVisita: '2026-02-30' }, { email: 'invalido' }, { chaveIdempotencia: '../invalida' }]) {
    const c = cenario(); assert.equal((await c.emitir(dados)).status, 400);
    assert.equal(c.acessos(), 0); assert.equal(c.emails.length, 0); assert.equal(c.liberadas.length, 1);
  }
});
