import { prepararPedido } from "./preparar-pedido";
import {



  addDoc,



  collection,



  doc,



  getDoc,



  getDocs,
  getDocsFromServer,
  onSnapshot,
  type QuerySnapshot,



  limit,



  orderBy,



  query,



  updateDoc,
  runTransaction,



  where,



} from "firebase/firestore";







import { db } from "./firebase";







export type PedidoInput = {
  /** Emissão gratuita administrativa; ausente nos pedidos comuns. */
  cortesia?: boolean;



  produto: string;



  tipo: string;







  /* ==========================================



     ORIGEM DO PEDIDO



  \\========================================== */







  /*



   * site:



   * compras normais de ingressos



   *



   * parceiro:



   * compra antecipada feita por



   * agência/guia/parceiro aprovado



   */



  origem?: "site" | "parceiro";







  /* ==========================================



     VÍNCULO COM RESERVA DE AGÊNCIA



  \\========================================== */







  reservaAgenciaId?: string;







  codigoGrupo?: string;







  agenciaId?: string;







  agenciaNome?: string;







  /* ==========================================



     CLIENTE



  \\========================================== */







  nome: string;







  cpf: string;







  telefone: string;







  email: string;







  /* ==========================================



     VISITA



  \\========================================== */







  dataVisita?: string;







  dataEntrada?: string;







  noites?: number;







  quantidadePessoas?: number;







  quantidade: number;


  /* ==========================================

     CARRINHO / ITENS DA COMPRA

  ========================================== */

  quantidadeParque?: number;

  valorParque?: number;

  quantidadeElevador?: number;

  valorUnitarioElevador?: number;

  valorElevador?: number;

  itensCarrinho?: Array<{
    tipo: "parque" | "elevador";
    produto: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;







  /* ==========================================



     VALORES



  \\========================================== */







  valorUnitario: number;







  valorTotal: number;
  valorSubtotal?: number;
  desconto?: number;
  promocao?: string;







  /* ==========================================



     STATUS



  \\========================================== */







  statusPagamento: string;







  statusOperacional: string;



  /* ==========================================

     CIÊNCIA - NATURAL EXTREMO

  \========================================== */



  aceiteNaturalExtremo?: boolean;



  aceiteNaturalExtremoEm?: string;



  aceiteNaturalExtremoTexto?: string;



  aceiteNaturalExtremoVersao?: string;



  /* ==========================================

     CIÊNCIA - HORÁRIO DO CAMPING

  \========================================== */



  aceiteHorarioCamping?: boolean;



  aceiteHorarioCampingEm?: string;



  aceiteHorarioCampingTexto?: string;



  aceiteHorarioCampingVersao?: string;







  /* ==========================================



     PAGBANK



  \\========================================== */







  pagbankCheckoutId?: string;







  pagbankReferenceId?: string;







  pagbankPayUrl?: string;







  pagbankStatus?: string;







  /* ==========================================



     INGRESSO



  \\========================================== */







  codigoIngresso?: string;







  qrCodeIngresso?: string;







  codigoIngressoParque?: string;







  qrCodeIngressoParque?: string;







  codigoIngressoElevador?: string;







  qrCodeIngressoElevador?: string;







  /* ==========================================



     PORTARIA PRINCIPAL



  \\========================================== */







  validadoPor?: string;







  validadoEm?: string;







  utilizadoEm?: string;







  /* ==========================================



     CACHOEIRA MUNDO NOVO



  \\========================================== */







  cachoeiraMundoNovoValidado?: boolean;







  cachoeiraMundoNovoValidadoPor?: string;







  cachoeiraMundoNovoValidadoEm?: string;







  /* ==========================================



     ELEVADOR PANORÂMICO



  \\========================================== */







  elevador?: boolean;







  qtdElevador?: number;







  elevadorValidado?: boolean;







  elevadorValidadoPor?: string;







  elevadorValidadoEm?: string;







  elevadorQuantidadeValidada?: number;







  /* ==========================================



     LEMBRETES



  \\========================================== */







  lembrete24hEnviado?: boolean;







  lembrete24hEnviadoEm?: string;







  lembrete7dEnviado?: boolean;







  lembrete7dEnviadoEm?: string;







  /* ==========================================



     CARTÃO



  \\========================================== */







  formaPagamento?: string;







  parcelas?: number;







  cartaoStatus?: string;







  cartaoGateway?: string;







  cartaoTransactionId?: string;



};







export type Pedido =



  PedidoInput & {



    id: string;







    createdAt?: string;







    updatedAt?: string;







    expiracaoPix?: string;







    pixExpiradoEm?: string;







    ocultarNoAdmin?: boolean;
    pixProvider?: "efi" | "sicredi";
    efiTxid?: string;
    testeEfi?: boolean;
    valorTesteEfi?: number;
    valorOriginalTesteEfi?: number;
    efiStatus?: string;
    efiPixCopiaCola?: string;
    efiLocation?: string;
    sicrediTxid?: string;







    sicrediStatus?: string;







    sicrediPixCopiaCola?: string;







    sicrediLocation?: string;







    valorPago?: number;







    pagamentoConfirmadoEm?: string;
    pagoEm?: string;
    dataPagamento?: string;
    pagamentoConfirmadoManualmente?: boolean;
    pagamentoConfirmadoManualmenteEm?: string;
    pagamentoConfirmadoManualmentePor?: string;
    pagamentoConfirmadoManualmenteMotivo?: string;
    cartaoReferenciaBancaria?: string;
    cartaoUltimosDigitos?: string;
    validacaoAdministrativa?: boolean;
    validacaoAdministrativaEm?: string;
    validacaoAdministrativaPor?: string;
    validacaoAdministrativaMotivo?: string;







    emailIngressoEnviado?: boolean;







    emailIngressoEnviadoEm?: string;







    emailIngressoErro?: string;







    emailIngressoErroEm?: string;







    emailIngressoReenviado?: boolean;







    emailIngressoReenviadoEm?: string;







    pixEndToEndId?: string;







    pixHorario?: string;



  };







/* ==========================================



   CÓDIGO DO INGRESSO



\\========================================== */







/*



 * Verifica somente se o prazo visual



 * da cobrança Pix terminou.



 *



 * IMPORTANTE:



 *



 * Esta função NÃO altera Firestore.



 *



 * O banco não deve decidir que um Pix



 * está definitivamente expirado apenas



 * com base no relógio do navegador.



 */







function pixEstaExpirado(



  pedido: Pedido



) {



  if (



    pedido.statusPagamento !==



    "pendente"



  ) {



    return false;



  }







  if (



    !pedido.expiracaoPix



  ) {



    return false;



  }







  const expiracao =



    new Date(



      pedido.expiracaoPix



    ).getTime();







  if (



    !Number.isFinite(



      expiracao



    )



  ) {



    return false;



  }







  return (



    Date.now() >



    expiracao



  );



}







/*



 * Aplica EXPIRAÇÃO SOMENTE VISUAL.



 *



 * Não grava:



 *



 * statusPagamento = expirado



 * statusOperacional = expirado



 *



 * no Firestore.



 *



 * Dessa forma um webhook atrasado



 * ou uma reconciliação com o Sicredi



 * ainda pode recuperar o pagamento.



 */







function aplicarExpiracaoVisual(



  pedidos: Pedido[]



): Pedido[] {



  return pedidos.map(



    (pedido) => {



      if (



        !pixEstaExpirado(



          pedido



        )



      ) {



        return pedido;



      }







      return {



        ...pedido,







        statusPagamento:



          "expirado",







        statusOperacional:



          "expirado",



      };



    }



  );



}







/* ==========================================



   CPF



\\========================================== */







function limparCpf(



  valor: string



) {



  return String(



    valor || ""



  ).replace(



    /\D/g,



    ""



  );



}







/* ==========================================



   CRIAÇÃO DO PEDIDO



\\========================================== */







export async function criarPedido(dados: PedidoInput) {
  const ref = await addDoc(collection(db, "pedidos"), prepararPedido(dados));
  return ref.id;
}

/* ==========================================



   ATUALIZAÇÃO DO PEDIDO



\\========================================== */







export async function atualizarPedido(



  pedidoId: string,



  dados:



    Partial<Pedido> &



    Record<



      string,



      unknown



    >



) {



  const ref =



    doc(



      db,



      "pedidos",



      pedidoId



    );







  if (dados.statusPagamento !== undefined) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const atual = snap.data();
      if (atual && (pedidoReembolsado(atual) ||
        (atual.statusPagamento === "pago" && dados.statusPagamento !== "pago"))) return;
      tx.update(ref, { ...dados, updatedAt: new Date().toISOString() });
    });
    return;
  }

  await updateDoc(



    ref,



    {



      ...dados,







      updatedAt:



        new Date()



          .toISOString(),



    }



  );



}







/* ==========================================



   BUSCAR POR ID



\\========================================== */







export async function buscarPedidoPorId(



  pedidoId: string



): Promise<Pedido | null> {



  const ref =



    doc(



      db,



      "pedidos",



      pedidoId



    );







  const snap =



    await getDoc(



      ref



    );







  if (



    !snap.exists()



  ) {



    return null;



  }







  /*



   * Aqui retornamos o status REAL



   * do Firestore.



   *



   * Não aplicamos expiração visual,



   * porque APIs de pagamento e



   * finalização usam esta função.



   */







  return {
    ...snap.data(),
    id: snap.id,
  } as Pedido;



}







/* ==========================================



   BUSCAR POR TXID SICREDI



\\========================================== */







export async function buscarPedidoPorTxid(



  txid: string,
  campo: "sicrediTxid" | "efiTxid" = "sicrediTxid"



): Promise<Pedido | null> {



  const txidLimpo =



    String(



      txid || ""



    ).trim();







  if (



    !txidLimpo



  ) {



    return null;



  }







  const q =



    query(



      collection(



        db,



        "pedidos"



      ),







      where(



        campo,



        "==",



        txidLimpo



      ),







      limit(1)



    );







  const snap =



    await getDocs(



      q



    );







  if (



    snap.empty



  ) {



    return null;



  }







  const docItem =



    snap.docs[0];







  /*



   * Também retorna o estado REAL.



   *



   * O webhook depende disso.



   */







  return {
    ...docItem.data(),
    id: docItem.id,
  } as Pedido;



}







/* ==========================================



   BUSCAR PEDIDOS POR CPF



\\========================================== */







export async function buscarPedidosPorCpf(



  cpf: string



) {



  const cpfLimpo =



    limparCpf(



      cpf



    );







  if (



    !cpfLimpo



  ) {



    return [];



  }







  const q =



    query(



      collection(



        db,



        "pedidos"



      ),







      where(



        "cpf",



        "==",



        cpfLimpo



      ),







      orderBy(



        "createdAt",



        "desc"



      )



    );







  const snap =



    await getDocs(



      q



    );







  const pedidos =



    snap.docs.map(



      (



        docItem



      ) => ({



        id:



          docItem.id,







        ...docItem.data(),



      })



    ) as Pedido[];







  /*



   * Expiração somente visual.



   *



   * Nenhum campo é escrito



   * no Firestore.



   */







  return aplicarExpiracaoVisual(



    pedidos



  );



}







/* ==========================================



   BUSCAR PELO CÓDIGO PMN



\\========================================== */







export async function buscarPedidoPorCodigo(



  codigo: string



): Promise<Pedido | null> {



  const codigoLimpo =



    String(



      codigo || ""



    )



      .trim()



      .toUpperCase();







  if (



    !codigoLimpo



  ) {



    return null;



  }







  const q =



    query(



      collection(



        db,



        "pedidos"



      ),







      where(



        "codigoIngresso",



        "==",



        codigoLimpo



      ),







      limit(1)



    );







  const snap =



    await getDocs(



      q



    );







  if (



    snap.empty



  ) {



    return null;



  }







  const docItem =



    snap.docs[0];







  const pedido =



    {



      id:



        docItem.id,







      ...docItem.data(),



    } as Pedido;







  /*



   * Para telas administrativas



   * podemos mostrar o vencimento,



   * mas sem alterar o banco.



   */







  const resultado =



    aplicarExpiracaoVisual(



      [pedido]



    );







  return (



    resultado[0]



  );



}







/* ==========================================



   LISTAGEM GERAL / ADMIN



\\========================================== */







function consultaPedidos() {
  return query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
}

function pedidoVisivelNoAdmin(pedido: { ocultarNoAdmin?: unknown }) {
  return pedido.ocultarNoAdmin !== true;
}

export function documentosPedidosVisiveisNoAdmin(snapshot: QuerySnapshot) {
  // Filtros por desigualdade do Firestore descartam documentos sem esse campo.
  return snapshot.docs.filter((documento) => pedidoVisivelNoAdmin(documento.data()));
}

function pedidosDoSnapshot(snapshot: QuerySnapshot, somenteAdmin = false): Pedido[] {
  const documentos = somenteAdmin ? documentosPedidosVisiveisNoAdmin(snapshot) : snapshot.docs;
  const pedidos = documentos.map((item) => ({
    ...item.data(),
    id: item.id,
  })) as Pedido[];

  // A expiração visual do Pix não altera o estado no Firestore.
  return aplicarExpiracaoVisual(pedidos);
}

export async function listarPedidos({ consultarServidor = false } = {}) {
  const consulta = consultaPedidos();
  const snapshot = await (consultarServidor ? getDocsFromServer(consulta) : getDocs(consulta));
  return pedidosDoSnapshot(snapshot);
}

export async function listarPedidosAdmin({ consultarServidor = false } = {}) {
  const consulta = consultaPedidos();
  const snapshot = await (consultarServidor ? getDocsFromServer(consulta) : getDocs(consulta));
  return pedidosDoSnapshot(snapshot, true);
}

export async function buscarPedidoPorIdAdmin(pedidoId: string) {
  const pedido = await buscarPedidoPorId(pedidoId);
  return pedido && pedidoVisivelNoAdmin(pedido) ? pedido : null;
}

export function observarPedidosAdmin(
  aoAtualizar: (pedidos: Pedido[]) => void,
  aoFalhar: (erro: Error) => void
) {
  return onSnapshot(consultaPedidos(), (snapshot) => aoAtualizar(pedidosDoSnapshot(snapshot, true)), aoFalhar);
}

/* ==========================================



   PORTARIA



\\========================================== */







export async function listarPedidosAtivosPortaria() {



  const q =



    query(



      collection(



        db,



        "pedidos"



      ),







      where(



        "statusPagamento",



        "in",



        ["pago", "reembolsado"]



      )



    );







  const snap =



    await getDocs(



      q



    );







  const pedidos =



    snap.docs.map(



      (



        docItem



      ) => ({



        id:



          docItem.id,







        ...docItem.data(),



      })



    ) as Pedido[];







  pedidos.sort(



    (



      a,



      b



    ) => {



      const dataA =



        a.createdAt



          ? new Date(



            a.createdAt



          ).getTime()



          : 0;







      const dataB =



        b.createdAt



          ? new Date(



            b.createdAt



          ).getTime()



          : 0;







      return (



        dataB -



        dataA



      );



    }



  );







  return pedidos;



}







/* ==========================================



   RESUMO FINANCEIRO



\\========================================== */







export function calcularResumoFinanceiro(



  pedidos: Pedido[]



) {



  const pedidosVisiveis = pedidos.filter(pedidoVisivelNoAdmin);

  const totalPedidos =



    pedidosVisiveis.length;







  const pedidosPagos = pedidos.filter(pedidoContaComoVenda);

  const pedidosPendentes =



    pedidosVisiveis.filter(



      (



        pedido



      ) =>



        pedido.statusPagamento ===



        "pendente"



    );







  const pedidosExpirados =



    pedidosVisiveis.filter(



      (



        pedido



      ) =>



        pedido.statusPagamento ===



        "expirado"



    );







  const faturamentoBruto =



    pedidosPagos.reduce(



      (



        total,



        pedido



      ) =>



        total +



        Number(



          pedido.valorTotal ||



          0



        ),



      0



    );







  /*



   * Mantido como já estava.



   *



   * Como a compra antecipada



   * da agência também será um



   * pedido normal com status



   * "pago", ela entrará



   * automaticamente aqui.



   */







  const taxaPercentual =



    4.99;







  const valorTaxas =



    faturamentoBruto *



    (



      taxaPercentual /



      100



    );







  const faturamentoLiquido =



    faturamentoBruto -



    valorTaxas;







  const quantidadeIngressos =



    pedidosPagos.reduce(



      (



        total,



        pedido



      ) =>



        total +



        Number(



          pedido.quantidade ||



          0



        ),



      0



    );







  return {



    totalPedidos,







    totalPagos:



      pedidosPagos.length,







    totalPendentes:



      pedidosPendentes.length,







    totalExpirados:



      pedidosExpirados.length,







    quantidadeIngressos,







    faturamentoBruto,







    taxaPercentual,







    valorTaxas,







    faturamentoLiquido,



  };



}

/** Cancela o ingresso sem alterar o histórico financeiro. Exige permissão nas regras Firestore. */
export async function cancelarIngressoAdministrativo(pedidoId: string, motivo: string, responsavel: string) {
  const justificativa = motivo.trim();
  if (justificativa.length < 5) throw new Error("Informe um motivo com pelo menos 5 caracteres.");
  const referencia = doc(db, "pedidos", pedidoId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(referencia);
    if (!snap.exists()) throw new Error("Pedido não encontrado.");
    const pedido = snap.data();
    const status = String(pedido.statusOperacional || "ativo").toLowerCase();
    if (["cancelado", "bloqueado"].includes(status)) throw new Error("Ingresso já cancelado ou bloqueado.");
    if (status === "utilizado" || pedido.utilizadoEm || pedido.validadoEm) {
      throw new Error("Ingresso já utilizado: exige conferência antes de cancelar.");
    }
    const agora = new Date().toISOString();
    tx.update(referencia, {
      statusOperacional: "cancelado",
      motivoCancelamento: justificativa,
      canceladoEm: agora,
      canceladoPor: responsavel,
      updatedAt: agora,
    });
  });
}

export async function registrarPagamentoComprovadoAdministrativo({
  pedidoId,
  responsavel,
  referenciaBancaria,
  comprovadoEm,
  ultimosDigitosCartao,
  observacao,
}: {
  pedidoId: string;
  responsavel: string;
  referenciaBancaria: string;
  comprovadoEm: string;
  ultimosDigitosCartao: string;
  observacao: string;
}) {
  const referencia = referenciaBancaria.trim();
  const finalCartao = ultimosDigitosCartao.replace(/\D/g, "");
  const justificativa = observacao.trim();
  const dataComprovada = new Date(comprovadoEm);

  if (referencia.length < 6) throw new Error("Informe a referência bancária da venda.");
  if (!/^\d{4}$/.test(finalCartao)) throw new Error("Informe os 4 últimos dígitos do cartão.");
  if (!Number.isFinite(dataComprovada.getTime())) throw new Error("Informe a data e hora do comprovante.");
  if (dataComprovada.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new Error("A data do comprovante não pode estar no futuro.");
  }
  if (justificativa.length < 5) throw new Error("Informe uma observação com pelo menos 5 caracteres.");

  const referenciaPedido = doc(db, "pedidos", pedidoId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(referenciaPedido);
    if (!snap.exists()) throw new Error("Pedido não encontrado.");

    const pedido = snap.data();
    const statusPagamento = String(pedido.statusPagamento || "pendente").toLowerCase();
    const statusOperacional = String(pedido.statusOperacional || "").toLowerCase();

    if (pedido.origem === "parceiro" || pedido.reservaAgenciaId || pedido.agenciaId || pedido.cortesia === true) {
      throw new Error("Esta confirmação manual é somente para vendas diretas do parque.");
    }
    if (statusPagamento === "reembolsado") throw new Error("Pedido reembolsado não pode ser reativado.");
    if (statusPagamento === "pago") throw new Error("Este pedido já está pago.");
    if (!["pendente", "expirado"].includes(statusPagamento)) {
      throw new Error(`Status de pagamento não permite confirmação manual: ${statusPagamento}.`);
    }
    if (["cancelado", "bloqueado", "utilizado"].includes(statusOperacional) ||
        pedido.utilizadoEm || pedido.validadoEm) {
      throw new Error("Pedido bloqueado, cancelado ou utilizado não pode ser confirmado manualmente.");
    }

    const valor = Number(pedido.valorTotal || 0);
    if (!Number.isFinite(valor) || valor <= 0) throw new Error("Pedido com valor inválido.");

    const agora = new Date().toISOString();
    const dataPagamento = dataComprovada.toISOString();
    const atualizacao = {
      statusPagamento: "pago",
      statusOperacional: "ativo",
      formaPagamento: "cartao",
      valorPago: valor,
      pagamentoConfirmadoEm: dataPagamento,
      pagoEm: dataPagamento,
      dataPagamento,
      cartaoGateway: "sicredi-ipg",
      cartaoStatus: "aprovado_confirmado_manualmente",
      cartaoReferenciaBancaria: referencia,
      cartaoUltimosDigitos: finalCartao,
      pagamentoConfirmadoManualmente: true,
      pagamentoConfirmadoManualmenteEm: agora,
      pagamentoConfirmadoManualmentePor: responsavel,
      pagamentoConfirmadoManualmenteMotivo: justificativa,
      updatedAt: agora,
      atualizadoEm: agora,
    };

    tx.update(referenciaPedido, atualizacao);
    return atualizacao;
  });
}

export async function registrarUtilizacaoAdministrativa({
  pedidoId,
  responsavel,
  utilizadoEm,
  motivo,
}: {
  pedidoId: string;
  responsavel: string;
  utilizadoEm: string;
  motivo: string;
}) {
  const justificativa = motivo.trim();
  const dataUtilizacao = new Date(utilizadoEm);

  if (justificativa.length < 5) throw new Error("Informe uma observação com pelo menos 5 caracteres.");
  if (!Number.isFinite(dataUtilizacao.getTime())) throw new Error("Informe uma data e hora válidas.");
  if (dataUtilizacao.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new Error("A utilização não pode ser registrada no futuro.");
  }

  const referencia = doc(db, "pedidos", pedidoId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(referencia);
    if (!snap.exists()) throw new Error("Pedido não encontrado.");

    const pedido = snap.data();
    const statusPagamento = String(pedido.statusPagamento || "").toLowerCase();
    const statusOperacional = String(pedido.statusOperacional || "ativo").toLowerCase();

    if (statusPagamento !== "pago") throw new Error("Somente pedidos pagos podem ser registrados como utilizados.");
    if (pedidoReembolsado(pedido)) throw new Error(MENSAGEM_INGRESSO_REEMBOLSADO);
    if (["cancelado", "bloqueado"].includes(statusOperacional)) {
      throw new Error("Ingresso cancelado ou bloqueado não pode ser registrado como utilizado.");
    }
    if (statusOperacional === "utilizado" || pedido.utilizadoEm || pedido.validadoEm) {
      throw new Error("Este ingresso já consta como utilizado.");
    }

    const agora = new Date().toISOString();
    const data = dataUtilizacao.toISOString();
    const atualizacao = {
      statusOperacional: "utilizado",
      validadoPor: responsavel,
      validadoEm: data,
      utilizadoEm: data,
      validacaoAdministrativa: true,
      validacaoAdministrativaEm: agora,
      validacaoAdministrativaPor: responsavel,
      validacaoAdministrativaMotivo: justificativa,
      updatedAt: agora,
    };

    tx.update(referencia, atualizacao);
    return atualizacao;
  });
}

export const MENSAGEM_INGRESSO_REEMBOLSADO = "INGRESSO REEMBOLSADO — NÃO LIBERAR";

export function pedidoContaComoVenda(pedido: { statusPagamento?: unknown; ocultarNoAdmin?: unknown }) {
  return pedidoVisivelNoAdmin(pedido) && pedido.statusPagamento === "pago";
}

export function pedidoReembolsado(pedido: { statusPagamento?: unknown }) {
  return pedido.statusPagamento === "reembolsado";
}

export function pedidoPermiteRegistroReembolso(pedido: {
  statusPagamento?: unknown;
  origem?: unknown;
  reservaAgenciaId?: unknown;
  agenciaId?: unknown;
}) {
  return pedido.origem !== "parceiro" && !pedido.reservaAgenciaId && !pedido.agenciaId &&
    (pedido.statusPagamento === "pago" || pedidoReembolsado(pedido));
}

/** Registra um reembolso já concluído fora do painel. */
export async function registrarReembolsoAdministrativo(
  pedidoId: string,
  motivo: string,
  responsavel: string
) {
  const justificativa = motivo.trim();
  if (justificativa.length < 5) throw new Error("Informe um motivo com pelo menos 5 caracteres.");

  const referencia = doc(db, "pedidos", pedidoId);
  const status = {
    statusPagamento: "reembolsado",
    statusOperacional: "bloqueado",
  };

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(referencia);
    if (!snap.exists()) throw new Error("Pedido não encontrado.");
    const pedido = snap.data();
    if (!pedidoPermiteRegistroReembolso(pedido)) {
      throw new Error("O registro exige um pedido direto com pagamento confirmado.");
    }
    if (pedidoReembolsado(pedido) && pedido.statusOperacional === "bloqueado") {
      return status;
    }

    const agora = new Date().toISOString();
    const atualizacao = {
      ...status,
      motivoCancelamento: justificativa,
      canceladoEm: agora,
      canceladoPor: responsavel,
      updatedAt: agora,
    };
    tx.update(referencia, atualizacao);
    return atualizacao;
  });
}

export async function registrarValidacaoPedido(
  pedidoId: string,
  dados: Record<string, unknown>
) {
  const referencia = doc(db, "pedidos", pedidoId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(referencia);
    if (!snap.exists()) throw new Error("Pedido não encontrado.");
    if (pedidoReembolsado(snap.data())) throw new Error(MENSAGEM_INGRESSO_REEMBOLSADO);
    tx.update(referencia, { ...dados, updatedAt: new Date().toISOString() });
  });
}
