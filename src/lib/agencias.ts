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
     * Documento principal do novo fluxo:
     * CNPJ.
     */
    documento: string;

    /*
     * Cadastur não é mais obrigatório
     * no cadastro público.
     *
     * Ele poderá ser conferido e
     * registrado pelo Admin.
     */
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

        /*
         * Mantido por compatibilidade
         * com a página atual de reservas.
         */
        categoria: CategoriaAgencia;

        totalVisitantes: number;
        receitaGerada: number;
        descontosConcedidos: number;

        /*
         * Aprovação administrativa.
         */
        aprovadoEm?: string;
        aprovadoPor?: string;

        reprovadoEm?: string;
        reprovadoPor?: string;
        motivoReprovacao?: string;

        bloqueadoEm?: string;
        bloqueadoPor?: string;

        /*
         * Verificação administrativa
         * do CNPJ.
         */
        documentoVerificado?: boolean;
        documentoVerificadoEm?: string;
        documentoVerificadoPor?: string;

        /*
         * Verificação do Cadastur.
         */
        cadasturVerificado?: boolean;
        cadasturVerificadoEm?: string;
        cadasturVerificadoPor?: string;
        cadasturSituacao?: string;

        /*
         * O parceiro nunca é aprovado
         * automaticamente.
         */
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
   VALIDAR CNPJ
========================================== */

export function validarCnpj(
    valor?: string
) {
    const cnpj =
        somenteDigitos(
            valor
        );

    /*
     * Por enquanto:
     * validação básica de tamanho.
     *
     * A conferência oficial será
     * feita pelo Admin antes da aprovação.
     */
    return (
        cnpj.length === 14
    );
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
            "Informe um CNPJ válido com 14 dígitos."
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
                    )
                        .toLowerCase(),

                cidade:
                    limpar(
                        dados.cidade
                    ),

                estado:
                    limpar(
                        dados.estado
                    )
                        .toUpperCase(),

                observacoes:
                    limpar(
                        dados.observacoes
                    ),

                /* ==================================
                   NOVO FLUXO
                ================================== */

                /*
                 * Sempre entra aguardando aprovação.
                 */
                status:
                    "pendente",

                /*
                 * Nunca aprova automaticamente.
                 */
                aprovacaoAutomatica:
                    false,

                /*
                 * Ainda não verificado pelo Admin.
                 */
                documentoVerificado:
                    false,

                cadasturVerificado:
                    false,

                cadasturSituacao:
                    "aguardando_verificacao",

                /*
                 * Regra comercial base.
                 *
                 * O desconto real será calculado
                 * pela quantidade do grupo.
                 */
                descontoPadrao:
                    5,

                /*
                 * Mantido porque a página
                 * de reservas atual usa este campo.
                 */
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
   REPROVAR AGÊNCIA
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
   BLOQUEAR AGÊNCIA
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
   VERIFICAR SE PODE RESERVAR / COMPRAR
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
     * Precisa estar aprovada.
     */
    if (
        agencia.status !==
        "ativa"
    ) {
        return false;
    }

    /*
     * CNPJ precisa ter sido
     * conferido pelo Admin.
     */
    if (
        agencia.documentoVerificado !==
        true
    ) {
        return false;
    }

    /*
     * Regularidade/Cadastur precisa
     * ter sido validada pelo Admin.
     */
    if (
        agencia.cadasturVerificado !==
        true
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
 * 21 ou mais visitantes = 10%
 * 0 visitantes = 0%
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