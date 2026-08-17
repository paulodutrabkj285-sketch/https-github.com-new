import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc,
    where,
} from "firebase/firestore";

import { db } from "./firebase";

/* ==========================================
   TIPOS
========================================== */

export type TipoParceiro =
    | "agencia"
    | "guia"
    | "transportadora"
    | "operadora";

export type StatusAgencia =
    | "pendente"
    | "ativa"
    | "bloqueada"
    | "reprovada";

export type CategoriaAgencia =
    | "Bronze"
    | "Prata"
    | "Ouro"
    | "Diamante";

export type AgenciaInput = {
    nomeEmpresa: string;
    responsavel: string;

    /*
     * CNPJ/documento principal.
     */
    documento: string;

    cadastur?: string;

    tipoParceiro: TipoParceiro;

    telefone: string;
    whatsapp: string;
    email: string;
    cidade: string;
    estado: string;

    observacoes?: string;
};

export type Agencia =
    AgenciaInput & {
        id: string;

        status: StatusAgencia;

        descontoPadrao: number;

        categoria: CategoriaAgencia;

        totalVisitantes: number;
        receitaGerada: number;
        descontosConcedidos: number;

        aprovadoEm?: string;
        aprovadoPor?: string;

        reprovadoEm?: string;
        reprovadoPor?: string;
        motivoReprovacao?: string;

        bloqueadoEm?: string;
        bloqueadoPor?: string;

        documentoVerificado?: boolean;
        documentoVerificadoEm?: string;
        documentoVerificadoPor?: string;

        cadasturVerificado?: boolean;
        cadasturVerificadoEm?: string;
        cadasturVerificadoPor?: string;
        cadasturSituacao?: string;

        aprovacaoAutomatica: boolean;

        createdAt: string;
        updatedAt?: string;
    };

/* ==========================================
   LIMPEZA
========================================== */

function limpar(
    valor?: string
) {
    return String(
        valor || ""
    ).trim();
}

function somenteDigitos(
    valor?: string
) {
    return String(
        valor || ""
    ).replace(
        /\D/g,
        ""
    );
}

/* ==========================================
   VALIDAR CNPJ / DOCUMENTO
========================================== */

export function validarCnpj(
    valor?: string
) {
    const documento =
        somenteDigitos(
            valor
        );

    /*
     * Mantemos compatibilidade
     * com cadastros antigos de guias,
     * que podem possuir documento
     * diferente de CNPJ.
     *
     * Para Agência/Operadora,
     * a tela pública atual envia CNPJ.
     */
    return documento.length >= 11;
}

/* ==========================================
   BUSCAR PELO DOCUMENTO
========================================== */

export async function buscarAgenciaPorDocumento(
    documento: string
): Promise<Agencia | null> {
    const documentoLimpo =
        somenteDigitos(
            documento
        );

    if (!documentoLimpo) {
        return null;
    }

    const q =
        query(
            collection(
                db,
                "agencias"
            ),
            where(
                "documento",
                "==",
                documentoLimpo
            )
        );

    const snap =
        await getDocs(q);

    if (snap.empty) {
        return null;
    }

    const item =
        snap.docs[0];

    return {
        id: item.id,
        ...item.data(),
    } as Agencia;
}

/* ==========================================
   CRIAR AGÊNCIA / PARCEIRO
========================================== */

export async function criarAgencia(
    dados: AgenciaInput
) {
    const documento =
        somenteDigitos(
            dados.documento
        );

    if (
        !validarCnpj(
            documento
        )
    ) {
        throw new Error(
            "Informe um documento/CNPJ válido."
        );
    }

    /*
     * PROTEÇÃO CONTRA DUPLICIDADE
     *
     * Antes de criar qualquer cadastro,
     * verificamos se o documento já existe.
     */
    const existente =
        await buscarAgenciaPorDocumento(
            documento
        );

    if (existente) {
        if (
            existente.status ===
            "ativa"
        ) {
            throw new Error(
                "Este CNPJ/documento já possui cadastro aprovado no Parque Mundo Novo."
            );
        }

        if (
            existente.status ===
            "pendente"
        ) {
            throw new Error(
                "Este CNPJ/documento já possui um cadastro aguardando aprovação."
            );
        }

        if (
            existente.status ===
            "bloqueada"
        ) {
            throw new Error(
                "Este cadastro está bloqueado. Entre em contato com o Parque Mundo Novo."
            );
        }

        if (
            existente.status ===
            "reprovada"
        ) {
            throw new Error(
                "Este CNPJ/documento já possui um cadastro anterior. Entre em contato com o Parque Mundo Novo para solicitar uma nova análise."
            );
        }

        throw new Error(
            "Já existe um cadastro utilizando este CNPJ/documento."
        );
    }

    const agora =
        new Date()
            .toISOString();

    const ref =
        await addDoc(
            collection(
                db,
                "agencias"
            ),
            {
                nomeEmpresa:
                    limpar(
                        dados.nomeEmpresa
                    ),

                responsavel:
                    limpar(
                        dados.responsavel
                    ),

                documento,

                cadastur:
                    limpar(
                        dados.cadastur
                    ),

                tipoParceiro:
                    dados.tipoParceiro,

                telefone:
                    somenteDigitos(
                        dados.telefone
                    ),

                whatsapp:
                    somenteDigitos(
                        dados.whatsapp
                    ),

                email:
                    limpar(
                        dados.email
                    ).toLowerCase(),

                cidade:
                    limpar(
                        dados.cidade
                    ),

                estado:
                    limpar(
                        dados.estado
                    ).toUpperCase(),

                observacoes:
                    limpar(
                        dados.observacoes
                    ),

                /* ==================================
                   APROVAÇÃO
                ================================== */

                status:
                    "pendente",

                aprovacaoAutomatica:
                    false,

                documentoVerificado:
                    false,

                cadasturVerificado:
                    false,

                cadasturSituacao:
                    "aguardando_verificacao",

                descontoPadrao:
                    5,

                categoria:
                    "Bronze",

                totalVisitantes:
                    0,

                receitaGerada:
                    0,

                descontosConcedidos:
                    0,

                createdAt:
                    agora,

                updatedAt:
                    agora,
            }
        );

    return ref.id;
}

/* ==========================================
   LISTAR AGÊNCIAS
========================================== */

export async function listarAgencias() {
    const q =
        query(
            collection(
                db,
                "agencias"
            ),

            orderBy(
                "createdAt",
                "desc"
            )
        );

    const snap =
        await getDocs(q);

    return snap.docs.map(
        (
            docItem
        ) => ({
            id:
                docItem.id,

            ...docItem.data(),
        })
    ) as Agencia[];
}

/* ==========================================
   BUSCAR AGÊNCIA POR ID
========================================== */

export async function buscarAgenciaPorId(
    id: string
): Promise<Agencia | null> {
    const idLimpo =
        limpar(
            id
        );

    if (!idLimpo) {
        return null;
    }

    const ref =
        doc(
            db,
            "agencias",
            idLimpo
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

    return {
        id:
            snap.id,

        ...snap.data(),
    } as Agencia;
}

/* ==========================================
   ATUALIZAR AGÊNCIA
========================================== */

export async function atualizarAgencia(
    id: string,
    dados:
        Partial<Agencia> &
        Record<
            string,
            unknown
        >
) {
    const ref =
        doc(
            db,
            "agencias",
            id
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
   APROVAR AGÊNCIA
========================================== */

export async function ativarAgencia(
    id: string,
    aprovadoPor =
        "admin"
) {
    const agora =
        new Date()
            .toISOString();

    await atualizarAgencia(
        id,
        {
            status:
                "ativa",

            aprovacaoAutomatica:
                false,

            documentoVerificado:
                true,

            documentoVerificadoEm:
                agora,

            documentoVerificadoPor:
                aprovadoPor,

            cadasturVerificado:
                true,

            cadasturVerificadoEm:
                agora,

            cadasturVerificadoPor:
                aprovadoPor,

            cadasturSituacao:
                "regular",

            aprovadoEm:
                agora,

            aprovadoPor,
        }
    );
}

/* ==========================================
   REPROVAR
========================================== */

export async function reprovarAgencia(
    id: string,
    motivo:
        string = "",
    reprovadoPor =
        "admin"
) {
    const agora =
        new Date()
            .toISOString();

    await atualizarAgencia(
        id,
        {
            status:
                "reprovada",

            motivoReprovacao:
                limpar(
                    motivo
                ),

            reprovadoEm:
                agora,

            reprovadoPor,
        }
    );
}

/* ==========================================
   BLOQUEAR
========================================== */

export async function bloquearAgencia(
    id: string,
    bloqueadoPor =
        "admin"
) {
    const agora =
        new Date()
            .toISOString();

    await atualizarAgencia(
        id,
        {
            status:
                "bloqueada",

            bloqueadoEm:
                agora,

            bloqueadoPor,
        }
    );
}

/* ==========================================
   VOLTAR PARA PENDENTE
========================================== */

export async function marcarAgenciaPendente(
    id: string
) {
    await atualizarAgencia(
        id,
        {
            status:
                "pendente",

            documentoVerificado:
                false,

            documentoVerificadoEm:
                "",

            documentoVerificadoPor:
                "",

            cadasturVerificado:
                false,

            cadasturVerificadoEm:
                "",

            cadasturVerificadoPor:
                "",

            cadasturSituacao:
                "aguardando_verificacao",

            aprovadoEm:
                "",

            aprovadoPor:
                "",
        }
    );
}

/* ==========================================
   PODE RESERVAR / COMPRAR
========================================== */

export function agenciaPodeReservar(
    agencia:
        Agencia |
        null |
        undefined
) {
    if (!agencia) {
        return false;
    }

    /*
     * O parceiro obrigatoriamente
     * precisa continuar ATIVO.
     */
    if (
        agencia.status !==
        "ativa"
    ) {
        return false;
    }

    /*
     * COMPATIBILIDADE COM CADASTROS ANTIGOS
     *
     * Os parceiros aprovados antes da criação
     * dos campos documentoVerificado e
     * cadasturVerificado podem não possuir
     * esses campos no Firestore.
     *
     * Portanto:
     *
     * true      = liberado
     * undefined = cadastro antigo aprovado,
     *             mantém compatibilidade
     * false     = bloqueado
     *
     * Os novos cadastros continuam seguros,
     * pois são criados como:
     *
     * status: "pendente"
     * documentoVerificado: false
     * cadasturVerificado: false
     *
     * e somente o admin os transforma
     * em "ativa".
     */

    if (
        agencia.documentoVerificado ===
        false
    ) {
        return false;
    }

    if (
        agencia.cadasturVerificado ===
        false
    ) {
        return false;
    }

    return true;
}

/* ==========================================
   DESCONTO
========================================== */

/*
 * 1 a 20 pessoas = 5%
 * acima de 20 = 10%
 */

export function calcularDescontoGrupo(
    totalVisitantes: number
) {
    const total =
        Number(
            totalVisitantes ||
            0
        );

    if (
        !Number.isFinite(
            total
        ) ||
        total <= 0
    ) {
        return 0;
    }

    if (
        total > 20
    ) {
        return 10;
    }

    return 5;
}

/* ==========================================
   APLICAR DESCONTO
========================================== */

export function aplicarDescontoAgencia(
    valor: number,
    totalVisitantes: number
) {
    const percentual =
        calcularDescontoGrupo(
            totalVisitantes
        );

    const valorOriginal =
        Number(
            valor || 0
        );

    const valorDesconto =
        valorOriginal *
        (
            percentual /
            100
        );

    const valorFinal =
        valorOriginal -
        valorDesconto;

    return {
        percentual,
        valorOriginal,
        valorDesconto,
        valorFinal,
    };
}