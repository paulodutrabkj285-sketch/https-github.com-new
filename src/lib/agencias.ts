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

export type ModalidadePagamentoParceiro =
    | "antecipado"
    | "chegada";

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

        /*
         * BENEFÍCIO VÁLIDO NO MÊS ATUAL.
         *
         * Exemplo:
         * categoria = "Ouro"
         * descontoPadrao = 15
         */
        descontoPadrao: number;

        categoria: CategoriaAgencia;

        /*
         * HISTÓRICO GERAL
         */
        totalVisitantes: number;
        receitaGerada: number;
        descontosConcedidos: number;

        /*
         * ==========================================
         * PROGRAMA DE PARCEIROS
         * ==========================================
         *
         * O desempenho de um mês determina
         * o benefício do mês seguinte.
         */

        pontosMesAtual?: number;

        pontosMesAnterior?: number;

        mesReferenciaPontos?: string;

        categoriaProximoMes?: CategoriaAgencia;

        descontoProximoMes?: number;

        totalAdultosMes?: number;

        totalIdososMes?: number;

        totalCriancasMes?: number;

        totalVisitantesMes?: number;

        ultimaAtualizacaoPrograma?: string;

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
   CONFIGURAÇÃO DO PROGRAMA DE PARCEIROS
========================================== */

/*
 * IMPORTANTE:
 *
 * Esta é a regra central do programa.
 *
 * Quando futuramente criarmos a tela
 * de configuração no Admin, estes valores
 * poderão vir do Firestore.
 *
 * Por enquanto ficam centralizados aqui,
 * evitando regras diferentes em cada tela.
 */

export const PROGRAMA_PARCEIROS = {
    pontos: {
        adulto: 1,
        idoso: 0.5,
        crianca: 0,
    },

    niveis: {
        Bronze: {
            nome: "Bronze" as CategoriaAgencia,
            minimo: 0,
            maximo: 49.5,
            desconto: 5,
        },

        Prata: {
            nome: "Prata" as CategoriaAgencia,
            minimo: 50,
            maximo: 99.5,
            desconto: 10,
        },

        Ouro: {
            nome: "Ouro" as CategoriaAgencia,
            minimo: 100,
            maximo: 199.5,
            desconto: 15,
        },

        Diamante: {
            nome: "Diamante" as CategoriaAgencia,
            minimo: 200,
            maximo: null,
            desconto: 20,
        },
    },
} as const;

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
   MÊS DE REFERÊNCIA
========================================== */

export function obterMesReferencia(
    data: Date = new Date()
) {
    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    return `${ano}-${mes}`;
}

/* ==========================================
   PONTOS DA RESERVA
========================================== */

/*
 * REGRA:
 *
 * Adulto:
 * 1 ponto
 *
 * Idoso / meia:
 * 0,5 ponto
 *
 * Criança gratuita:
 * 0 ponto
 *
 * Criança continua sendo contabilizada
 * como visitante, apenas não gera ponto.
 */

export function calcularPontosReserva(
    adultos: number,
    idosos: number,
    criancas: number = 0
) {
    const qtdAdultos =
        Math.max(
            0,
            Number(
                adultos || 0
            )
        );

    const qtdIdosos =
        Math.max(
            0,
            Number(
                idosos || 0
            )
        );

    const qtdCriancas =
        Math.max(
            0,
            Number(
                criancas || 0
            )
        );

    const pontosAdultos =
        qtdAdultos *
        PROGRAMA_PARCEIROS
            .pontos
            .adulto;

    const pontosIdosos =
        qtdIdosos *
        PROGRAMA_PARCEIROS
            .pontos
            .idoso;

    const pontosCriancas =
        qtdCriancas *
        PROGRAMA_PARCEIROS
            .pontos
            .crianca;

    const pontos =
        pontosAdultos +
        pontosIdosos +
        pontosCriancas;

    return Number(
        pontos.toFixed(1)
    );
}

/* ==========================================
   CATEGORIA POR PONTOS
========================================== */

export function calcularCategoriaPorPontos(
    pontos: number
): CategoriaAgencia {
    const total =
        Math.max(
            0,
            Number(
                pontos || 0
            )
        );

    if (
        total >=
        PROGRAMA_PARCEIROS
            .niveis
            .Diamante
            .minimo
    ) {
        return "Diamante";
    }

    if (
        total >=
        PROGRAMA_PARCEIROS
            .niveis
            .Ouro
            .minimo
    ) {
        return "Ouro";
    }

    if (
        total >=
        PROGRAMA_PARCEIROS
            .niveis
            .Prata
            .minimo
    ) {
        return "Prata";
    }

    return "Bronze";
}

/* ==========================================
   DESCONTO DA CATEGORIA
========================================== */

export function calcularDescontoCategoria(
    categoria:
        CategoriaAgencia |
        string |
        undefined |
        null
) {
    switch (categoria) {
        case "Diamante":
            return PROGRAMA_PARCEIROS
                .niveis
                .Diamante
                .desconto;

        case "Ouro":
            return PROGRAMA_PARCEIROS
                .niveis
                .Ouro
                .desconto;

        case "Prata":
            return PROGRAMA_PARCEIROS
                .niveis
                .Prata
                .desconto;

        case "Bronze":
        default:
            return PROGRAMA_PARCEIROS
                .niveis
                .Bronze
                .desconto;
    }
}

/* ==========================================
   BENEFÍCIO DO PRÓXIMO MÊS
========================================== */

export function calcularBeneficioProximoMes(
    pontos: number
) {
    const categoria =
        calcularCategoriaPorPontos(
            pontos
        );

    const desconto =
        calcularDescontoCategoria(
            categoria
        );

    return {
        categoria,
        desconto,
        pontos:
            Number(
                pontos || 0
            ),
    };
}

/* ==========================================
   DESCONTO VÁLIDO DA AGÊNCIA
========================================== */

/*
 * REGRA FUNDAMENTAL:
 *
 * PAGAMENTO ANTECIPADO:
 * recebe desconto conforme categoria atual.
 *
 * PAGAMENTO NA CHEGADA:
 * NÃO recebe desconto do programa.
 *
 * Isso evita reclamações e deixa a regra
 * comercial objetiva.
 */

export function calcularDescontoParceiro(
    agencia:
        Agencia |
        null |
        undefined,
    modalidade:
        ModalidadePagamentoParceiro
) {
    if (
        !agencia ||
        modalidade !==
        "antecipado"
    ) {
        return 0;
    }

    if (
        !agenciaPodeReservar(
            agencia
        )
    ) {
        return 0;
    }

    /*
     * Compatibilidade:
     *
     * Se categoria existir,
     * usamos a categoria.
     *
     * Caso seja cadastro antigo
     * sem categoria válida,
     * Bronze é utilizado.
     */

    return calcularDescontoCategoria(
        agencia.categoria ||
        "Bronze"
    );
}

/* ==========================================
   INFORMAÇÕES DO NÍVEL
========================================== */

export function obterInformacoesNivel(
    categoria:
        CategoriaAgencia
) {
    const desconto =
        calcularDescontoCategoria(
            categoria
        );

    switch (categoria) {
        case "Diamante":
            return {
                categoria:
                    "Diamante" as CategoriaAgencia,

                desconto,

                minimo:
                    PROGRAMA_PARCEIROS
                        .niveis
                        .Diamante
                        .minimo,

                proximoNivel:
                    null,

                pontosProximoNivel:
                    null,
            };

        case "Ouro":
            return {
                categoria:
                    "Ouro" as CategoriaAgencia,

                desconto,

                minimo:
                    PROGRAMA_PARCEIROS
                        .niveis
                        .Ouro
                        .minimo,

                proximoNivel:
                    "Diamante" as CategoriaAgencia,

                pontosProximoNivel:
                    PROGRAMA_PARCEIROS
                        .niveis
                        .Diamante
                        .minimo,
            };

        case "Prata":
            return {
                categoria:
                    "Prata" as CategoriaAgencia,

                desconto,

                minimo:
                    PROGRAMA_PARCEIROS
                        .niveis
                        .Prata
                        .minimo,

                proximoNivel:
                    "Ouro" as CategoriaAgencia,

                pontosProximoNivel:
                    PROGRAMA_PARCEIROS
                        .niveis
                        .Ouro
                        .minimo,
            };

        case "Bronze":
        default:
            return {
                categoria:
                    "Bronze" as CategoriaAgencia,

                desconto,

                minimo:
                    PROGRAMA_PARCEIROS
                        .niveis
                        .Bronze
                        .minimo,

                proximoNivel:
                    "Prata" as CategoriaAgencia,

                pontosProximoNivel:
                    PROGRAMA_PARCEIROS
                        .niveis
                        .Prata
                        .minimo,
            };
    }
}

/* ==========================================
   PROGRESSO PARA O PRÓXIMO NÍVEL
========================================== */

export function calcularProgressoParceiro(
    pontos: number
) {
    const total =
        Math.max(
            0,
            Number(
                pontos || 0
            )
        );

    const categoria =
        calcularCategoriaPorPontos(
            total
        );

    const info =
        obterInformacoesNivel(
            categoria
        );

    if (
        !info.proximoNivel ||
        info.pontosProximoNivel === null
    ) {
        return {
            categoria,
            pontos:
                total,

            proximoNivel:
                null,

            faltamPontos:
                0,

            percentual:
                100,

            nivelMaximo:
                true,
        };
    }

    const minimoAtual =
        info.minimo;

    const alvo =
        info.pontosProximoNivel;

    const intervalo =
        alvo -
        minimoAtual;

    const progresso =
        total -
        minimoAtual;

    const percentual =
        intervalo > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (
                        progresso /
                        intervalo
                    ) *
                    100
                )
            )
            : 0;

    return {
        categoria,
        pontos:
            total,

        proximoNivel:
            info.proximoNivel,

        faltamPontos:
            Math.max(
                0,
                Number(
                    (
                        alvo -
                        total
                    ).toFixed(1)
                )
            ),

        percentual:
            Number(
                percentual.toFixed(1)
            ),

        nivelMaximo:
            false,
    };
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

    const mesAtual =
        obterMesReferencia();

    const categoriaInicial:
        CategoriaAgencia =
        "Bronze";

    const descontoInicial =
        calcularDescontoCategoria(
            categoriaInicial
        );

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

                /* ==================================
                   PROGRAMA DE PARCEIROS
                ================================== */

                /*
                 * Todo novo parceiro inicia Bronze.
                 *
                 * O desempenho mensal determinará
                 * a categoria do mês seguinte.
                 */

                descontoPadrao:
                    descontoInicial,

                categoria:
                    categoriaInicial,

                pontosMesAtual:
                    0,

                pontosMesAnterior:
                    0,

                mesReferenciaPontos:
                    mesAtual,

                categoriaProximoMes:
                    "Bronze",

                descontoProximoMes:
                    descontoInicial,

                totalAdultosMes:
                    0,

                totalIdososMes:
                    0,

                totalCriancasMes:
                    0,

                totalVisitantesMes:
                    0,

                ultimaAtualizacaoPrograma:
                    agora,

                /* ==================================
                   TOTAIS HISTÓRICOS
                ================================== */

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
     * true      = liberado
     * undefined = cadastro antigo aprovado
     * false     = bloqueado
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
   PREPARAR DADOS MENSAIS
========================================== */

/*
 * Esta função não grava automaticamente.
 *
 * Ela prepara os dados que serão usados
 * pela página de reservas.
 */

export function prepararProgramaParceiro(
    agencia: Agencia
) {
    const agora =
        new Date();

    const mesAtual =
        obterMesReferencia(
            agora
        );

    const mesSalvo =
        agencia.mesReferenciaPontos ||
        mesAtual;

    /*
     * MESMO MÊS
     */

    if (
        mesSalvo ===
        mesAtual
    ) {
        const pontos =
            Number(
                agencia.pontosMesAtual ||
                0
            );

        const beneficioProximoMes =
            calcularBeneficioProximoMes(
                pontos
            );

        return {
            mudouMes:
                false,

            mesReferencia:
                mesAtual,

            categoriaAtual:
                agencia.categoria ||
                "Bronze",

            descontoAtual:
                calcularDescontoCategoria(
                    agencia.categoria ||
                    "Bronze"
                ),

            pontosMesAtual:
                pontos,

            categoriaProximoMes:
                beneficioProximoMes
                    .categoria,

            descontoProximoMes:
                beneficioProximoMes
                    .desconto,

            pontosMesAnterior:
                Number(
                    agencia.pontosMesAnterior ||
                    0
                ),
        };
    }

    /*
     * MUDOU O MÊS
     *
     * O que foi conquistado no mês anterior
     * passa a valer agora.
     */

    const pontosAnterior =
        Number(
            agencia.pontosMesAtual ||
            0
        );

    const beneficioNovoMes =
        calcularBeneficioProximoMes(
            pontosAnterior
        );

    return {
        mudouMes:
            true,

        mesReferencia:
            mesAtual,

        categoriaAtual:
            beneficioNovoMes
                .categoria,

        descontoAtual:
            beneficioNovoMes
                .desconto,

        pontosMesAtual:
            0,

        /*
         * Enquanto o parceiro ainda
         * não acumula pontos no novo mês,
         * a projeção começa em Bronze.
         */
        categoriaProximoMes:
            "Bronze" as CategoriaAgencia,

        descontoProximoMes:
            calcularDescontoCategoria(
                "Bronze"
            ),

        pontosMesAnterior:
            pontosAnterior,
    };
}

/* ==========================================
   APLICAR VIRADA DE MÊS
========================================== */

export async function atualizarMesProgramaParceiro(
    agencia: Agencia
) {
    const programa =
        prepararProgramaParceiro(
            agencia
        );

    if (
        !programa.mudouMes
    ) {
        return programa;
    }

    const agora =
        new Date()
            .toISOString();

    await atualizarAgencia(
        agencia.id,
        {
            categoria:
                programa
                    .categoriaAtual,

            descontoPadrao:
                programa
                    .descontoAtual,

            pontosMesAnterior:
                programa
                    .pontosMesAnterior,

            pontosMesAtual:
                0,

            mesReferenciaPontos:
                programa
                    .mesReferencia,

            categoriaProximoMes:
                programa
                    .categoriaProximoMes,

            descontoProximoMes:
                programa
                    .descontoProximoMes,

            totalAdultosMes:
                0,

            totalIdososMes:
                0,

            totalCriancasMes:
                0,

            totalVisitantesMes:
                0,

            ultimaAtualizacaoPrograma:
                agora,
        }
    );

    return programa;
}

/* ==========================================
   SOMAR DESEMPENHO DO MÊS
========================================== */

/*
 * IMPORTANTE:
 *
 * Esta função será chamada posteriormente
 * quando a reserva realmente puder contar
 * para o programa.
 *
 * O ideal será contar somente reservas
 * válidas conforme a regra operacional.
 */

export async function registrarDesempenhoParceiro(
    agencia: Agencia,
    dados: {
        adultos: number;
        idosos?: number;
        criancas?: number;
    }
) {
    /*
     * Primeiro garantimos que estamos
     * trabalhando no mês correto.
     */

    const programa =
        await atualizarMesProgramaParceiro(
            agencia
        );

    /*
     * Se mudou o mês, começamos do zero.
     * Caso contrário usamos o valor atual.
     */

    const pontosAtuais =
        programa.mudouMes
            ? 0
            : Number(
                agencia.pontosMesAtual ||
                0
            );

    const adultosAtuais =
        programa.mudouMes
            ? 0
            : Number(
                agencia.totalAdultosMes ||
                0
            );

    const idososAtuais =
        programa.mudouMes
            ? 0
            : Number(
                agencia.totalIdososMes ||
                0
            );

    const criancasAtuais =
        programa.mudouMes
            ? 0
            : Number(
                agencia.totalCriancasMes ||
                0
            );

    const visitantesAtuais =
        programa.mudouMes
            ? 0
            : Number(
                agencia.totalVisitantesMes ||
                0
            );

    const adultos =
        Math.max(
            0,
            Number(
                dados.adultos ||
                0
            )
        );

    const idosos =
        Math.max(
            0,
            Number(
                dados.idosos ||
                0
            )
        );

    const criancas =
        Math.max(
            0,
            Number(
                dados.criancas ||
                0
            )
        );

    const pontosReserva =
        calcularPontosReserva(
            adultos,
            idosos,
            criancas
        );

    const novosPontos =
        Number(
            (
                pontosAtuais +
                pontosReserva
            ).toFixed(1)
        );

    const beneficio =
        calcularBeneficioProximoMes(
            novosPontos
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

    const novosVisitantes =
        visitantesAtuais +
        adultos +
        idosos +
        criancas;

    const agora =
        new Date()
            .toISOString();

    await atualizarAgencia(
        agencia.id,
        {
            pontosMesAtual:
                novosPontos,

            categoriaProximoMes:
                beneficio
                    .categoria,

            descontoProximoMes:
                beneficio
                    .desconto,

            totalAdultosMes:
                novosAdultos,

            totalIdososMes:
                novosIdosos,

            totalCriancasMes:
                novasCriancas,

            totalVisitantesMes:
                novosVisitantes,

            ultimaAtualizacaoPrograma:
                agora,
        }
    );

    return {
        pontosReserva,
        pontosMesAtual:
            novosPontos,

        categoriaProximoMes:
            beneficio
                .categoria,

        descontoProximoMes:
            beneficio
                .desconto,

        totalAdultosMes:
            novosAdultos,

        totalIdososMes:
            novosIdosos,

        totalCriancasMes:
            novasCriancas,

        totalVisitantesMes:
            novosVisitantes,
    };
}

/* ==========================================
   DESCONTO LEGADO
========================================== */

/*
 * ATENÇÃO:
 *
 * Mantemos esta função SOMENTE para que
 * páginas antigas que ainda a importam
 * continuem compilando durante a migração.
 *
 * A nova página de parceiros NÃO deverá
 * usar esta função.
 *
 * Depois que substituirmos a página
 * /parceiros/reservas, poderemos remover
 * esta função definitivamente.
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

    /*
     * REGRA ANTIGA TEMPORÁRIA
     * somente para compatibilidade.
     */

    if (
        total < 5
    ) {
        return 0;
    }

    if (
        total <= 20
    ) {
        return 5;
    }

    return 10;
}

/* ==========================================
   APLICAR DESCONTO LEGADO
========================================== */

/*
 * Também mantida apenas por
 * compatibilidade com código antigo.
 */

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

/* ==========================================
   APLICAR BENEFÍCIO DO PROGRAMA
========================================== */

export function aplicarBeneficioParceiro(
    valor: number,
    agencia:
        Agencia |
        null |
        undefined,
    modalidade:
        ModalidadePagamentoParceiro
) {
    const valorOriginal =
        Math.max(
            0,
            Number(
                valor || 0
            )
        );

    const percentual =
        calcularDescontoParceiro(
            agencia,
            modalidade
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

        valorOriginal:
            Number(
                valorOriginal.toFixed(2)
            ),

        valorDesconto:
            Number(
                valorDesconto.toFixed(2)
            ),

        valorFinal:
            Number(
                valorFinal.toFixed(2)
            ),

        modalidade,

        descontoAplicado:
            percentual > 0,

        categoria:
            agencia?.categoria ||
            "Bronze",
    };
}