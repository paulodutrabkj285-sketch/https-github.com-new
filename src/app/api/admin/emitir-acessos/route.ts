import { NextRequest, NextResponse } from 'next/server';
import { deleteApp, initializeServerApp, type FirebaseServerApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getFirestore, runTransaction, updateDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { prepararPedido } from '@/lib/preparar-pedido';
import { gerarCodigoIngresso, gerarCodigosCarrinho } from '@/lib/codigos-ingresso';
import { enviarIngressoPorEmail } from '@/lib/email';

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
    // Mesma regra de acesso de /admin/dashboard/layout.tsx: usuário autenticado
    // no Firebase deste projeto. O token da sessão existente já foi validado
    // pelo Firebase acima; não há lista de UIDs nem exigência de custom claims.
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
      // Mantém o formato PMN usado nas compras normais.
      // O ID Firestore torna os códigos exclusivos e estáveis em novas tentativas.
      const codigo = gerarCodigoIngresso(ref.id);
      const codigoElevador = parque ? gerarCodigosCarrinho(ref.id).codigoElevador : codigo;
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
    let emailEnviado = Boolean("emailIngressoEnviado" in pedido && pedido.emailIngressoEnviado);
    if (resultado.criado && pedido.email) {
      // A mesma função usada nas compras gera QR, PDF e e-mail por atração.
      const ingressos = pedido.tipo === 'carrinho'
        ? [
            { produto: 'Ingresso Parque', quantidade: pedido.quantidadeParque,
              codigoIngresso: pedido.codigoIngressoParque, campoEnvio: 'emailParqueEnviado' },
            { produto: 'Elevador Panorâmico', quantidade: pedido.quantidadeElevador,
              codigoIngresso: pedido.codigoIngressoElevador, campoEnvio: 'emailElevadorEnviado' },
          ]
        : [{ produto: pedido.produto, quantidade: pedido.quantidade,
             codigoIngresso: pedido.codigoIngresso,
             campoEnvio: pedido.tipo === 'elevador' ? 'emailElevadorEnviado' : 'emailParqueEnviado' }];
      try {
        for (const ingresso of ingressos) {
          await enviarIngressoPorEmail({
            para: pedido.email, nome: pedido.nome, produto: ingresso.produto,
            quantidade: Number(ingresso.quantidade), codigoIngresso: String(ingresso.codigoIngresso),
            pedidoId: ref.id, dataVisita: pedido.dataVisita,
          });
          await updateDoc(ref, { [ingresso.campoEnvio]: true, updatedAt: new Date().toISOString() });
        }
        await updateDoc(ref, {
          emailIngressoEnviado: true, emailIngressoEnviadoEm: new Date().toISOString(),
          emailIngressoErro: '', emailIngressoErroEm: '',
          ...(pedido.tipo === 'carrinho' ? { emailCarrinhoSeparado: true } : {}),
          updatedAt: new Date().toISOString(),
        });
        emailEnviado = true;
      } catch (error) {
        // O pedido continua emitido mesmo se SMTP ou a atualização do envio falhar.
        await updateDoc(ref, {
          emailIngressoEnviado: false,
          emailIngressoErro: error instanceof Error ? error.message : 'Falha ao enviar ingresso.',
          emailIngressoErroEm: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }
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
