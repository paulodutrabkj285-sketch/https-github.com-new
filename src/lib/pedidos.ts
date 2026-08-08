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

  // Controle da portaria
  validadoPor?: string;
  validadoEm?: string;
  utilizadoEm?: string;

  // Lembretes de compra pendente
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

  // Controle de Pix expirado
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
  const numero =
    Math.floor(
      10000 +
      Math.random() * 90000
    );

  return `PMN-${numero}`;
}

/* ==========================================
   EXPIRAÇÃO DO PIX
========================================== */

function gerarExpiracaoPix() {
  const agora = new Date();

  agora.setHours(
    agora.getHours() + 1
  );

  return agora.toISOString();
}

/*
 * Verifica se um pedido pendente já ultrapassou
 * o horário limite do Pix.
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

  if (!pedido.expiracaoPix) {
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

  return Date.now() > expiracao;
}

/*
 * Atualiza automaticamente os pedidos
 * cujo Pix venceu.
 *
 * IMPORTANTE:
 * somente pedidos "pendente" são alterados.
 *
 * Um pedido pago nunca será marcado
 * como expirado por esta função.
 */
async function atualizarPixExpirados(
  pedidos: Pedido[]
) {
  const expirados =
    pedidos.filter(
      pixEstaExpirado
    );

  if (
    expirados.length === 0
  ) {
    return pedidos;
  }

  const agora =
    new Date().toISOString();

  await Promise.all(
    expirados.map(
      async (pedido) => {
        try {
          const ref = doc(
            db,
            "pedidos",
            pedido.id
          );

          await updateDoc(
            ref,
            {
              statusPagamento:
                "expirado",

              statusOperacional:
                "expirado",

              pixExpiradoEm:
                agora,

              updatedAt:
                agora,
            }
          );

          /*
           * Atualiza também o objeto em memória
           * para o painel mostrar "expirado"
           * imediatamente.
           */
          pedido.statusPagamento =
            "expirado";

          pedido.statusOperacional =
            "expirado";

          pedido.pixExpiradoEm =
            agora;

          pedido.updatedAt =
            agora;

          console.log(
            "PIX EXPIRADO:",
            {
              pedidoId:
                pedido.id,

              expiracaoPix:
                pedido.expiracaoPix,
            }
          );
        } catch (error) {
          /*
           * Se um pedido individual falhar,
           * não derruba toda a listagem.
           */
          console.error(
            "ERRO AO MARCAR PIX COMO EXPIRADO:",
            {
              pedidoId:
                pedido.id,

              error,
            }
          );
        }
      }
    )
  );

  return pedidos;
}

/* ==========================================
   CPF
========================================== */

function limparCpf(
  valor: string
) {
  return String(
    valor || ""
  ).replace(/\D/g, "");
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
          new Date().toISOString(),
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
  const ref = doc(
    db,
    "pedidos",
    pedidoId
  );

  await updateDoc(
    ref,
    {
      ...dados,

      updatedAt:
        new Date().toISOString(),
    }
  );
}

/* ==========================================
   BUSCAR POR ID
========================================== */

export async function buscarPedidoPorId(
  pedidoId: string
): Promise<Pedido | null> {
  const ref = doc(
    db,
    "pedidos",
    pedidoId
  );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,

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

  if (!txidLimpo) {
    return null;
  }

  const q = query(
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
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const docItem =
    snap.docs[0];

  return {
    id: docItem.id,

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
    limparCpf(cpf);

  if (!cpfLimpo) {
    return [];
  }

  const q = query(
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
    await getDocs(q);

  const pedidos =
    snap.docs.map(
      (docItem) => ({
        id: docItem.id,

        ...docItem.data(),
      })
    ) as Pedido[];

  /*
   * Também verifica se algum pedido
   * desse CPF possui Pix expirado.
   */
  return await atualizarPixExpirados(
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

  if (!codigoLimpo) {
    return null;
  }

  const q = query(
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
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  const docItem =
    snap.docs[0];

  const pedido = {
    id: docItem.id,

    ...docItem.data(),
  } as Pedido;

  /*
   * Se for um pedido pendente
   * cujo Pix venceu, atualiza.
   */
  const resultado =
    await atualizarPixExpirados(
      [pedido]
    );

  return resultado[0];
}

/* ==========================================
   LISTAGEM GERAL / ADMIN
========================================== */

export async function listarPedidos() {
  const q = query(
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
    await getDocs(q);

  const pedidos =
    snap.docs.map(
      (docItem) => ({
        id: docItem.id,

        ...docItem.data(),
      })
    ) as Pedido[];

  /*
   * Toda vez que o Admin carregar
   * a lista de pedidos, os Pix vencidos
   * serão automaticamente marcados
   * como "expirado".
   */
  return await atualizarPixExpirados(
    pedidos
  );
}

/* ==========================================
   PORTARIA
========================================== */

/*
 * A portaria recebe SOMENTE pedidos pagos.
 *
 * Pedidos:
 *
 * pendente
 * expirado
 * cancelado
 * valor_divergente
 *
 * nunca entram na lista da portaria.
 */

export async function listarPedidosAtivosPortaria() {
  const q = query(
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
    await getDocs(q);

  const pedidos =
    snap.docs.map(
      (docItem) => ({
        id: docItem.id,

        ...docItem.data(),
      })
    ) as Pedido[];

  /*
   * Ordena do mais recente
   * para o mais antigo.
   *
   * Fazemos no JavaScript para
   * não precisar de índice composto.
   */
  pedidos.sort(
    (a, b) => {
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
      (pedido) =>
        pedido.statusPagamento ===
        "pago"
    );

  /*
   * Agora pendente significa
   * realmente pagamento ainda
   * dentro do prazo.
   */
  const pedidosPendentes =
    pedidos.filter(
      (pedido) =>
        pedido.statusPagamento ===
        "pendente"
    );

  const pedidosExpirados =
    pedidos.filter(
      (pedido) =>
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

  const taxaPercentual =
    4.99;

  const valorTaxas =
    faturamentoBruto *
    (taxaPercentual /
      100);

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