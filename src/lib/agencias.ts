import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type AgenciaInput = {
    nomeEmpresa: string;
    responsavel: string;
    documento: string;
    cadastur: string;

    tipoParceiro:
    | "agencia"
    | "guia"
    | "transportadora"
    | "operadora";

    telefone: string;
    whatsapp: string;
    email: string;
    cidade: string;
    estado: string;
    observacoes?: string;
};

export type Agencia = AgenciaInput & {
    id: string;

    status:
    | "pendente"
    | "ativa"
    | "bloqueada";

    descontoPadrao: number;

    categoria:
    | "Bronze"
    | "Prata"
    | "Ouro"
    | "Diamante";

    aprovacaoAutomatica: boolean;

    totalVisitantes: number;
    receitaGerada: number;
    descontosConcedidos: number;

    createdAt: string;
    updatedAt?: string;

    aprovadoEm?: string;
    aprovadoPor?: string;
};

/* ==========================================
   LIMPEZA / VALIDAÇÃO
========================================== */

function limpar(valor: string) {
    return String(valor || "").trim();
}

function validarCadastur(cadastur: string) {
    const valor = limpar(cadastur);

    /*
     * Por enquanto verificamos se foi informado.
     *
     * A validação oficial do número do Cadastur
     * pode ser adicionada depois, caso desejado.
     */
    return valor.length > 0;
}

/* ==========================================
   CRIAR AGÊNCIA / GUIA
========================================== */

export async function criarAgencia(
    dados: AgenciaInput
) {
    const cadastur = limpar(
        dados.cadastur
    );

    if (!validarCadastur(cadastur)) {
        throw new Error(
            "O número do Cadastur é obrigatório."
        );
    }

    const ref = await addDoc(
        collection(
            db,
            "agencias"
        ),
        {
            ...dados,

            nomeEmpresa: limpar(
                dados.nomeEmpresa
            ),

            responsavel: limpar(
                dados.responsavel
            ),

            documento: limpar(
                dados.documento
            ),

            cadastur,

            telefone: limpar(
                dados.telefone
            ),

            whatsapp: limpar(
                dados.whatsapp
            ),

            email: limpar(
                dados.email
            ).toLowerCase(),

            cidade: limpar(
                dados.cidade
            ),

            estado: limpar(
                dados.estado
            ).toUpperCase(),

            observacoes: limpar(
                dados.observacoes ||
                ""
            ),

            /*
             * NOVA REGRA:
             *
             * O parceiro não é aprovado
             * automaticamente.
             */
            status:
                "pendente",

            /*
             * O desconto real será calculado
             * conforme a quantidade de visitantes.
             *
             * Até 20 pessoas = 5%
             * Acima de 20 = 10%
             */
            descontoPadrao:
                5,

            categoria:
                "Bronze",

            aprovacaoAutomatica:
                false,

            totalVisitantes:
                0,

            receitaGerada:
                0,

            descontosConcedidos:
                0,

            createdAt:
                new Date().toISOString(),
        }
    );

    return ref.id;
}

/* ==========================================
   LISTAR AGÊNCIAS
========================================== */

export async function listarAgencias() {
    const q = query(
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
        (docItem) => ({
            id: docItem.id,

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
        limpar(id);

    if (!idLimpo) {
        return null;
    }

    const ref = doc(
        db,
        "agencias",
        idLimpo
    );

    const snap =
        await getDoc(ref);

    if (!snap.exists()) {
        return null;
    }

    return {
        id: snap.id,

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
    const ref = doc(
        db,
        "agencias",
        id
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
   APROVAR AGÊNCIA
========================================== */

export async function ativarAgencia(
    id: string,
    aprovadoPor = "admin"
) {
    await atualizarAgencia(
        id,
        {
            status:
                "ativa",

            aprovacaoAutomatica:
                false,

            aprovadoEm:
                new Date().toISOString(),

            aprovadoPor,
        }
    );
}

/* ==========================================
   BLOQUEAR AGÊNCIA
========================================== */

export async function bloquearAgencia(
    id: string
) {
    await atualizarAgencia(
        id,
        {
            status:
                "bloqueada",
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

            aprovadoEm:
                "",

            aprovadoPor:
                "",
        }
    );
}

/* ==========================================
   VERIFICAR SE PODE RESERVAR
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

    if (
        agencia.status !==
        "ativa"
    ) {
        return false;
    }

    if (
        !validarCadastur(
            agencia.cadastur
        )
    ) {
        return false;
    }

    return true;
}

/* ==========================================
   DESCONTO DO GRUPO
========================================== */

/*
 * REGRA OFICIAL:
 *
 * 1 até 20 visitantes = 5%
 * acima de 20 visitantes = 10%
 *
 * Zero visitantes = 0%
 */

export function calcularDescontoGrupo(
    totalVisitantes: number
) {
    const total = Number(
        totalVisitantes || 0
    );

    if (
        !Number.isFinite(total) ||
        total <= 0
    ) {
        return 0;
    }

    if (total > 20) {
        return 10;
    }

    return 5;
}

/* ==========================================
   CALCULAR VALOR COM DESCONTO
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
        Number(valor || 0);

    const valorDesconto =
        valorOriginal *
        (percentual / 100);

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