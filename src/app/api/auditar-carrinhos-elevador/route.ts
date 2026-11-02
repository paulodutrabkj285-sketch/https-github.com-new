import { NextResponse } from "next/server";
import { listarPedidos } from "@/lib/pedidos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const pedidos: any[] =
            await listarPedidos();

        const afetados =
            pedidos
                .filter((pedido) => {
                    const tipo =
                        String(
                            pedido?.tipo || ""
                        )
                            .trim()
                            .toLowerCase();

                    const statusPagamento =
                        String(
                            pedido?.statusPagamento || ""
                        )
                            .trim()
                            .toLowerCase();

                    const quantidadeElevador =
                        Number(
                            pedido?.quantidadeElevador ||
                            pedido?.qtdElevador ||
                            0
                        );

                    return (
                        tipo === "carrinho" &&
                        statusPagamento === "pago" &&
                        quantidadeElevador > 0
                    );
                })
                .map((pedido) => {
                    const quantidadeElevador =
                        Number(
                            pedido?.quantidadeElevador ||
                            pedido?.qtdElevador ||
                            0
                        );

                    const valorUnitarioCorreto =
                        quantidadeElevador >= 2
                            ? 60
                            : 75;

                    const codigoParque =
                        String(
                            pedido?.codigoIngressoParque ||
                            pedido?.codigoIngresso ||
                            ""
                        ).trim();

                    const codigoElevador =
                        String(
                            pedido?.codigoIngressoElevador ||
                            ""
                        ).trim();

                    return {
                        pedidoId:
                            pedido.id,

                        nome:
                            pedido.nome || "",

                        email:
                            pedido.email || "",

                        createdAt:
                            pedido.createdAt || "",

                        dataVisita:
                            pedido.dataVisita ||
                            pedido.dataEntrada ||
                            "",

                        produto:
                            pedido.produto || "",

                        quantidadeParque:
                            Number(
                                pedido.quantidadeParque ||
                                pedido.quantidade ||
                                0
                            ),

                        quantidadeElevador,

                        codigoIngressoParque:
                            codigoParque,

                        codigoIngressoElevador:
                            codigoElevador,

                        valorParque:
                            Number(
                                pedido.valorParque ||
                                0
                            ),

                        valorElevador:
                            Number(
                                pedido.valorElevador ||
                                0
                            ),

                        valorUnitarioElevadorAtual:
                            Number(
                                pedido.valorUnitarioElevador ||
                                0
                            ),

                        valorUnitarioElevadorCorreto:
                            valorUnitarioCorreto,

                        valorTotal:
                            Number(
                                pedido.valorTotal ||
                                0
                            ),

                        valorPago:
                            Number(
                                pedido.valorPago ||
                                0
                            ),

                        elevadorValidado:
                            pedido.elevadorValidado ===
                            true,

                        elevadorQuantidadeValidada:
                            Number(
                                pedido.elevadorQuantidadeValidada ||
                                0
                            ),

                        emailElevadorEnviado:
                            pedido.emailElevadorEnviado ===
                            true,

                        emailCarrinhoSeparado:
                            pedido.emailCarrinhoSeparado ===
                            true,

                        emailElevadorCorrecaoEnviado:
                            pedido.emailElevadorCorrecaoEnviado ===
                            true,

                        precisaCorrecaoPreco:
                            Number(
                                pedido.valorUnitarioElevador ||
                                0
                            ) !==
                            valorUnitarioCorreto,

                        temCodigoElevador:
                            Boolean(
                                codigoElevador
                            ),
                    };
                });

        return NextResponse.json({
            ok: true,

            totalAfetados:
                afetados.length,

            aviso:
                "AUDITORIA SOMENTE LEITURA. Nenhum pedido foi alterado e nenhum e-mail foi enviado.",

            pedidos:
                afetados,
        });
    } catch (error: any) {
        console.error(
            "AUDITORIA CARRINHOS ELEVADOR:",
            error
        );

        return NextResponse.json(
            {
                ok: false,

                error:
                    error?.message ||
                    String(error),
            },
            {
                status: 500,
            }
        );
    }
}
