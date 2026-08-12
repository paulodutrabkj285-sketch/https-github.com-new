import {
    Pedido,
    atualizarPedido,
} from "./pedidos";

const DB_NAME = "pmn_portaria_db";
const DB_VERSION = 1;

const STORE_PEDIDOS = "pedidos";
const STORE_PENDENTES = "pendentes";

export type LocalValidacao =
    | "principal"
    | "cachoeira_mundo_novo";

/* ==========================================
   INICIAR INDEXEDDB
========================================== */

export function iniciarDB(): Promise<IDBDatabase> {
    return new Promise(
        (resolve, reject) => {
            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );

            request.onerror = () =>
                reject(
                    request.error
                );

            request.onsuccess = () =>
                resolve(
                    request.result
                );

            request.onupgradeneeded =
                (event: any) => {
                    const db =
                        event.target
                            .result;

                    if (
                        !db.objectStoreNames.contains(
                            STORE_PEDIDOS
                        )
                    ) {
                        db.createObjectStore(
                            STORE_PEDIDOS,
                            {
                                keyPath:
                                    "id",
                            }
                        );
                    }

                    if (
                        !db.objectStoreNames.contains(
                            STORE_PENDENTES
                        )
                    ) {
                        db.createObjectStore(
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
    const db =
        await iniciarDB();

    return new Promise(
        (resolve, reject) => {
            const tx =
                db.transaction(
                    STORE_PEDIDOS,
                    "readwrite"
                );

            const store =
                tx.objectStore(
                    STORE_PEDIDOS
                );

            /*
             * Atualizamos o cache
             * com a versão mais recente
             * recebida do Firestore.
             */
            store.clear();

            pedidos.forEach(
                (pedido) => {
                    store.put(
                        pedido
                    );
                }
            );

            tx.oncomplete = () =>
                resolve();

            tx.onerror = () =>
                reject(
                    tx.error
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
    const db =
        await iniciarDB();

    return new Promise(
        (resolve, reject) => {
            const tx =
                db.transaction(
                    STORE_PEDIDOS,
                    "readonly"
                );

            const store =
                tx.objectStore(
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
   REGISTRAR VALIDAÇÃO OFFLINE
========================================== */

export async function registrarValidacaoOffline(
    pedidoId: string,
    local: LocalValidacao,
    dadosValidacao: Record<
        string,
        unknown
    >
): Promise<void> {
    const db =
        await iniciarDB();

    /*
     * IMPORTANTE:
     *
     * O ID da pendência agora contém
     * pedido + local.
     *
     * Exemplo:
     *
     * abc123:principal
     * abc123:cachoeira_mundo_novo
     *
     * Dessa forma o mesmo ingresso
     * pode possuir duas validações.
     */
    const pendenciaId =
        `${pedidoId}:${local}`;

    /* ======================================
       SALVAR NA FILA
    ====================================== */

    await new Promise<void>(
        (
            resolve,
            reject
        ) => {
            const tx =
                db.transaction(
                    STORE_PENDENTES,
                    "readwrite"
                );

            const store =
                tx.objectStore(
                    STORE_PENDENTES
                );

            store.put({
                id:
                    pendenciaId,

                pedidoId,

                local,

                dados:
                    dadosValidacao,

                criadoEm:
                    new Date().toISOString(),
            });

            tx.oncomplete =
                () =>
                    resolve();

            tx.onerror =
                () =>
                    reject(
                        tx.error
                    );
        }
    );

    /* ======================================
       ATUALIZAR CACHE IMEDIATAMENTE
    ====================================== */

    await new Promise<void>(
        (
            resolve,
            reject
        ) => {
            const tx =
                db.transaction(
                    STORE_PEDIDOS,
                    "readwrite"
                );

            const store =
                tx.objectStore(
                    STORE_PEDIDOS
                );

            const getReq =
                store.get(
                    pedidoId
                );

            getReq.onsuccess =
                () => {
                    const pedidoExistente =
                        getReq.result;

                    if (
                        pedidoExistente
                    ) {
                        const atualizado =
                        {
                            ...pedidoExistente,

                            ...dadosValidacao,
                        };

                        store.put(
                            atualizado
                        );
                    }

                    resolve();
                };

            getReq.onerror =
                () =>
                    reject(
                        getReq.error
                    );
        }
    );
}

/* ==========================================
   OBTER FILA PENDENTE
========================================== */

export async function obterPendentes(): Promise<
    any[]
> {
    const db =
        await iniciarDB();

    return new Promise(
        (resolve, reject) => {
            const tx =
                db.transaction(
                    STORE_PENDENTES,
                    "readonly"
                );

            const store =
                tx.objectStore(
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
    pendenciaId: string
) {
    const db =
        await iniciarDB();

    await new Promise<void>(
        (
            resolve,
            reject
        ) => {
            const tx =
                db.transaction(
                    STORE_PENDENTES,
                    "readwrite"
                );

            const store =
                tx.objectStore(
                    STORE_PENDENTES
                );

            store.delete(
                pendenciaId
            );

            tx.oncomplete =
                () =>
                    resolve();

            tx.onerror =
                () =>
                    reject(
                        tx.error
                    );
        }
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

    let sucessoCount = 0;

    for (
        const item
        of pendentes
    ) {
        try {
            /*
             * Compatibilidade com
             * possíveis pendências antigas.
             */
            const pedidoId =
                item.pedidoId ||
                item.id;

            /*
             * Formato novo.
             */
            if (
                item.dados &&
                typeof item.dados ===
                "object"
            ) {
                await atualizarPedido(
                    pedidoId,
                    item.dados
                );
            } else {
                /*
                 * Compatibilidade com
                 * formato antigo.
                 */
                await atualizarPedido(
                    pedidoId,
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
        } catch (error) {
            console.error(
                `Erro ao sincronizar validação ${item.id}:`,
                error
            );

            /*
             * Não remove.
             * Tenta novamente
             * na próxima sincronização.
             */
        }
    }

    return sucessoCount;
}