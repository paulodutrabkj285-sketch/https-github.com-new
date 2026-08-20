import {
    Pedido,
    atualizarPedido,
} from "./pedidos";

import { db } from "./firebase";

import {
    doc,
    updateDoc,
} from "firebase/firestore";

/* ==========================================
   BANCO LOCAL
========================================== */

const DB_NAME =
    "pmn_portaria_db";

/*
 * Versão 2:
 * adiciona cache das reservas
 * de agências.
 */
const DB_VERSION = 2;

const STORE_PEDIDOS =
    "pedidos";

const STORE_RESERVAS =
    "reservas_agencias";

const STORE_PENDENTES =
    "pendentes";

/* ==========================================
   TIPOS
========================================== */

export type LocalValidacao =
    | "principal"
    | "cachoeira_mundo_novo";

export type TipoEntidadePortaria =
    | "pedido"
    | "reserva_agencia";

export type ReservaAgenciaCache = {
    id: string;

    agenciaId?: string;
    agenciaNome?: string;
    agenciaResponsavel?: string;
    agenciaDocumento?: string;
    agenciaCadastur?: string;
    agenciaEmail?: string;
    agenciaWhatsapp?: string;

    dataVisita?: string;
    horaPrevista?: string;
    tipoVeiculo?: string;

    adultos?: number;
    idosos?: number;
    totalVisitantes?: number;

    elevador?: boolean;
    qtdElevador?: number;

    valorBruto?: number;
    valorDesconto?: number;
    valorFinal?: number;

    descontoAplicado?: number;

    codigoGrupo?: string;
    qrCodeGrupo?: string;

    modalidadePagamento?: string;

    statusPagamento?: string;
    formaPagamento?: string;

    pagamentoNaChegada?: boolean;

    statusOperacional?: string;

    pagamentoConfirmadoEm?: string;
    pagamentoConfirmadoPor?: string;

    validadoPor?: string;
    validadoEm?: string;
    utilizadoEm?: string;

    quantidadeValidada?: number;

    cachoeiraMundoNovoValidado?: boolean;
    cachoeiraMundoNovoValidadoPor?: string;
    cachoeiraMundoNovoValidadoEm?: string;

    observacoes?: string;

    [key: string]:
    unknown;
};

/* ==========================================
   INICIAR INDEXEDDB
========================================== */

export function iniciarDB(): Promise<IDBDatabase> {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );

            request.onerror =
                () =>
                    reject(
                        request.error
                    );

            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );

            request.onupgradeneeded =
                (
                    event: IDBVersionChangeEvent
                ) => {
                    const requestUpgrade =
                        event.target as
                        IDBOpenDBRequest;

                    const banco =
                        requestUpgrade.result;

                    /* PEDIDOS */

                    if (
                        !banco.objectStoreNames.contains(
                            STORE_PEDIDOS
                        )
                    ) {
                        banco.createObjectStore(
                            STORE_PEDIDOS,
                            {
                                keyPath:
                                    "id",
                            }
                        );
                    }

                    /* RESERVAS DE AGÊNCIAS */

                    if (
                        !banco.objectStoreNames.contains(
                            STORE_RESERVAS
                        )
                    ) {
                        banco.createObjectStore(
                            STORE_RESERVAS,
                            {
                                keyPath:
                                    "id",
                            }
                        );
                    }

                    /* FILA OFFLINE */

                    if (
                        !banco.objectStoreNames.contains(
                            STORE_PENDENTES
                        )
                    ) {
                        banco.createObjectStore(
                            STORE_PENDENTES,
                            {
                                keyPath:
                                    "id",
                            }
                        );
                    }
                };
        }
    );
}

/* ==========================================
   SALVAR PEDIDOS NO CACHE
========================================== */

export async function salvarPedidosLocalmente(
    pedidos: Pedido[]
): Promise<void> {
    const banco =
        await iniciarDB();

    return new Promise(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    STORE_PEDIDOS,
                    "readwrite"
                );

            const store =
                transacao.objectStore(
                    STORE_PEDIDOS
                );

            store.clear();

            pedidos.forEach(
                (
                    pedido
                ) => {
                    store.put(
                        pedido
                    );
                }
            );

            transacao.oncomplete =
                () =>
                    resolve();

            transacao.onerror =
                () =>
                    reject(
                        transacao.error
                    );
        }
    );
}

/* ==========================================
   LISTAR PEDIDOS DO CACHE
========================================== */

export async function listarPedidosLocalmente(): Promise<
    Pedido[]
> {
    const banco =
        await iniciarDB();

    return new Promise(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    STORE_PEDIDOS,
                    "readonly"
                );

            const store =
                transacao.objectStore(
                    STORE_PEDIDOS
                );

            const request =
                store.getAll();

            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );

            request.onerror =
                () =>
                    reject(
                        request.error
                    );
        }
    );
}

/* ==========================================
   SALVAR RESERVAS NO CACHE
========================================== */

export async function salvarReservasAgenciasLocalmente(
    reservas:
        ReservaAgenciaCache[]
): Promise<void> {
    const banco =
        await iniciarDB();

    return new Promise(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    STORE_RESERVAS,
                    "readwrite"
                );

            const store =
                transacao.objectStore(
                    STORE_RESERVAS
                );

            store.clear();

            reservas.forEach(
                (
                    reserva
                ) => {
                    store.put(
                        reserva
                    );
                }
            );

            transacao.oncomplete =
                () =>
                    resolve();

            transacao.onerror =
                () =>
                    reject(
                        transacao.error
                    );
        }
    );
}

/* ==========================================
   LISTAR RESERVAS DO CACHE
========================================== */

export async function listarReservasAgenciasLocalmente(): Promise<
    ReservaAgenciaCache[]
> {
    const banco =
        await iniciarDB();

    return new Promise(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    STORE_RESERVAS,
                    "readonly"
                );

            const store =
                transacao.objectStore(
                    STORE_RESERVAS
                );

            const request =
                store.getAll();

            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );

            request.onerror =
                () =>
                    reject(
                        request.error
                    );
        }
    );
}

/* ==========================================
   ATUALIZAR ITEM LOCAL
========================================== */

async function atualizarCacheLocal(
    storeName: string,
    id: string,
    dados:
        Record<
            string,
            unknown
        >
): Promise<void> {
    const banco =
        await iniciarDB();

    await new Promise<void>(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    storeName,
                    "readwrite"
                );

            const store =
                transacao.objectStore(
                    storeName
                );

            const getRequest =
                store.get(
                    id
                );

            getRequest.onsuccess =
                () => {
                    const existente =
                        getRequest.result;

                    if (
                        existente
                    ) {
                        store.put({
                            ...existente,
                            ...dados,
                        });
                    }

                    resolve();
                };

            getRequest.onerror =
                () =>
                    reject(
                        getRequest.error
                    );
        }
    );
}

/* ==========================================
   SALVAR PENDÊNCIA
========================================== */

async function salvarPendencia(
    tipoEntidade:
        TipoEntidadePortaria,

    entidadeId:
        string,

    local:
        LocalValidacao,

    dados:
        Record<
            string,
            unknown
        >
): Promise<void> {
    const banco =
        await iniciarDB();

    const pendenciaId =
        `${tipoEntidade}:${entidadeId}:${local}`;

    await new Promise<void>(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    STORE_PENDENTES,
                    "readwrite"
                );

            const store =
                transacao.objectStore(
                    STORE_PENDENTES
                );

            store.put({
                id:
                    pendenciaId,

                tipoEntidade,

                entidadeId,

                /*
                 * Compatibilidade
                 * com formato antigo.
                 */
                pedidoId:
                    tipoEntidade ===
                        "pedido"
                        ? entidadeId
                        : "",

                reservaAgenciaId:
                    tipoEntidade ===
                        "reserva_agencia"
                        ? entidadeId
                        : "",

                local,

                dados,

                criadoEm:
                    new Date()
                        .toISOString(),
            });

            transacao.oncomplete =
                () =>
                    resolve();

            transacao.onerror =
                () =>
                    reject(
                        transacao.error
                    );
        }
    );
}

/* ==========================================
   REGISTRAR PEDIDO OFFLINE
========================================== */

export async function registrarValidacaoOffline(
    pedidoId: string,
    local:
        LocalValidacao,
    dadosValidacao:
        Record<
            string,
            unknown
        >
): Promise<void> {
    await salvarPendencia(
        "pedido",
        pedidoId,
        local,
        dadosValidacao
    );

    await atualizarCacheLocal(
        STORE_PEDIDOS,
        pedidoId,
        dadosValidacao
    );
}

/* ==========================================
   REGISTRAR RESERVA OFFLINE
========================================== */

export async function registrarValidacaoReservaOffline(
    reservaId:
        string,

    local:
        LocalValidacao,

    dadosValidacao:
        Record<
            string,
            unknown
        >
): Promise<void> {
    await salvarPendencia(
        "reserva_agencia",
        reservaId,
        local,
        dadosValidacao
    );

    await atualizarCacheLocal(
        STORE_RESERVAS,
        reservaId,
        dadosValidacao
    );
}

/* ==========================================
   OBTER FILA PENDENTE
========================================== */

export async function obterPendentes(): Promise<
    any[]
> {
    const banco =
        await iniciarDB();

    return new Promise(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    STORE_PENDENTES,
                    "readonly"
                );

            const store =
                transacao.objectStore(
                    STORE_PENDENTES
                );

            const request =
                store.getAll();

            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );

            request.onerror =
                () =>
                    reject(
                        request.error
                    );
        }
    );
}

/* ==========================================
   REMOVER PENDÊNCIA
========================================== */

async function removerPendencia(
    pendenciaId:
        string
) {
    const banco =
        await iniciarDB();

    await new Promise<void>(
        (
            resolve,
            reject
        ) => {
            const transacao =
                banco.transaction(
                    STORE_PENDENTES,
                    "readwrite"
                );

            const store =
                transacao.objectStore(
                    STORE_PENDENTES
                );

            store.delete(
                pendenciaId
            );

            transacao.oncomplete =
                () =>
                    resolve();

            transacao.onerror =
                () =>
                    reject(
                        transacao.error
                    );
        }
    );
}

/* ==========================================
   ATUALIZAR RESERVA NA NUVEM
========================================== */

async function atualizarReservaAgencia(
    reservaId:
        string,

    dados:
        Record<
            string,
            unknown
        >
) {
    const referencia =
        doc(
            db,
            "reservas_agencias",
            reservaId
        );

    await updateDoc(
        referencia,
        dados
    );
}

/* ==========================================
   SINCRONIZAR PENDÊNCIAS
========================================== */

export async function sincronizarPendentes(): Promise<number> {
    const pendentes =
        await obterPendentes();

    if (
        pendentes.length ===
        0
    ) {
        return 0;
    }

    let sucessoCount =
        0;

    for (
        const item
        of pendentes
    ) {
        try {
            const tipoEntidade:
                TipoEntidadePortaria =
                item.tipoEntidade ||
                "pedido";

            const entidadeId =
                item.entidadeId ||
                item.reservaAgenciaId ||
                item.pedidoId ||
                item.id;

            const dados =
                item.dados &&
                    typeof item.dados ===
                    "object"
                    ? item.dados
                    : null;

            /* ==================================
               RESERVA DE AGÊNCIA
            ================================== */

            if (
                tipoEntidade ===
                "reserva_agencia"
            ) {
                if (
                    !dados
                ) {
                    throw new Error(
                        "Dados da reserva offline não encontrados."
                    );
                }

                await atualizarReservaAgencia(
                    entidadeId,
                    dados
                );

                await removerPendencia(
                    item.id
                );

                sucessoCount++;

                continue;
            }

            /* ==================================
               PEDIDO NORMAL
            ================================== */

            if (
                dados
            ) {
                await atualizarPedido(
                    entidadeId,
                    dados
                );
            } else {
                /*
                 * Compatibilidade
                 * com validações antigas.
                 */
                await atualizarPedido(
                    entidadeId,
                    {
                        statusOperacional:
                            item.statusOperacional,

                        validadoPor:
                            item.validadoPor,

                        validadoEm:
                            item.validadoEm,

                        utilizadoEm:
                            item.utilizadoEm,
                    }
                );
            }

            await removerPendencia(
                item.id
            );

            sucessoCount++;
        } catch (
        error
        ) {
            console.error(
                `Erro ao sincronizar validação ${item.id}:`,
                error
            );

            /*
             * Não remove a pendência.
             * Tenta novamente quando
             * a internet voltar.
             */
        }
    }

    return sucessoCount;
}