import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    atualizarPedido,
    listarPedidos,
} from "@/lib/pedidos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
            pedido?.quantidadeElevador ||
            pedido?.qtdElevador
        ) > 0
    );
}

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
    try {
        const body =
            await req.json()
                .catch(
                    () => ({})
                );

        const confirmar =
            body?.confirmar ===
            true;

        if (
            !confirmar
        ) {
            return NextResponse.json(
                {
                    ok:
                        false,

                    executado:
                        false,

                    aviso:
                        "Nenhum pedido foi alterado. Envie confirmar:true para executar a correção.",
                },
                {
                    status:
                        400,
                }
            );
        }

        const pedidos: any[] =
            await listarPedidos();

        const candidatos =
            pedidos.filter(
                (
                    pedido
                ) => {
                    const statusPagamento =
                        limpar(
                            pedido
                                ?.statusPagamento
                        )
                            .toLowerCase();

                    const quantidadeElevador =
                        numeroSeguro(
                            pedido
                                ?.quantidadeElevador ||
                            pedido
                                ?.qtdElevador
                        );

                    const valorUnitarioAtual =
                        numeroSeguro(
                            pedido
                                ?.valorUnitarioElevador
                        );

                    const valorUnitarioCorreto =
                        calcularValorUnitarioElevador(
                            quantidadeElevador
                        );

                    return (
                        pedidoEhCarrinhoParqueElevador(
                            pedido
                        ) &&
                        statusPagamento ===
                            "pago" &&
                        quantidadeElevador >
                            0 &&
                        valorUnitarioAtual !==
                            valorUnitarioCorreto
                    );
                }
            );

        const corrigidos:
            Array<
                Record<
                    string,
                    unknown
                >
            > = [];

        const ignorados:
            Array<
                Record<
                    string,
                    unknown
                >
            > = [];

        for (
            const pedido of
            candidatos
        ) {
            const pedidoId =
                limpar(
                    pedido?.id
                );

            const quantidadeElevador =
                numeroSeguro(
                    pedido
                        ?.quantidadeElevador ||
                    pedido
                        ?.qtdElevador
                );

            const valorUnitarioCorreto =
                calcularValorUnitarioElevador(
                    quantidadeElevador
                );

            const valorElevadorCorreto =
                quantidadeElevador *
                valorUnitarioCorreto;

            const valorParque =
                numeroSeguro(
                    pedido
                        ?.valorParque
                );

            const valorTotal =
                numeroSeguro(
                    pedido
                        ?.valorTotal
                );

            const valorPago =
                numeroSeguro(
                    pedido
                        ?.valorPago
                );

            if (
                !pedidoId
            ) {
                ignorados.push(
                    {
                        motivo:
                            "Pedido sem ID.",
                    }
                );

                continue;
            }

            /*
             * Segurança:
             *
             * Só vamos corrigir o campo unitário.
             * valorTotal e valorPago não são alterados.
             *
             * Se existir valorParque e a soma dos
             * subtotais não bater com valorTotal,
             * o pedido é ignorado.
             */
            if (
                valorParque >
                    0 &&
                valorParque +
                    valorElevadorCorreto !==
                    valorTotal
            ) {
                ignorados.push(
                    {
                        pedidoId,

                        nome:
                            pedido.nome ||
                            "",

                        motivo:
                            "Subtotal calculado não confere com valorTotal.",

                        valorParque,

                        valorElevadorCorreto,

                        valorTotal,

                        valorPago,
                    }
                );

                continue;
            }

            await atualizarPedido(
                pedidoId,
                {
                    valorUnitarioElevador:
                        valorUnitarioCorreto,

                    precoElevadorCorrigidoEm:
                        new Date()
                            .toISOString(),

                    precoElevadorCorrigidoAutomaticamente:
                        true,
                }
            );

            corrigidos.push(
                {
                    pedidoId,

                    nome:
                        pedido.nome ||
                        "",

                    quantidadeElevador,

                    valorUnitarioAnterior:
                        numeroSeguro(
                            pedido
                                ?.valorUnitarioElevador
                        ),

                    valorUnitarioNovo:
                        valorUnitarioCorreto,

                    valorElevador:
                        pedido.valorElevador,

                    valorTotal,

                    valorPago,

                    elevadorValidado:
                        pedido
                            .elevadorValidado ===
                        true,
                }
            );
        }

        return NextResponse.json(
            {
                ok:
                    true,

                executado:
                    true,

                aviso:
                    "Somente valorUnitarioElevador foi corrigido. Nenhum e-mail foi enviado e nenhum pagamento foi alterado.",

                totalCandidatos:
                    candidatos.length,

                totalCorrigidos:
                    corrigidos.length,

                totalIgnorados:
                    ignorados.length,

                corrigidos,

                ignorados,
            },
            {
                status:
                    200,
            }
        );
    } catch (
    error: any
    ) {
        console.error(
            "CORREÇÃO PREÇO ELEVADOR:",
            error
        );

        return NextResponse.json(
            {
                ok:
                    false,

                error:
                    error?.message ||
                    String(
                        error
                    ),
            },
            {
                status:
                    500,
            }
        );
    }
}
