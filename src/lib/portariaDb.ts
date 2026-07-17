import { Pedido, atualizarPedido } from "./pedidos";

const DB_NAME = "pmn_portaria_db";
const DB_VERSION = 1;
const STORE_PEDIDOS = "pedidos";
const STORE_PENDENTES = "pendentes";

// Inicializa o IndexedDB local com duas stores: uma para cache de pedidos e outra para a fila de envio
export function iniciarDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_PEDIDOS)) {
                db.createObjectStore(STORE_PEDIDOS, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(STORE_PENDENTES)) {
                db.createObjectStore(STORE_PENDENTES, { keyPath: "id" });
            }
        };
    });
}

// Salva a lista de pedidos vinda do Firestore no cache local
export async function salvarPedidosLocalmente(pedidos: Pedido[]): Promise<void> {
    const db = await iniciarDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PEDIDOS, "readwrite");
        const store = tx.objectStore(STORE_PEDIDOS);

        // Limpa registros antigos para evitar duplicidades obsoletas
        store.clear();

        pedidos.forEach((pedido) => {
            store.put(pedido);
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Recupera todos os pedidos salvos no IndexedDB
export async function listarPedidosLocalmente(): Promise<Pedido[]> {
    const db = await iniciarDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PEDIDOS, "readonly");
        const store = tx.objectStore(STORE_PEDIDOS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Adiciona uma validação offline na fila de pendências e atualiza o estado no cache local imediato
export async function registrarValidacaoOffline(
    pedidoId: string,
    dadosValidacao: { statusOperacional: string; validadoPor: string; validadoEm: string; utilizadoEm: string }
): Promise<void> {
    const db = await iniciarDB();

    // 1. Salva na fila de sincronização pendente
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PENDENTES, "readwrite");
        const store = tx.objectStore(STORE_PENDENTES);
        store.put({ id: pedidoId, ...dadosValidacao });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });

    // 2. Atualiza imediatamente o cache de leitura local para evitar reuso do mesmo ingresso enquanto offline
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PEDIDOS, "readwrite");
        const store = tx.objectStore(STORE_PEDIDOS);
        const getReq = store.get(pedidoId);

        getReq.onsuccess = () => {
            const pedidoExistente = getReq.result;
            if (pedidoExistente) {
                const atualizado = { ...pedidoExistente, ...dadosValidacao };
                store.put(atualizado);
            }
            resolve();
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

// Retorna as validações pendentes de envio ao servidor
export async function obterPendentes(): Promise<any[]> {
    const db = await iniciarDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_PENDENTES, "readonly");
        const store = tx.objectStore(STORE_PENDENTES);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Sincroniza a fila pendente local com o Firestore (Online)
export async function sincronizarPendentes(): Promise<number> {
    const pendentes = await obterPendentes();
    if (pendentes.length === 0) return 0;

    let sucessoCount = 0;
    for (const item of pendentes) {
        try {
            // Atualiza o Firestore usando a função existente
            await atualizarPedido(item.id, {
                statusOperacional: item.statusOperacional,
                validadoPor: item.validadoPor,
                validadoEm: item.validadoEm,
                utilizadoEm: item.utilizadoEm,
            });

            // Remove da fila pendente local após sucesso
            const db = await iniciarDB();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_PENDENTES, "readwrite");
                const store = tx.objectStore(STORE_PENDENTES);
                store.delete(item.id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });

            sucessoCount++;
        } catch (error) {
            console.error(`Erro ao sincronizar pedido ${item.id}:`, error);
            // Mantém na fila local para tentar de novo no próximo ciclo de sincronização
        }
    }
    return sucessoCount;
}