import {
    Pedido,
    atualizarPedido,
} from "./pedidos";

import { db } from "./firebase";

import {
    calcularBeneficioProximoMes,
    calcularCategoriaPorPontos,
    calcularDescontoCategoria,
    calcularPontosReserva,
    obterMesReferencia,
} from "./agencias";

import {
    doc,
    runTransaction,
    updateDoc,
} from "firebase/firestore";

/* ==========================================
   BANCO LOCAL
========================================== */

const DB_NAME = "pmn_portaria_db";
const DB_VERSION = 3;

const STORE_PEDIDOS = "pedidos";
const STORE_RESERVAS = "reservas_agencias";
const STORE_PENDENTES = "pendentes";

/* ==========================================
   TIPOS
========================================== */

export type LocalValidacao =
    | "principal"
    | "cachoeira_mundo_novo"
    | "elevador";

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
    criancas?: number;
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

    /* PROGRAMA DE PARCEIROS */

    pontosPotenciaisReserva?: number;
    pontosCreditados?: boolean;
    pontosCreditadosEm?: string;
    pontosCreditadosQuantidade?: number;
    statusPontosPrograma?: string;

    cachoeiraMundoNovoValidado?: boolean;
    cachoeiraMundoNovoValidadoPor?: string;
    cachoeiraMundoNovoValidadoEm?: string;

    elevadorValidado?: boolean;
    elevadorValidadoPor?: string;
    elevadorValidadoEm?: string;
    elevadorQuantidadeValidada?: number;

    observacoes?: string;

    [key: string]: unknown;
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
                        event.target as IDBOpenDBRequest;

                    const banco =
                        requestUpgrade.result;

                    if (
                        !banco.objectStoreNames.contains(
                            STORE_PEDIDOS
                        )
                    ) {
                        banco.createObjectStore(
                            STORE_PEDIDOS,
                            {
                                keyPath: "id",
                            }
                        );
                    }

                    if (
                        !banco.objectStoreNames.contains(
                            STORE_RESERVAS
                        )
                    ) {
                        banco.createObjectStore(
                            STORE_RESERVAS,
                            {
                                keyPath: "id",
                            }
                        );
                    }

                    if (
                        !banco.objectStoreNames.contains(
                            STORE_PENDENTES
                        )
                    ) {
                        banco.createObjectStore(
                            STORE_PENDENTES,
                            {
                                keyPath: "id",
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
   ATUALIZAÇÃO NORMAL DA RESERVA
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
   RESERVA + PONTUAÇÃO DO PARCEIRO
========================================== */

/*
 * Esta é a função central da nova regra.
 *
 * Ela é utilizada:
 *
 * 1. quando a portaria está ONLINE;
 * 2. quando uma validação OFFLINE é
 *    sincronizada posteriormente.
 *
 * A transação protege contra pontuação
 * duplicada.
 */

export async function atualizarReservaAgenciaComPontuacao(
    reservaId:
        string,

    local:
        LocalValidacao,

    dados:
        Record<
            string,
            unknown
        >
) {
    /*
     * Cachoeira e elevador não geram
     * nova pontuação.
     */

    if (
        local !==
        "principal"
    ) {
        await atualizarReservaAgencia(
            reservaId,
            dados
        );

        return {
            pontosCreditados:
                false,

            quantidade:
                0,
        };
    }

    const reservaRef =
        doc(
            db,
            "reservas_agencias",
            reservaId
        );

    return await runTransaction(
        db,
        async (
            transaction
        ) => {
            /* ==================================
               LER RESERVA
            ================================== */

            const reservaSnap =
                await transaction.get(
                    reservaRef
                );

            if (
                !reservaSnap.exists()
            ) {
                throw new Error(
                    "Reserva de agência não encontrada."
                );
            }

            const reserva =
                reservaSnap.data() as
                ReservaAgenciaCache;

            /*
             * Se por algum motivo a mesma
             * validação chegar novamente,
             * atualizamos a reserva, mas NÃO
             * pontuamos outra vez.
             */

            if (
                reserva.pontosCreditados ===
                true
            ) {
                transaction.update(
                    reservaRef,
                    dados
                );

                return {
                    pontosCreditados:
                        false,

                    jaCreditado:
                        true,

                    quantidade:
                        Number(
                            reserva.pontosCreditadosQuantidade ||
                            reserva.pontosPotenciaisReserva ||
                            0
                        ),
                };
            }

            const agenciaId =
                String(
                    reserva.agenciaId ||
                    ""
                ).trim();

            /*
             * Reserva antiga sem agência
             * identificada continua podendo
             * ser validada, mas não há onde
             * creditar pontos.
             */

            if (
                !agenciaId
            ) {
                transaction.update(
                    reservaRef,
                    {
                        ...dados,

                        statusPontosPrograma:
                            "sem_agencia",

                        pontosCreditados:
                            false,
                    }
                );

                return {
                    pontosCreditados:
                        false,

                    semAgencia:
                        true,

                    quantidade:
                        0,
                };
            }

            /* ==================================
               LER AGÊNCIA
            ================================== */

            const agenciaRef =
                doc(
                    db,
                    "agencias",
                    agenciaId
                );

            const agenciaSnap =
                await transaction.get(
                    agenciaRef
                );

            if (
                !agenciaSnap.exists()
            ) {
                /*
                 * Não impedimos a entrada.
                 * Apenas registramos que os
                 * pontos precisam de revisão.
                 */

                transaction.update(
                    reservaRef,
                    {
                        ...dados,

                        statusPontosPrograma:
                            "agencia_nao_encontrada",

                        pontosCreditados:
                            false,
                    }
                );

                return {
                    pontosCreditados:
                        false,

                    agenciaNaoEncontrada:
                        true,

                    quantidade:
                        0,
                };
            }

            const agencia =
                agenciaSnap.data();

            /* ==================================
               QUANTIDADES
            ================================== */

            const adultos =
                Math.max(
                    0,
                    Number(
                        reserva.adultos ||
                        0
                    )
                );

            const idosos =
                Math.max(
                    0,
                    Number(
                        reserva.idosos ||
                        0
                    )
                );

            const criancas =
                Math.max(
                    0,
                    Number(
                        reserva.criancas ||
                        0
                    )
                );

            /*
             * Não confiamos apenas no valor
             * gravado pela página da reserva.
             *
             * Recalculamos usando a regra
             * central do programa.
             */

            const pontosReserva =
                calcularPontosReserva(
                    adultos,
                    idosos,
                    criancas
                );

            /* ==================================
               MÊS
            ================================== */

            const mesAtual =
                obterMesReferencia();

            const mesSalvo =
                String(
                    agencia.mesReferenciaPontos ||
                    ""
                );

            let pontosAtuais =
                Number(
                    agencia.pontosMesAtual ||
                    0
                );

            let adultosAtuais =
                Number(
                    agencia.totalAdultosMes ||
                    0
                );

            let idososAtuais =
                Number(
                    agencia.totalIdososMes ||
                    0
                );

            let criancasAtuais =
                Number(
                    agencia.totalCriancasMes ||
                    0
                );

            let visitantesAtuais =
                Number(
                    agencia.totalVisitantesMes ||
                    0
                );

            let pontosMesAnterior =
                Number(
                    agencia.pontosMesAnterior ||
                    0
                );

            let categoriaAtual =
                String(
                    agencia.categoria ||
                    "Bronze"
                );

            let descontoAtual =
                Number(
                    agencia.descontoPadrao ||
                    5
                );

            /*
             * Se mudou o mês, o desempenho
             * anterior vira o benefício atual.
             */

            if (
                mesSalvo &&
                mesSalvo !==
                mesAtual
            ) {
                pontosMesAnterior =
                    pontosAtuais;

                const categoriaConquistada =
                    calcularCategoriaPorPontos(
                        pontosAtuais
                    );

                categoriaAtual =
                    categoriaConquistada;

                descontoAtual =
                    calcularDescontoCategoria(
                        categoriaConquistada
                    );

                pontosAtuais =
                    0;

                adultosAtuais =
                    0;

                idososAtuais =
                    0;

                criancasAtuais =
                    0;

                visitantesAtuais =
                    0;
            }

            /* ==================================
               NOVOS TOTAIS
            ================================== */

            const novosPontos =
                Number(
                    (
                        pontosAtuais +
                        pontosReserva
                    ).toFixed(1)
                );

            const novosAdultos =
                adultosAtuais +
                adultos;

            const novosIdosos =
                idososAtuais +
                idosos;

            const novasCriancas =
                criancasAtuais +
                criancas;

            const visitantesReserva =
                adultos +
                idosos +
                criancas;

            const novosVisitantes =
                visitantesAtuais +
                visitantesReserva;

            /*
             * Histórico geral.
             */

            const totalVisitantesHistorico =
                Number(
                    agencia.totalVisitantes ||
                    0
                ) +
                visitantesReserva;

            /* ==================================
               BENEFÍCIO DO PRÓXIMO MÊS
            ================================== */

            const beneficioProximoMes =
                calcularBeneficioProximoMes(
                    novosPontos
                );

            const agora =
                new Date()
                    .toISOString();

            /* ==================================
               ATUALIZAR AGÊNCIA
            ================================== */

            transaction.update(
                agenciaRef,
                {
                    categoria:
                        categoriaAtual,

                    descontoPadrao:
                        descontoAtual,

                    pontosMesAtual:
                        novosPontos,

                    pontosMesAnterior,

                    mesReferenciaPontos:
                        mesAtual,

                    categoriaProximoMes:
                        beneficioProximoMes
                            .categoria,

                    descontoProximoMes:
                        beneficioProximoMes
                            .desconto,

                    totalAdultosMes:
                        novosAdultos,

                    totalIdososMes:
                        novosIdosos,

                    totalCriancasMes:
                        novasCriancas,

                    totalVisitantesMes:
                        novosVisitantes,

                    totalVisitantes:
                        totalVisitantesHistorico,

                    ultimaAtualizacaoPrograma:
                        agora,

                    updatedAt:
                        agora,
                }
            );

            /* ==================================
               MARCAR RESERVA COMO CREDITADA
            ================================== */

            transaction.update(
                reservaRef,
                {
                    ...dados,

                    pontosPotenciaisReserva:
                        pontosReserva,

                    pontosCreditados:
                        true,

                    pontosCreditadosQuantidade:
                        pontosReserva,

                    pontosCreditadosEm:
                        agora,

                    pontosCreditadosMes:
                        mesAtual,

                    statusPontosPrograma:
                        "creditado",

                    categoriaParceiroNoCredito:
                        categoriaAtual,

                    categoriaProximoMesAposCredito:
                        beneficioProximoMes
                            .categoria,

                    descontoProximoMesAposCredito:
                        beneficioProximoMes
                            .desconto,
                }
            );

            return {
                pontosCreditados:
                    true,

                jaCreditado:
                    false,

                quantidade:
                    pontosReserva,

                pontosMesAtual:
                    novosPontos,

                categoriaAtual,

                categoriaProximoMes:
                    beneficioProximoMes
                        .categoria,

                descontoProximoMes:
                    beneficioProximoMes
                        .desconto,
            };
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

                /*
                 * IMPORTANTE:
                 *
                 * Se for Portaria Principal,
                 * esta função também credita
                 * os pontos.
                 *
                 * Se for Cachoeira ou Elevador,
                 * apenas atualiza a utilização.
                 */

                await atualizarReservaAgenciaComPontuacao(
                    entidadeId,
                    item.local,
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
             * Ela será tentada novamente.
             */
        }
    }

    return sucessoCount;
}