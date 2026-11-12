import { NextRequest, NextResponse } from 'next/server';
import { deleteApp, initializeServerApp, type FirebaseServerApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, runTransaction, updateDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { prepararPedido } from '@/lib/preparar-pedido';
import { gerarCodigoIngresso, obterCodigosCarrinho, tentarEnviarEmailSemLease } from '@/lib/finalizar-pagamento';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  let app: FirebaseServerApp | undefined;
  try {
    // Continua a sessão do navegador com a configuração Firebase existente.
    // A sessão pertence a esta requisição; não altera o auth singleton do painel.
    app = initializeServerApp(auth.app, { authIdToken: token });
    const sessao = getAuth(app);
    try { await sessao.authStateReady(); }
    catch { return NextResponse.json({ erro: 'Sessão inválida. Entre novamente no painel.' }, { status: 401 }); }
    const usuario = sessao.currentUser;
    if (!usuario) return NextResponse.json({ erro: 'Sessão inválida. Entre novamente no painel.' }, { status: 401 });
    // Somente ler claims após o Firebase autenticar o token recebido.
    const { claims } = await usuario.getIdTokenResult();
    // Autenticação sozinha não concede permissão para emitir ingressos gratuitos.
    const uids = (process.env.ADMIN_EMISSAO_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (claims.admin !== true && !uids.includes(usuario.uid)) {
      return NextResponse.json({ erro: 'Usuário sem permissão administrativa para emitir cortesia.' }, { status: 403 });
    }
    const body = await req.json();
    const nome = String(body.nome || '').trim();
    const email = String(body.email || '').trim();
    const dataVisita = String(body.dataVisita || '');
    const quantidade = body.quantidade;
    const parque = body.parque === true;
    const elevador = body.elevador === true;
    const chave = String(body.chaveIdempotencia || '');
    if (!nome || nome.length > 200 || (email && !/^\S+@\S+\.\S+$/.test(email)) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dataVisita) ||
        !Number.isFinite(Date.parse(dataVisita)) || new Date(dataVisita).toISOString().slice(0, 10) !== dataVisita ||
        !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 1000 ||
        (!parque && !elevador) || !/^[a-zA-Z0-9_-]{12,100}$/.test(chave)) {
      return NextResponse.json({ erro: 'Confira nome, e-mail, data, quantidade (1 a 1000) e atrações.' }, { status: 400 });
    }
    const db = getFirestore(app);
    const ref = doc(db, 'pedidos', 'EMADM-' + chave);
    const resultado = await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (snap.exists()) return { criado: false, pedido: snap.data() };
      // Usa o gerador e o formato compartilhados com as compras normais.
      // O ID Firestore torna os códigos exclusivos e estáveis em novas tentativas.
      const codigo = gerarCodigoIngresso(ref.id);
      const codigoElevador = parque ? obterCodigosCarrinho({}, ref.id).codigoElevador : codigo;
      const pedido = prepararPedido({
        nome, email, cpf: '', telefone: '', dataVisita, quantidade,
        produto: parque ? 'Ingresso Parque' : 'Elevador Panorâmico',
        tipo: parque ? 'ingresso' : 'elevador', origem: 'site',
        quantidadeParque: parque ? quantidade : 0,
        quantidadeElevador: elevador ? quantidade : 0,
        qtdElevador: elevador ? quantidade : 0,
        elevador, elevadorValidado: false, elevadorQuantidadeValidada: 0,
        codigoIngresso: codigo, codigoIngressoParque: parque ? codigo : '',
        codigoIngressoElevador: elevador ? codigoElevador : '',
        valorUnitario: 0, valorTotal: 0, valorSubtotal: 0,
        valorParque: 0, valorElevador: 0, valorUnitarioElevador: 0,
        statusPagamento: 'pago', statusOperacional: 'ativo',
        formaPagamento: 'cortesia', cortesia: true,
      });
      const dados = { ...pedido, emitidoPor: usuario.uid, origemEmissao: 'administrativa',
        observacaoFinanceira: 'Cortesia administrativa. Nenhum pagamento recebido.' };
      tx.set(ref, dados);
      return { criado: true, pedido: dados };
    });
    const pedido = resultado.pedido;
    // Repetir a mesma requisição nunca emite outro pedido nem duplica o envio.
    const emailEnviado = resultado.criado && email
      ? await tentarEnviarEmailSemLease({ pedido, pedidoId: ref.id,
          codigoIngresso: String(pedido.codigoIngresso),
          salvarPedido: async (_id, dados) => { await updateDoc(ref, { ...dados, updatedAt: new Date().toISOString() }); },
        })
      : Boolean("emailIngressoEnviado" in pedido && pedido.emailIngressoEnviado);
    return NextResponse.json({ ok: true, criado: resultado.criado, pedidoId: ref.id,
      codigoIngresso: pedido.codigoIngresso, codigoIngressoParque: pedido.codigoIngressoParque,
      codigoIngressoElevador: pedido.codigoIngressoElevador, emailEnviado,
      aviso: !resultado.criado ? 'Pedido já emitido; e-mails não reenviados.' :
        email && !emailEnviado ? 'Cortesia emitida. Falha no e-mail; use o envio de ingressos do admin.' : '' });
  } catch (error) {
    console.error('EMISSÃO DE CORTESIA:', error instanceof Error ? error.message : 'Erro inesperado');
    const codigo = (error as { code?: string })?.code;
    if (codigo === 'permission-denied') {
      return NextResponse.json({ erro: 'O Firestore não autorizou a emissão para este administrador. Confira as regras publicadas de pedidos.' }, { status: 403 });
    }
    if (codigo?.startsWith('auth/')) {
      return NextResponse.json({ erro: 'Sessão inválida. Entre novamente no painel.' }, { status: 401 });
    }
    return NextResponse.json({ erro: 'Não foi possível concluir a emissão. Tente novamente com os mesmos dados.' }, { status: 500 });
  } finally {
    // initializeServerApp conta referências de sessões equivalentes.
    if (app) await deleteApp(app).catch(() => {});
  }
}
