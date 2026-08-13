import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

export type PedidoInput = {
  produto: string;
  tipo: string;

  nome: string;
  cpf: string;
  telefone: string;
  email: string;

  dataVisita?: string;
  dataEntrada?: string;

  noites?: number;
  quantidadePessoas?: number;

  quantidade: number;

  valorUnitario: number;
  valorTotal: number;

  statusPagamento: string;
  statusOperacional: string;

  pagbankCheckoutId?: string;
  pagbankReferenceId?: string;
  pagbankPayUrl?: string;
  pagbankStatus?: string;

  codigoIngresso?: string;
  qrCodeIngresso?: string;

  // Controle da portaria principal
  validadoPor?: string;
  validadoEm?: string;
  utilizadoEm?: string;

  // Cachoeira Mundo Novo
  cachoeiraMundoNovoValidado?: boolean;
  cachoeiraMundoNovoValidadoPor?: string;
  cachoeiraMundoNovoValidadoEm?: string;

  // Lembretes
  lembrete24hEnviado?: boolean;
  lembrete24hEnviadoEm?: string;

  lembrete7dEnviado?: boolean;
  lembrete7dEnviadoEm?: string;

  // Cartão
  formaPagamento?: string;
  parcelas?: number;
  cartaoStatus?: string;
  cartaoGateway?: string;
  cartaoTransactionId?: string;
};

export type Pedido = PedidoInput & {
  id: string;

  createdAt?: string;
  updatedAt?: string;

  expiracaoPix?: string;

  pixExpiradoEm?: string;

  sicrediTxid?: string;
  sicrediStatus?: string;
  sicrediPixCopiaCola?: string;
  sicrediLocation?: string;

  valorPago?: number;

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
========================================== */

function gerarCodigoIngresso() {
  const numero = Math.floor(
    10000 +
    Math.random() * 90000
  );

  return `PMN-${numero}`;
}

/* ==========================================
   EXPIRAÇÃO DO PIX
========================================== */

function gerarExpiracaoPix() {
  const agora =
    new Date();

  agora.setHours(
    agora.getHours() + 1
  );

  return agora.toISOString();
}

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
========================================== */

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
========================================== */

export async function criarPedido(
  dados: PedidoInput
) {
  const codigoIngresso =
    dados.codigoIngresso ||
    gerarCodigoIngresso();

  const ref =
    await addDoc(
      collection(
        db,
        "pedidos"
      ),
      {
        ...dados,

        codigoIngresso,

        expiracaoPix:
          gerarExpiracaoPix(),

        createdAt:
          new Date()
            .toISOString(),
      }
    );

  return ref.id;
}

/* ==========================================
   ATUALIZAÇÃO DO PEDIDO
========================================== */

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
========================================== */

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
    id:
      snap.id,

    ...snap.data(),
  } as Pedido;
}

/* ==========================================
   BUSCAR POR TXID SICREDI
========================================== */

export async function buscarPedidoPorTxid(
  txid: string
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
        "sicrediTxid",
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
    id:
      docItem.id,

    ...docItem.data(),
  } as Pedido;
}

/* ==========================================
   BUSCAR PEDIDOS POR CPF
========================================== */

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
========================================== */

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
========================================== */

export async function listarPedidos() {
  const q =
    query(
      collection(
        db,
        "pedidos"
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
   * IMPORTANTE:
   *
   * O painel pode mostrar
   * "expirado", mas NÃO grava
   * isso no Firestore.
   *
   * Uma simples abertura do
   * dashboard não pode alterar
   * o estado bancário do pedido.
   */
  return aplicarExpiracaoVisual(
    pedidos
  );
}

/* ==========================================
   PORTARIA
========================================== */

export async function listarPedidosAtivosPortaria() {
  const q =
    query(
      collection(
        db,
        "pedidos"
      ),

      where(
        "statusPagamento",
        "==",
        "pago"
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
========================================== */

export function calcularResumoFinanceiro(
  pedidos: Pedido[]
) {
  const totalPedidos =
    pedidos.length;

  const pedidosPagos =
    pedidos.filter(
      (
        pedido
      ) =>
        pedido.statusPagamento ===
        "pago"
    );

  const pedidosPendentes =
    pedidos.filter(
      (
        pedido
      ) =>
        pedido.statusPagamento ===
        "pendente"
    );

  const pedidosExpirados =
    pedidos.filter(
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
   * Depois podemos corrigir
   * separadamente as taxas do
   * Pix/cartão no dashboard.
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