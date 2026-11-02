import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    atualizarPedido,
    buscarPedidoPorId,
} from "@/lib/pedidos";

import {
    enviarCorrecaoIngressoElevadorPorEmail,
    enviarIngressoPorEmail,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TIPOS
========================================================= */

type TipoReenvio =
    | "todos"
    | "parque"
    | "elevador";

/* =========================================================
   AUXILIARES
========================================================= */

function limpar(
    valor: unknown
) {
    return String(
        valor ||
        ""
    ).trim();
}

function numeroSeguro(
    valor: unknown,
    fallback = 0
) {
    const numero =
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : fallback;
}

function pedidoEhCarrinhoParqueElevador(
    pedido: any
) {
    return (
        limpar(
            pedido?.tipo
        ).toLowerCase() ===
        "carrinho" &&
        numeroSeguro(
            pedido?.quantidadeParque
        ) > 0 &&
        numeroSeguro(
            pedido?.quantidadeElevador
        ) > 0
    );
}

/* =========================================================
   DESCOBRIR QUANTIDADE CORRETA
========================================================= */

function obterQuantidadePedido(
    pedido: any
) {
    const produto =
        limpar(
            pedido?.produto
        ).toLowerCase();

    /*
     * CAMPING
     */
    if (
        produto.includes(
            "camping"
        )
    ) {
        const quantidadePessoas =
            numeroSeguro(
                pedido?.quantidadePessoas
            );

        if (
            quantidadePessoas >
            0
        ) {
            return quantidadePessoas;
        }
    }

    /*
     * DEMAIS PRODUTOS
     */
    const quantidade =
        numeroSeguro(
            pedido?.quantidade
        );

    if (
        quantidade >
        0
    ) {
        return quantidade;
    }

    /*
     * FALLBACK
     */
    const quantidadePessoas =
        numeroSeguro(
            pedido?.quantidadePessoas
        );

    if (
        quantidadePessoas >
        0
    ) {
        return quantidadePessoas;
    }

    return 1;
}

/* =========================================================
   CÓDIGOS DO CARRINHO
========================================================= */

function obterCodigoParque(
    pedido: any
) {
    return limpar(
        pedido?.codigoIngressoParque ||
        pedido?.qrCodeIngressoParque ||
        pedido?.codigoIngresso ||
        pedido?.qrCodeIngresso ||
        ""
    );
}

function obterCodigoElevador(
    pedido: any
) {
    return limpar(
        pedido?.codigoIngressoElevador ||
        pedido?.qrCodeIngressoElevador ||
        ""
    );
}

/* =========================================================
   PREÇO UNITÁRIO DO ELEVADOR
========================================================= */

function calcularValorUnitarioElevador(
    quantidadeElevador: number
) {
    return quantidadeElevador >= 2
        ? 60
        : 75;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
    req: NextRequest
) {
    let pedidoId =
        "";

    try {
        const body =
            await req.json();

        pedidoId =
            limpar(
                body?.pedidoId
            );

        const tipoReenvioRaw =
            limpar(
                body?.tipoIngresso
            ).toLowerCase();

        const tipoReenvio:
            TipoReenvio =
            tipoReenvioRaw ===
                "parque" ||
                tipoReenvioRaw ===
                "elevador"
                ? tipoReenvioRaw
                : "todos";

        /* ==========================================
           VALIDAR PEDIDO ID
        ========================================== */

        if (
            !pedidoId
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "pedidoId não informado.",
                },
                {
                    status:
                        400,
                }
            );
        }

        /* ==========================================
           BUSCAR PEDIDO
        ========================================== */

        const pedido: any =
            await buscarPedidoPorId(
                pedidoId
            );

        if (
            !pedido
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Pedido não encontrado.",

                    diagnostico: {
                        pedidoIdInformado:
                            pedidoId,
                    },
                },
                {
                    status:
                        404,
                }
            );
        }

        /* ==========================================
           VALIDAR EMAIL
        ========================================== */

        const email =
            limpar(
                pedido.email
            );

        if (
            !email
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "Pedido sem e-mail cadastrado.",
                },
                {
                    status:
                        400,
                }
            );
        }

        /* ==========================================
           VALIDAR PAGAMENTO
        ========================================== */

        const statusPagamento =
            limpar(
                pedido.statusPagamento
            ).toLowerCase();

        if (
            statusPagamento !==
            "pago"
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    error:
                        "O ingresso só pode ser reenviado após pagamento confirmado.",

                    diagnostico: {
                        pedidoId:
                            pedido.id,

                        statusPagamento:
                            pedido.statusPagamento ||
                            null,

                        statusOperacional:
                            pedido.statusOperacional ||
                            null,
                    },
                },
                {
                    status:
                        400,
                }
            );
        }

        /* ==========================================
           IDENTIFICAR CARRINHO
        ========================================== */

        const ehCarrinho =
            pedidoEhCarrinhoParqueElevador(
                pedido
            );

        const agora =
            new Date()
                .toISOString();

        const resultados:
            Record<
                string,
                unknown
            > = {};

        /* ==========================================
           CARRINHO PARQUE + ELEVADOR
        ========================================== */

        if (
            ehCarrinho
        ) {
            const quantidadeParque =
                numeroSeguro(
                    pedido.quantidadeParque,
                    numeroSeguro(
                        pedido.quantidade,
                        1
                    )
                );

            const quantidadeElevador =
                numeroSeguro(
                    pedido.quantidadeElevador,
                    numeroSeguro(
                        pedido.qtdElevador,
                        0
                    )
                );

            const codigoParque =
                obterCodigoParque(
                    pedido
                );

            const codigoElevador =
                obterCodigoElevador(
                    pedido
                );

            if (
                quantidadeParque <=
                0
            ) {
                throw new Error(
                    "Quantidade do Parque inválida no carrinho."
                );
            }

            if (
                quantidadeElevador <=
                0
            ) {
                throw new Error(
                    "Quantidade do Elevador inválida no carrinho."
                );
            }

            if (
                !codigoParque
            ) {
                throw new Error(
                    "Pedido sem codigoIngressoParque."
                );
            }

            if (
                !codigoElevador
            ) {
                throw new Error(
                    "Pedido sem codigoIngressoElevador. O reenvio foi bloqueado para não gerar um código incorreto."
                );
            }

            const valorUnitarioElevadorCorreto =
                calcularValorUnitarioElevador(
                    quantidadeElevador
                );

            const valorElevadorCorreto =
                quantidadeElevador *
                valorUnitarioElevadorCorreto;

            /*
             * Corrige SOMENTE os campos internos
             * inconsistentes da promoção.
             *
             * NÃO altera:
             * valorTotal
             * valorPago
             * Pix
             * TXID
             * statusPagamento
             * códigos dos ingressos
             */
            const atualizacoesPreco:
                Record<
                    string,
                    unknown
                > = {};

            if (
                numeroSeguro(
                    pedido.valorUnitarioElevador
                ) !==
                valorUnitarioElevadorCorreto
            ) {
                atualizacoesPreco
                    .valorUnitarioElevador =
                    valorUnitarioElevadorCorreto;
            }

            if (
                numeroSeguro(
                    pedido.valorElevador
                ) !==
                valorElevadorCorreto
            ) {
                const valorParque =
                    numeroSeguro(
                        pedido.valorParque
                    );

                const valorTotal =
                    numeroSeguro(
                        pedido.valorTotal
                    );

                if (
                    valorParque +
                    valorElevadorCorreto ===
                    valorTotal
                ) {
                    atualizacoesPreco
                        .valorElevador =
                        valorElevadorCorreto;
                }
            }

            if (
                Object.keys(
                    atualizacoesPreco
                ).length >
                0
            ) {
                await atualizarPedido(
                    pedido.id,
                    {
                        ...atualizacoesPreco,

                        carrinhoElevadorCorrigidoEm:
                            agora,
                    }
                );
            }

            /* ------------------------------------------
               REENVIO DO PARQUE
            ------------------------------------------ */

            if (
                tipoReenvio ===
                "todos" ||
                tipoReenvio ===
                "parque"
            ) {
                console.log(
                    "REENVIO: ENVIANDO INGRESSO DO PARQUE",
                    {
                        pedidoId:
                            pedido.id,

                        email,

                        codigoParque,

                        quantidadeParque,
                    }
                );

                resultados.parque =
                    await enviarIngressoPorEmail(
                        {
                            para:
                                email,

                            nome:
                                pedido.nome ||
                                "Cliente",

                            produto:
                                "Ingresso Parque",

                            quantidade:
                                quantidadeParque,

                            codigoIngresso:
                                codigoParque,

                            pedidoId:
                                pedido.id,

                            dataVisita:
                                pedido.dataVisita ||
                                pedido.dataEntrada ||
                                "",
                        }
                    );
            }

            /* ------------------------------------------
               REENVIO / CORREÇÃO DO ELEVADOR
            ------------------------------------------ */

            if (
                tipoReenvio ===
                "todos" ||
                tipoReenvio ===
                "elevador"
            ) {
                console.log(
                    "REENVIO: ENVIANDO CORREÇÃO DO ELEVADOR",
                    {
                        pedidoId:
                            pedido.id,

                        email,

                        codigoElevador,

                        quantidadeElevador,
                    }
                );

                resultados.elevador =
                    await enviarCorrecaoIngressoElevadorPorEmail(
                        {
                            para:
                                email,

                            nome:
                                pedido.nome ||
                                "Cliente",

                            quantidade:
                                quantidadeElevador,

                            codigoIngressoElevador:
                                codigoElevador,

                            pedidoId:
                                pedido.id,

                            dataVisita:
                                pedido.dataVisita ||
                                pedido.dataEntrada ||
                                "",
                        }
                    );

                await atualizarPedido(
                    pedido.id,
                    {
                        emailElevadorCorrecaoEnviado:
                            true,

                        emailElevadorCorrecaoEnviadoEm:
                            agora,

                        emailElevadorCorrecaoCodigo:
                            codigoElevador,

                        emailElevadorCorrecaoErro:
                            "",

                        emailElevadorCorrecaoErroEm:
                            "",
                    }
                );
            }

            /* ------------------------------------------
               REGISTRAR REENVIO DO CARRINHO
            ------------------------------------------ */

            await atualizarPedido(
                pedido.id,
                {
                    emailIngressoReenviado:
                        true,

                    emailIngressoReenviadoEm:
                        agora,

                    emailIngressoReenviadoPara:
                        email,

                    emailCarrinhoSeparado:
                        true,
                }
            );

            return NextResponse.json(
                {
                    ok:
                        true,

                    mensagem:
                        tipoReenvio ===
                            "elevador"
                            ? "Ingresso correto do Elevador reenviado com sucesso."
                            : tipoReenvio ===
                                "parque"
                                ? "Ingresso do Parque reenviado com sucesso."
                                : "Ingressos do Parque e do Elevador reenviados separadamente com sucesso.",

                    pedido: {
                        pedidoId:
                            pedido.id,

                        email,

                        tipo:
                            pedido.tipo,

                        produto:
                            pedido.produto,

                        codigoIngressoParque:
                            codigoParque,

                        codigoIngressoElevador:
                            codigoElevador,

                        quantidadeParque,

                        quantidadeElevador,

                        valorUnitarioElevador:
                            valorUnitarioElevadorCorreto,

                        valorElevador:
                            valorElevadorCorreto,

                        valorTotal:
                            pedido.valorTotal,

                        valorPago:
                            pedido.valorPago,

                        statusPagamento:
                            pedido.statusPagamento,

                        statusOperacional:
                            pedido.statusOperacional,
                    },

                    resultadoEmail:
                        resultados,
                },
                {
                    status:
                        200,
                }
            );
        }

        /* ==========================================
           PEDIDO NORMAL / ANTIGO
        ========================================== */

        const quantidade =
            obterQuantidadePedido(
                pedido
            );

        const codigoIngresso =
            limpar(
                pedido.codigoIngresso ||
                pedido.qrCodeIngresso ||
                `PMN-${pedido.id}`
            );

        console.log(
            "REENVIO: ENVIANDO INGRESSO NORMAL",
            {
                pedidoId:
                    pedido.id,

                email,

                codigoIngresso,

                produto:
                    pedido.produto,

                quantidade,
            }
        );

        const resultado =
            await enviarIngressoPorEmail(
                {
                    para:
                        email,

                    nome:
                        pedido.nome ||
                        "Cliente",

                    produto:
                        pedido.produto ||
                        "Ingresso Parque Mundo Novo",

                    quantidade,

                    codigoIngresso,

                    pedidoId:
                        pedido.id,

                    dataVisita:
                        pedido.dataVisita ||
                        pedido.dataEntrada ||
                        "",
                }
            );

        await atualizarPedido(
            pedido.id,
            {
                emailIngressoReenviado:
                    true,

                emailIngressoReenviadoEm:
                    agora,

                emailIngressoReenviadoPara:
                    email,
            }
        );

        return NextResponse.json(
            {
                ok:
                    true,

                mensagem:
                    "Ingresso reenviado com sucesso.",

                pedido: {
                    pedidoId:
                        pedido.id,

                    codigoIngresso,

                    nome:
                        pedido.nome ||
                        "",

                    email,

                    produto:
                        pedido.produto ||
                        "",

                    quantidade,

                    statusPagamento:
                        pedido.statusPagamento,

                    statusOperacional:
                        pedido.statusOperacional,
                },

                resultadoEmail:
                    resultado ||
                    null,
            },
            {
                status:
                    200,
            }
        );
    } catch (
    error: any
    ) {
        const mensagemErro =
            error?.message ||
            error?.response?.data?.message ||
            error?.response ||
            String(
                error
            ) ||
            "Erro desconhecido";

        console.error(
            "REENVIO: ERRO AO ENVIAR INGRESSO",
            {
                pedidoId,

                erro:
                    mensagemErro,
            }
        );

        if (
            pedidoId
        ) {
            try {
                const pedidoAtual: any =
                    await buscarPedidoPorId(
                        pedidoId
                    );

                if (
                    pedidoEhCarrinhoParqueElevador(
                        pedidoAtual
                    )
                ) {
                    await atualizarPedido(
                        pedidoId,
                        {
                            emailElevadorCorrecaoErro:
                                mensagemErro,

                            emailElevadorCorrecaoErroEm:
                                new Date()
                                    .toISOString(),
                        }
                    );
                } else {
                    await atualizarPedido(
                        pedidoId,
                        {
                            emailIngressoErro:
                                mensagemErro,

                            emailIngressoErroEm:
                                new Date()
                                    .toISOString(),
                        }
                    );
                }
            } catch (
            erroFirestore
            ) {
                console.error(
                    "REENVIO: ERRO AO REGISTRAR FALHA NO FIRESTORE",
                    erroFirestore
                );
            }
        }

        return NextResponse.json(
            {
                ok:
                    false,

                pedidoId,

                error:
                    mensagemErro,
            },
            {
                status:
                    500,
            }
        );
    }
}