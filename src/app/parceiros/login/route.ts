import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    collection,
    getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import crypto from "crypto";

export const runtime =
    "nodejs";

/* ==========================================
   CONFIGURAÇÃO
========================================== */

const COOKIE_NAME =
    "pmn_parceiro_session";

const SESSION_MAX_AGE =
    60 * 60 * 8; // 8 horas

/* ==========================================
   AUXILIARES
========================================== */

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

function normalizarEmail(
    valor?: string
) {
    return String(
        valor || ""
    )
        .trim()
        .toLowerCase();
}

function obterSecret() {
    const secret =
        String(
            process.env
                .PARCEIRO_SESSION_SECRET ||
            ""
        ).trim();

    if (!secret) {
        console.error(
            "LOGIN PARCEIRO: PARCEIRO_SESSION_SECRET não encontrada no ambiente."
        );

        throw new Error(
            "PARCEIRO_SESSION_SECRET não configurado."
        );
    }

    /*
     * Uma chave curta não deve
     * ser usada para assinar sessão.
     */
    if (
        secret.length < 32
    ) {
        console.error(
            "LOGIN PARCEIRO: PARCEIRO_SESSION_SECRET muito curta."
        );

        throw new Error(
            "PARCEIRO_SESSION_SECRET inválida."
        );
    }

    return secret;
}

function criarAssinatura(
    payload: string
) {
    return crypto
        .createHmac(
            "sha256",
            obterSecret()
        )
        .update(
            payload
        )
        .digest(
            "hex"
        );
}

/* ==========================================
   POST
========================================== */

export async function POST(
    req: NextRequest
) {
    try {
        const body =
            await req.json();

        const documento =
            somenteDigitos(
                body?.documento
            );

        const email =
            normalizarEmail(
                body?.email
            );

        /* ==================================
           VALIDAR ENTRADA
        ================================== */

        if (!documento) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Informe o CNPJ ou CPF.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            documento.length <
            11
        ) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Informe um CNPJ ou CPF válido.",
                },
                {
                    status: 400,
                }
            );
        }

        if (!email) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Informe o e-mail cadastrado.",
                },
                {
                    status: 400,
                }
            );
        }

        /* ==================================
           BUSCAR PARCEIROS
        ==================================

           IMPORTANTE:

           Não usamos mais:

           where(
             "documento",
             "==",
             documento
           )

           porque alguns cadastros antigos
           podem possuir CPF/CNPJ formatado:

           087.954.839-85
           23.485.744/0001-49

           enquanto os novos são gravados
           somente com números.

           Aqui normalizamos os dois lados.
        ================================== */

        const snap =
            await getDocs(
                collection(
                    db,
                    "agencias"
                )
            );

        /* ==================================
           LOCALIZAR DOCUMENTO
        ================================== */

        const cadastrosDocumento =
            snap.docs.filter(
                (
                    item
                ) => {
                    const dados =
                        item.data();

                    const documentoBanco =
                        somenteDigitos(
                            dados.documento
                        );

                    return (
                        documentoBanco ===
                        documento
                    );
                }
            );

        if (
            cadastrosDocumento.length ===
            0
        ) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Não encontramos um parceiro cadastrado com esse CNPJ/CPF.",
                },
                {
                    status: 404,
                }
            );
        }

        /* ==================================
           PROCURAR CADASTRO ATIVO +
           MESMO EMAIL
        ================================== */

        const parceiro =
            cadastrosDocumento.find(
                (
                    item
                ) => {
                    const dados =
                        item.data();

                    const emailBanco =
                        normalizarEmail(
                            dados.email
                        );

                    return (
                        dados.status ===
                        "ativa" &&
                        emailBanco ===
                        email
                    );
                }
            );

        /* ==================================
           NÃO ENCONTROU COMBINAÇÃO
        ================================== */

        if (!parceiro) {
            /*
             * Existe cadastro ativo
             * mas o e-mail é diferente.
             */

            const ativo =
                cadastrosDocumento.find(
                    (
                        item
                    ) =>
                        item.data()
                            .status ===
                        "ativa"
                );

            if (ativo) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "O e-mail informado não corresponde ao cadastro aprovado.",
                    },
                    {
                        status: 401,
                    }
                );
            }

            /*
             * Pendente
             */

            const pendente =
                cadastrosDocumento.find(
                    (
                        item
                    ) =>
                        item.data()
                            .status ===
                        "pendente"
                );

            if (pendente) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "Seu cadastro ainda está aguardando aprovação do Parque Mundo Novo.",
                    },
                    {
                        status: 403,
                    }
                );
            }

            /*
             * Bloqueado
             */

            const bloqueado =
                cadastrosDocumento.find(
                    (
                        item
                    ) =>
                        item.data()
                            .status ===
                        "bloqueada"
                );

            if (bloqueado) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "Este cadastro está bloqueado. Entre em contato com o Parque Mundo Novo.",
                    },
                    {
                        status: 403,
                    }
                );
            }

            /*
             * Reprovado
             */

            const reprovado =
                cadastrosDocumento.find(
                    (
                        item
                    ) =>
                        item.data()
                            .status ===
                        "reprovada"
                );

            if (reprovado) {
                return NextResponse.json(
                    {
                        ok: false,

                        error:
                            "Este cadastro não está aprovado para acessar a área de parceiros.",
                    },
                    {
                        status: 403,
                    }
                );
            }

            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Não foi possível validar o acesso.",
                },
                {
                    status: 401,
                }
            );
        }

        /* ==================================
           DADOS DO PARCEIRO
        ================================== */

        const dadosParceiro =
            parceiro.data();

        /*
         * Como segurança adicional,
         * parceiro precisa continuar ativo.
         */

        if (
            dadosParceiro.status !==
            "ativa"
        ) {
            return NextResponse.json(
                {
                    ok: false,

                    error:
                        "Este parceiro não está autorizado a acessar esta área.",
                },
                {
                    status: 403,
                }
            );
        }

        /* ==================================
           CRIAR SESSÃO
        ================================== */

        const agora =
            Math.floor(
                Date.now() /
                1000
            );

        const expiraEm =
            agora +
            SESSION_MAX_AGE;

        const payloadObjeto = {
            agenciaId:
                parceiro.id,

            /*
             * Salvamos normalizado
             * dentro da sessão.
             */
            documento,

            email,

            exp:
                expiraEm,
        };

        const payload =
            Buffer.from(
                JSON.stringify(
                    payloadObjeto
                )
            ).toString(
                "base64url"
            );

        const assinatura =
            criarAssinatura(
                payload
            );

        const token =
            `${payload}.${assinatura}`;

        /* ==================================
           RESPOSTA
        ================================== */

        const resposta =
            NextResponse.json(
                {
                    ok: true,

                    mensagem:
                        "Acesso autorizado.",

                    parceiro: {
                        agenciaId:
                            parceiro.id,

                        nomeEmpresa:
                            String(
                                dadosParceiro
                                    .nomeEmpresa ||
                                ""
                            ),

                        responsavel:
                            String(
                                dadosParceiro
                                    .responsavel ||
                                ""
                            ),
                    },
                }
            );

        /* ==================================
           COOKIE HTTPONLY
        ================================== */

        resposta.cookies.set(
            COOKIE_NAME,
            token,
            {
                httpOnly:
                    true,

                secure:
                    process.env
                        .NODE_ENV ===
                    "production",

                sameSite:
                    "lax",

                path:
                    "/",

                maxAge:
                    SESSION_MAX_AGE,
            }
        );

        return resposta;
    } catch (error) {
        console.error(
            "LOGIN PARCEIRO:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    "Erro interno ao validar acesso do parceiro.",
            },
            {
                status: 500,
            }
        );
    }
}