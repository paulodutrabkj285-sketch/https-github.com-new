import {
    atualizarPedido,
    buscarPedidoPorId,
} from "@/lib/pedidos";

import {
    enviarIngressoPorEmail,
} from "@/lib/email";

import {
    db,
} from "@/lib/firebase";

import {
    doc,
    updateDoc,
} from "firebase/firestore";

type FormaPagamento =
    | "pix"
    | "cartao";

type FinalizarPagamentoParams = {
    pedidoId: string;

    formaPagamento:
    FormaPagamento;

    valorPago?: number;

    // Dados opcionais do Pix
    pixEndToEndId?: string;
    pixHorario?: string;
    sicrediTxid?: string;

    // Dados opcionais do cartão
    cartaoTransacaoId?: string;
    cartaoAutorizacao?: string;
    cartaoStatus?: string;
    cartaoBandeira?: string;
    cartaoUltimosDigitos?: string;
    cartaoParcelas?: number;
};

type FinalizarPagamentoResultado = {
    ok: boolean;

    pedidoId: string;

    status:
    | "pago"
    | "ja_pago"
    | "valor_divergente"
    | "pedido_nao_encontrado";

    codigoIngresso?: string;

    emailEnviado?: boolean;

    reservaAgenciaAtualizada?: boolean;

    mensagem: string;
};

/* =========================================================
   VALOR PARA CENTAVOS
========================================================= */

function converterParaCentavos(
    valor: unknown
) {
    const numero =
        Number(
            valor || 0
        );

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return 0;
    }

    return Math.round(
        numero * 100
    );
}

/* =========================================================
   CÓDIGO DO INGRESSO
========================================================= */

function gerarCodigoIngresso(
    pedidoId: string
) {
    return `PMN-${pedidoId}`;
}


function pedidoEhCarrinhoParqueElevador(
    pedido: any
) {
    return (
        String(
            pedido?.tipo || ""
        ).trim() === "carrinho" &&
        Number(
            pedido?.quantidadeParque || 0
        ) > 0 &&
        Number(
            pedido?.quantidadeElevador || 0
        ) > 0
    );
}

function obterCodigosCarrinho(
    pedido: any,
    pedidoId: string
) {
    const codigoParque =
        String(
            pedido?.codigoIngressoParque ||
            pedido?.codigoIngresso ||
            gerarCodigoIngresso(pedidoId)
        ).trim();

    const codigoElevador =
        String(
            pedido?.codigoIngressoElevador ||
            `PMN-ELEV-${pedidoId}`
        ).trim();

    return {
        codigoParque,
        codigoElevador,
    };
}

/* =========================================================
   URL PÚBLICA DO PDF PARA O WHATSAPP
========================================================= */

function gerarUrlPublicaPdf({
    pedidoId,
    codigoIngresso,
}: {
    pedidoId: string;
    codigoIngresso: string;
}) {
    const baseUrl =
        process.env
            .NEXT_PUBLIC_SITE_URL
            ?.trim() ||
        "https://www.parquemundonovooficial.com.br";

    const url =
        new URL(
            "/api/pdf-ingresso",
            baseUrl
        );

    url.searchParams.set(
        "pedidoId",
        pedidoId
    );

    url.searchParams.set(
        "codigo",
        codigoIngresso
    );

    return url.toString();
}

/* =========================================================
   QUANTIDADE CORRETA DO INGRESSO
========================================================= */

function obterQuantidadeIngresso(
    pedido: any
): number {
    const produto =
        String(
            pedido?.produto ||
            ""
        )
            .trim()
            .toLowerCase();

    /*
     * CAMPING
     *
     * quantidade normalmente representa
     * a quantidade da reserva/item.
     *
     * quantidadePessoas representa
     * o número real de hóspedes.
     */

    if (
        produto.includes(
            "camping"
        )
    ) {
        const quantidadePessoas =
            Number(
                pedido
                    ?.quantidadePessoas ||
                0
            );

        if (
            Number.isFinite(
                quantidadePessoas
            ) &&
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
        Number(
            pedido?.quantidade ||
            0
        );

    if (
        Number.isFinite(
            quantidade
        ) &&
        quantidade > 0
    ) {
        return quantidade;
    }

    /*
     * FALLBACK
     */

    const quantidadePessoas =
        Number(
            pedido
                ?.quantidadePessoas ||
            0
        );

    if (
        Number.isFinite(
            quantidadePessoas
        ) &&
        quantidadePessoas >
        0
    ) {
        return quantidadePessoas;
    }

    return 1;
}

/* =========================================================
   IDENTIFICAR PEDIDO DE AGÊNCIA / PARCEIRO
========================================================= */

function pedidoEhDeParceiro(
    pedido: any
) {
    return (
        String(
            pedido?.origem ||
            ""
        ).trim() ===
        "parceiro" &&
        Boolean(
            String(
                pedido
                    ?.reservaAgenciaId ||
                ""
            ).trim()
        )
    );
}

/* =========================================================
   ATUALIZAR RESERVA DA AGÊNCIA COMO PAGA
========================================================= */

async function confirmarPagamentoReservaAgencia({
    pedido,
    pedidoId,
    formaPagamento,
    valorPago,
    dataConfirmacao,
}: {
    pedido: any;

    pedidoId: string;

    formaPagamento:
    FormaPagamento;

    valorPago?: number;

    dataConfirmacao: string;
}) {
    if (
        !pedidoEhDeParceiro(
            pedido
        )
    ) {
        return false;
    }

    const reservaAgenciaId =
        String(
            pedido
                .reservaAgenciaId ||
            ""
        ).trim();

    if (
        !reservaAgenciaId
    ) {
        return false;
    }

    try {
        const reservaRef =
            doc(
                db,
                "reservas_agencias",
                reservaAgenciaId
            );

        await updateDoc(
            reservaRef,
            {
                modalidadePagamento:
                    "antecipado",

                statusPagamento:
                    "pago",

                formaPagamento,

                pagamentoNaChegada:
                    false,

                statusOperacional:
                    "reservado_pago",

                pedidoId,

                pagamentoConfirmadoEm:
                    dataConfirmacao,

                ...(
                    valorPago !==
                        undefined
                        ? {
                            valorPago:
                                Number(
                                    valorPago
                                ),
                        }
                        : {}
                ),

                updatedAt:
                    new Date(),

                sincronizadoComPedido:
                    true,

                sincronizadoComPedidoEm:
                    dataConfirmacao,
            }
        );

        console.log(
            "FINALIZAÇÃO: RESERVA DA AGÊNCIA ATUALIZADA COMO PAGA",
            {
                pedidoId,

                reservaAgenciaId,

                codigoGrupo:
                    pedido
                        .codigoGrupo ||
                    null,

                formaPagamento,
            }
        );

        return true;
    } catch (
    error: any
    ) {
        const mensagemErro =
            String(
                error?.message ||
                error ||
                "Erro desconhecido."
            );

        console.error(
            "FINALIZAÇÃO: ERRO AO ATUALIZAR RESERVA DA AGÊNCIA",
            {
                pedidoId,

                reservaAgenciaId,

                erro:
                    mensagemErro,
            }
        );

        try {
            await atualizarPedido(
                pedidoId,
                {
                    reservaAgenciaSincronizada:
                        false,

                    reservaAgenciaErro:
                        mensagemErro,

                    reservaAgenciaErroEm:
                        new Date()
                            .toISOString(),
                }
            );
        } catch (
        erroAtualizacaoPedido
        ) {
            console.error(
                "FINALIZAÇÃO: NÃO FOI POSSÍVEL REGISTRAR ERRO DE SINCRONIZAÇÃO",
                erroAtualizacaoPedido
            );
        }

        return false;
    }
}

/* =========================================================
   MARCAR RESERVA COM VALOR DIVERGENTE
========================================================= */

async function marcarValorDivergenteReservaAgencia({
    pedido,
    pedidoId,
    formaPagamento,
    valorPago,
}: {
    pedido: any;

    pedidoId: string;

    formaPagamento:
    FormaPagamento;

    valorPago: number;
}) {
    if (
        !pedidoEhDeParceiro(
            pedido
        )
    ) {
        return;
    }

    const reservaAgenciaId =
        String(
            pedido
                .reservaAgenciaId ||
            ""
        ).trim();

    if (
        !reservaAgenciaId
    ) {
        return;
    }

    try {
        const reservaRef =
            doc(
                db,
                "reservas_agencias",
                reservaAgenciaId
            );

        await updateDoc(
            reservaRef,
            {
                statusPagamento:
                    "valor_divergente",

                statusOperacional:
                    "bloqueado",

                formaPagamento,

                valorPago:
                    Number(
                        valorPago
                    ),

                pedidoId,

                pagamentoNaChegada:
                    false,

                valorDivergenteRegistradoEm:
                    new Date()
                        .toISOString(),

                updatedAt:
                    new Date(),
            }
        );
    } catch (
    error
    ) {
        console.error(
            "FINALIZAÇÃO: ERRO AO MARCAR VALOR DIVERGENTE NA RESERVA",
            error
        );
    }
}

/* =========================================================
   FINALIZAR PAGAMENTO
========================================================= */

export async function finalizarPagamento({
    pedidoId,
    formaPagamento,
    valorPago,

    pixEndToEndId,
    pixHorario,
    sicrediTxid,

    cartaoTransacaoId,
    cartaoAutorizacao,
    cartaoStatus,
    cartaoBandeira,
    cartaoUltimosDigitos,
    cartaoParcelas,
}: FinalizarPagamentoParams): Promise<FinalizarPagamentoResultado> {
    if (
        !pedidoId
    ) {
        throw new Error(
            "O ID do pedido não foi informado."
        );
    }

    const pedido: any =
        await buscarPedidoPorId(
            pedidoId
        );

    if (
        !pedido
    ) {
        console.error(
            "FINALIZAÇÃO: PEDIDO NÃO ENCONTRADO",
            {
                pedidoId,
                formaPagamento,
            }
        );

        return {
            ok:
                false,

            pedidoId,

            status:
                "pedido_nao_encontrado",

            mensagem:
                "Pedido não encontrado.",
        };
    }

    const ehCarrinho =
        pedidoEhCarrinhoParqueElevador(
            pedido
        );

    const codigoIngresso =
        pedido.codigoIngresso ||
        gerarCodigoIngresso(
            pedido.id ||
            pedidoId
        );

    const {
        codigoParque,
        codigoElevador,
    } = obterCodigosCarrinho(
        pedido,
        pedido.id || pedidoId
    );

    /* =====================================================
       PEDIDO JÁ PAGO
    ===================================================== */

    if (
        pedido.statusPagamento ===
        "pago"
    ) {
        const reservaAgenciaAtualizada =
            await confirmarPagamentoReservaAgencia(
                {
                    pedido,

                    pedidoId,

                    formaPagamento:
                        pedido.formaPagamento ===
                            "cartao"
                            ? "cartao"
                            : pedido.formaPagamento ===
                                "pix"
                                ? "pix"
                                : formaPagamento,

                    valorPago:
                        pedido.valorPago !==
                            undefined
                            ? Number(
                                pedido.valorPago
                            )
                            : valorPago,

                    dataConfirmacao:
                        pedido.pagamentoConfirmadoEm ||
                        new Date()
                            .toISOString(),
                }
            );

        let emailEnviado =
            Boolean(
                pedido
                    .emailIngressoEnviado
            );

        if (
            !emailEnviado &&
            pedido.email
        ) {
            emailEnviado =
                await tentarEnviarEmail(
                    {
                        pedido,

                        pedidoId,

                        codigoIngresso:
                            ehCarrinho
                                ? codigoParque
                                : codigoIngresso,
                    }
                );
        }

        console.log(
            "FINALIZAÇÃO: PEDIDO JÁ ESTAVA PAGO",
            {
                pedidoId,

                formaPagamento,

                codigoIngresso,

                emailEnviado,

                reservaAgenciaAtualizada,
            }
        );

        return {
            ok:
                true,

            pedidoId,

            status:
                "ja_pago",

            codigoIngresso,

            emailEnviado,

            reservaAgenciaAtualizada,

            mensagem:
                "O pedido já estava confirmado.",
        };
    }

    /* =====================================================
       CONFERÊNCIA DO VALOR
    ===================================================== */

    if (
        valorPago !==
        undefined
    ) {
        const valorPedidoCentavos =
            converterParaCentavos(
                pedido.valorTotal
            );

        const valorPagoCentavos =
            converterParaCentavos(
                valorPago
            );

        if (
            valorPagoCentavos !==
            valorPedidoCentavos
        ) {
            await atualizarPedido(
                pedidoId,
                {
                    statusPagamento:
                        "valor_divergente",

                    statusOperacional:
                        "bloqueado",

                    formaPagamento,

                    valorPago:
                        Number(
                            valorPago
                        ),

                    sicrediStatus:
                        formaPagamento ===
                            "pix"
                            ? "CONCLUIDA"
                            : cartaoStatus ||
                            "VALOR_DIVERGENTE",

                    ...(
                        formaPagamento ===
                            "pix"
                            ? {
                                pixEndToEndId:
                                    pixEndToEndId ||
                                    "",

                                pixHorario:
                                    pixHorario ||
                                    "",

                                sicrediTxid:
                                    sicrediTxid ||
                                    pedido.sicrediTxid ||
                                    "",
                            }
                            : {
                                cartaoTransacaoId:
                                    cartaoTransacaoId ||
                                    "",

                                cartaoAutorizacao:
                                    cartaoAutorizacao ||
                                    "",

                                cartaoStatus:
                                    cartaoStatus ||
                                    "VALOR_DIVERGENTE",

                                cartaoBandeira:
                                    cartaoBandeira ||
                                    "",

                                cartaoUltimosDigitos:
                                    cartaoUltimosDigitos ||
                                    "",

                                cartaoParcelas:
                                    Number(
                                        cartaoParcelas ||
                                        1
                                    ),
                            }
                    ),

                    valorDivergenteRegistradoEm:
                        new Date()
                            .toISOString(),
                }
            );

            await marcarValorDivergenteReservaAgencia(
                {
                    pedido,

                    pedidoId,

                    formaPagamento,

                    valorPago:
                        Number(
                            valorPago
                        ),
                }
            );

            console.error(
                "FINALIZAÇÃO: VALOR DIVERGENTE",
                {
                    pedidoId,

                    formaPagamento,

                    valorPedido:
                        pedido.valorTotal,

                    valorPago,
                }
            );

            return {
                ok:
                    false,

                pedidoId,

                status:
                    "valor_divergente",

                mensagem:
                    "O valor pago é diferente do valor do pedido.",
            };
        }
    }

    /* =====================================================
       PAGAMENTO CONFIRMADO
    ===================================================== */

    const dataConfirmacao =
        new Date()
            .toISOString();

    const dadosPagamento:
        Record<
            string,
            unknown
        > = {
        statusPagamento:
            "pago",

        statusOperacional:
            "ativo",

        formaPagamento,

        codigoIngresso:
            ehCarrinho
                ? codigoParque
                : codigoIngresso,

        qrCodeIngresso:
            ehCarrinho
                ? codigoParque
                : codigoIngresso,

        ...(ehCarrinho
            ? {
                codigoIngressoParque:
                    codigoParque,

                qrCodeIngressoParque:
                    codigoParque,

                codigoIngressoElevador:
                    codigoElevador,

                qrCodeIngressoElevador:
                    codigoElevador,

                elevador:
                    true,

                elevadorValidado:
                    false,

                elevadorQuantidadeValidada:
                    Number(
                        pedido.elevadorQuantidadeValidada ||
                        0
                    ),
            }
            : {}),

        pagamentoConfirmadoEm:
            dataConfirmacao,

        atualizadoEm:
            dataConfirmacao,
    };

    if (
        valorPago !==
        undefined
    ) {
        dadosPagamento
            .valorPago =
            Number(
                valorPago
            );
    }

    /* =====================================================
       PIX
    ===================================================== */

    if (
        formaPagamento ===
        "pix"
    ) {
        dadosPagamento
            .sicrediStatus =
            "CONCLUIDA";

        dadosPagamento
            .pixEndToEndId =
            pixEndToEndId ||
            "";

        dadosPagamento
            .pixHorario =
            pixHorario ||
            "";

        dadosPagamento
            .sicrediTxid =
            sicrediTxid ||
            pedido.sicrediTxid ||
            "";

        dadosPagamento
            .pixConfirmadoEm =
            dataConfirmacao;
    }

    /* =====================================================
       CARTÃO
    ===================================================== */

    if (
        formaPagamento ===
        "cartao"
    ) {
        dadosPagamento
            .sicrediStatus =
            cartaoStatus ||
            "APROVADO";

        dadosPagamento
            .cartaoStatus =
            cartaoStatus ||
            "APROVADO";

        dadosPagamento
            .cartaoTransacaoId =
            cartaoTransacaoId ||
            "";

        dadosPagamento
            .cartaoAutorizacao =
            cartaoAutorizacao ||
            "";

        dadosPagamento
            .cartaoBandeira =
            cartaoBandeira ||
            "";

        dadosPagamento
            .cartaoUltimosDigitos =
            cartaoUltimosDigitos ||
            "";

        dadosPagamento
            .cartaoParcelas =
            Number(
                cartaoParcelas ||
                1
            );

        dadosPagamento
            .cartaoConfirmadoEm =
            dataConfirmacao;
    }

    /* =====================================================
       ATUALIZA PEDIDO
    ===================================================== */

    await atualizarPedido(
        pedidoId,
        dadosPagamento
    );

    console.log(
        "FINALIZAÇÃO: PAGAMENTO CONFIRMADO",
        {
            pedidoId,

            formaPagamento,

            valorPago,

            codigoIngresso:
                ehCarrinho
                    ? codigoParque
                    : codigoIngresso,

            codigoIngressoElevador:
                ehCarrinho
                    ? codigoElevador
                    : null,

            origem:
                pedido.origem ||
                "site",

            reservaAgenciaId:
                pedido
                    .reservaAgenciaId ||
                null,
        }
    );

    /* =====================================================
       SINCRONIZA RESERVA DA AGÊNCIA
    ===================================================== */

    const reservaAgenciaAtualizada =
        await confirmarPagamentoReservaAgencia(
            {
                pedido,

                pedidoId,

                formaPagamento,

                valorPago,

                dataConfirmacao,
            }
        );

    if (
        pedidoEhDeParceiro(
            pedido
        )
    ) {
        try {
            await atualizarPedido(
                pedidoId,
                {
                    reservaAgenciaSincronizada:
                        reservaAgenciaAtualizada,

                    reservaAgenciaSincronizadaEm:
                        reservaAgenciaAtualizada
                            ? dataConfirmacao
                            : "",
                }
            );
        } catch (
        error
        ) {
            console.error(
                "FINALIZAÇÃO: ERRO AO REGISTRAR SINCRONIZAÇÃO DA RESERVA NO PEDIDO",
                error
            );
        }
    }

    /* =====================================================
       E-MAIL + WHATSAPP
    ===================================================== */

    const emailEnviado =
        await tentarEnviarEmail(
            {
                pedido,

                pedidoId,

                codigoIngresso:
                    ehCarrinho
                        ? codigoParque
                        : codigoIngresso,
            }
        );

    /* =====================================================
       RESULTADO
    ===================================================== */

    return {
        ok:
            true,

        pedidoId,

        status:
            "pago",

        codigoIngresso,

        emailEnviado,

        reservaAgenciaAtualizada,

        mensagem:
            pedidoEhDeParceiro(
                pedido
            )
                ? "Pagamento confirmado e reserva da agência liberada."
                : ehCarrinho
                    ? "Pagamento confirmado e ingressos do Parque e do Elevador liberados separadamente."
                    : "Pagamento confirmado e ingresso liberado.",
    };
}

/* =========================================================
   ENVIO DO E-MAIL + WHATSAPP
========================================================= */

async function tentarEnviarEmail({
    pedido,
    pedidoId,
    codigoIngresso,
}: {
    pedido: any;

    pedidoId: string;

    codigoIngresso: string;
}) {
    if (
        pedido
            .emailIngressoEnviado
    ) {
        return true;
    }

    if (
        !pedido.email
    ) {
        console.log(
            "FINALIZAÇÃO: PEDIDO SEM E-MAIL",
            {
                pedidoId,
            }
        );

        await atualizarPedido(
            pedidoId,
            {
                emailIngressoErro:
                    "Pedido sem endereço de e-mail.",

                emailIngressoErroEm:
                    new Date()
                        .toISOString(),
            }
        );

        return false;
    }

    try {
        const telefone =
            String(
                pedido.telefone ||
                pedido.celular ||
                pedido.whatsapp ||
                ""
            ).trim();

        const ehCarrinho =
            pedidoEhCarrinhoParqueElevador(
                pedido
            );

        const {
            codigoParque,
            codigoElevador,
        } = obterCodigosCarrinho(
            pedido,
            pedido.id || pedidoId
        );

        const dataVisita =
            pedido.dataVisita ||
            pedido.dataEntrada ||
            "";

        let whatsappResultado: any =
            null;

        if (ehCarrinho) {
            const quantidadeParque =
                Number(
                    pedido.quantidadeParque ||
                    pedido.quantidade ||
                    1
                );

            const quantidadeElevador =
                Number(
                    pedido.quantidadeElevador ||
                    pedido.qtdElevador ||
                    1
                );

            const whatsappPdfUrlParque =
                gerarUrlPublicaPdf(
                    {
                        pedidoId,

                        codigoIngresso:
                            codigoParque,
                    }
                );

            console.log(
                "FINALIZAÇÃO: ENVIANDO INGRESSO DO PARQUE",
                {
                    pedidoId,
                    codigoParque,
                    quantidadeParque,
                }
            );

            const resultadoParque =
                await enviarIngressoPorEmail(
                    {
                        para:
                            pedido.email,

                        nome:
                            pedido.nome ||
                            "Cliente",

                        produto:
                            "Ingresso Parque",

                        quantidade:
                            quantidadeParque,

                        codigoIngresso:
                            codigoParque,

                        pedidoId,

                        dataVisita,

                        telefone,

                        whatsappPdfUrl:
                            whatsappPdfUrlParque,
                    }
                );

            whatsappResultado =
                (resultadoParque as any)
                    ?.whatsapp ||
                null;

            console.log(
                "FINALIZAÇÃO: ENVIANDO INGRESSO DO ELEVADOR",
                {
                    pedidoId,
                    codigoElevador,
                    quantidadeElevador,
                }
            );

            /*
             * O Elevador é enviado em um segundo e-mail/PDF.
             *
             * Não enviamos WhatsApp nessa segunda chamada
             * para evitar que o template atual do Parque
             * seja reutilizado indevidamente no Elevador.
             */
            await enviarIngressoPorEmail(
                {
                    para:
                        pedido.email,

                    nome:
                        pedido.nome ||
                        "Cliente",

                    produto:
                        "Elevador Panorâmico",

                    quantidade:
                        quantidadeElevador,

                    codigoIngresso:
                        codigoElevador,

                    pedidoId,

                    dataVisita,
                }
            );

            await atualizarPedido(
                pedidoId,
                {
                    emailParqueEnviado:
                        true,

                    emailElevadorEnviado:
                        true,

                    emailCarrinhoSeparado:
                        true,
                }
            );
        } else {
            const whatsappPdfUrl =
                gerarUrlPublicaPdf(
                    {
                        pedidoId,

                        codigoIngresso,
                    }
                );

            const quantidade =
                obterQuantidadeIngresso(
                    pedido
                );

            console.log(
                "FINALIZAÇÃO: PREPARANDO ENVIO",
                {
                    pedidoId,

                    email:
                        pedido.email,

                    telefone:
                        telefone ||
                        null,

                    produto:
                        pedido.produto ||
                        null,

                    quantidadeFirestore:
                        pedido.quantidade ??
                        null,

                    quantidadePessoasFirestore:
                        pedido.quantidadePessoas ??
                        null,

                    quantidadeUtilizada:
                        quantidade,

                    whatsappPdfUrl,
                }
            );

            const resultadoEnvio =
                await enviarIngressoPorEmail(
                    {
                        para:
                            pedido.email,

                        nome:
                            pedido.nome ||
                            "Cliente",

                        produto:
                            pedido.produto ||
                            "Ingresso Parque Mundo Novo",

                        quantidade,

                        codigoIngresso,

                        pedidoId,

                        dataVisita,

                        telefone,

                        whatsappPdfUrl,
                    }
                );

            whatsappResultado =
                (resultadoEnvio as any)
                    ?.whatsapp ||
                null;
        }

        const whatsappEnviado =
            Boolean(
                whatsappResultado
                    ?.enviado
            );

        const agora =
            new Date()
                .toISOString();

        await atualizarPedido(
            pedidoId,
            {
                emailIngressoEnviado:
                    true,

                emailIngressoEnviadoEm:
                    agora,

                emailIngressoErro:
                    "",

                emailIngressoErroEm:
                    "",

                whatsappIngressoEnviado:
                    whatsappEnviado,

                whatsappIngressoEnviadoEm:
                    whatsappEnviado
                        ? agora
                        : "",

                whatsappIngressoErro:
                    whatsappEnviado
                        ? ""
                        : String(
                            whatsappResultado
                                ?.erro ||
                            whatsappResultado
                                ?.motivo ||
                            (
                                telefone
                                    ? "WhatsApp não enviado."
                                    : "Pedido sem telefone para WhatsApp."
                            )
                        ),

                whatsappIngressoErroEm:
                    whatsappEnviado
                        ? ""
                        : agora,
            }
        );

        console.log(
            "FINALIZAÇÃO: INGRESSO(S) PROCESSADO(S)",
            {
                pedidoId,

                email:
                    pedido.email,

                carrinho:
                    ehCarrinho,

                codigoParque:
                    ehCarrinho
                        ? codigoParque
                        : null,

                codigoElevador:
                    ehCarrinho
                        ? codigoElevador
                        : null,

                emailEnviado:
                    true,

                whatsappEnviado,
            }
        );

        return true;
    } catch (
    error: any
    ) {
        const mensagemErro =
            String(
                error?.message ||
                error ||
                "Erro desconhecido ao enviar e-mail."
            );

        console.error(
            "FINALIZAÇÃO: ERRO AO ENVIAR INGRESSO",
            {
                pedidoId,

                erro:
                    mensagemErro,
            }
        );

        await atualizarPedido(
            pedidoId,
            {
                emailIngressoEnviado:
                    false,

                emailIngressoErro:
                    mensagemErro,

                emailIngressoErroEm:
                    new Date()
                        .toISOString(),
            }
        );

        /*
         * O pagamento continua válido
         * mesmo se o envio do ingresso falhar.
         */
        return false;
    }
}