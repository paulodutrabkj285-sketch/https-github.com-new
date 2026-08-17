import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const COOKIE_NAME = "pmn_parceiro_session";

type SessaoParceiro = {
    agenciaId: string;
    documento: string;
    email: string;
    exp: number;
};

function obterSecret() {
    const secret = process.env.PARCEIRO_SESSION_SECRET;

    if (!secret) {
        throw new Error(
            "PARCEIRO_SESSION_SECRET não configurado."
        );
    }

    return secret;
}

function criarAssinatura(payload: string) {
    return crypto
        .createHmac("sha256", obterSecret())
        .update(payload)
        .digest("hex");
}

function assinaturaValida(
    assinaturaRecebida: string,
    assinaturaEsperada: string
) {
    try {
        const recebida = Buffer.from(
            assinaturaRecebida,
            "hex"
        );

        const esperada = Buffer.from(
            assinaturaEsperada,
            "hex"
        );

        if (recebida.length !== esperada.length) {
            return false;
        }

        return crypto.timingSafeEqual(
            recebida,
            esperada
        );
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    try {
        /* ======================================
           PEGAR COOKIE
        ====================================== */

        const token =
            req.cookies.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json(
                {
                    ok: false,
                    autenticado: false,
                    error:
                        "Sessão do parceiro não encontrada.",
                },
                {
                    status: 401,
                }
            );
        }

        /* ======================================
           SEPARAR TOKEN
        ====================================== */

        const partes = token.split(".");

        if (partes.length !== 2) {
            return NextResponse.json(
                {
                    ok: false,
                    autenticado: false,
                    error: "Sessão inválida.",
                },
                {
                    status: 401,
                }
            );
        }

        const [payload, assinaturaRecebida] =
            partes;

        /* ======================================
           VALIDAR ASSINATURA
        ====================================== */

        const assinaturaEsperada =
            criarAssinatura(payload);

        if (
            !assinaturaValida(
                assinaturaRecebida,
                assinaturaEsperada
            )
        ) {
            const resposta =
                NextResponse.json(
                    {
                        ok: false,
                        autenticado: false,
                        error: "Sessão inválida.",
                    },
                    {
                        status: 401,
                    }
                );

            resposta.cookies.delete(
                COOKIE_NAME
            );

            return resposta;
        }

        /* ======================================
           DECODIFICAR SESSÃO
        ====================================== */

        let sessao: SessaoParceiro;

        try {
            sessao = JSON.parse(
                Buffer.from(
                    payload,
                    "base64url"
                ).toString("utf8")
            );
        } catch {
            return NextResponse.json(
                {
                    ok: false,
                    autenticado: false,
                    error:
                        "Não foi possível interpretar a sessão.",
                },
                {
                    status: 401,
                }
            );
        }

        /* ======================================
           VALIDAR CONTEÚDO
        ====================================== */

        if (
            !sessao.agenciaId ||
            !sessao.documento ||
            !sessao.email ||
            !sessao.exp
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    autenticado: false,
                    error: "Sessão incompleta.",
                },
                {
                    status: 401,
                }
            );
        }

        /* ======================================
           VERIFICAR EXPIRAÇÃO
        ====================================== */

        const agora = Math.floor(
            Date.now() / 1000
        );

        if (sessao.exp <= agora) {
            const resposta =
                NextResponse.json(
                    {
                        ok: false,
                        autenticado: false,
                        error:
                            "Sua sessão expirou. Faça o acesso novamente.",
                    },
                    {
                        status: 401,
                    }
                );

            resposta.cookies.delete(
                COOKIE_NAME
            );

            return resposta;
        }

        /* ======================================
           SESSÃO VÁLIDA
        ====================================== */

        return NextResponse.json({
            ok: true,
            autenticado: true,

            parceiro: {
                agenciaId:
                    sessao.agenciaId,

                documento:
                    sessao.documento,

                email:
                    sessao.email,
            },
        });
    } catch (error) {
        console.error(
            "SESSÃO PARCEIRO:",
            error
        );

        return NextResponse.json(
            {
                ok: false,
                autenticado: false,
                error:
                    "Erro interno ao verificar sessão do parceiro.",
            },
            {
                status: 500,
            }
        );
    }
}