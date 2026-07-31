import { atualizarPedido, buscarPedidoPorId } from "@/lib/pedidos";
import { enviarIngressoPorEmail } from "@/lib/email";

type FormaPagamento = "pix" | "cartao";

type FinalizarPagamentoParams = {
    pedidoId: string;
    formaPagamento: FormaPagamento;

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
    mensagem: string;
};

function converterParaCentavos(valor: unknown) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Math.round(numero * 100);
}

function gerarCodigoIngresso(pedidoId: string) {
    return `PMN-${pedidoId}`;
}

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
    if (!pedidoId) {
        throw new Error("O ID do pedido não foi informado.");
    }

    const pedido: any = await buscarPedidoPorId(pedidoId);

    if (!pedido) {
        console.error("FINALIZAÇÃO: PEDIDO NÃO ENCONTRADO", {
            pedidoId,
            formaPagamento,
        });

        return {
            ok: false,
            pedidoId,
            status: "pedido_nao_encontrado",
            mensagem: "Pedido não encontrado.",
        };
    }

    const codigoIngresso =
        pedido.codigoIngresso || gerarCodigoIngresso(pedido.id || pedidoId);

    /*
     * Proteção contra processamento duplicado.
     *
     * Webhooks e respostas de gateway podem ser entregues mais de uma vez.
     * Se o pedido já estiver pago, não devemos alterar novamente a transação.
     */
    if (pedido.statusPagamento === "pago") {
        let emailEnviado = Boolean(pedido.emailIngressoEnviado);

        if (!emailEnviado && pedido.email) {
            emailEnviado = await tentarEnviarEmail({
                pedido,
                pedidoId,
                codigoIngresso,
            });
        }

        console.log("FINALIZAÇÃO: PEDIDO JÁ ESTAVA PAGO", {
            pedidoId,
            formaPagamento,
            codigoIngresso,
        });

        return {
            ok: true,
            pedidoId,
            status: "ja_pago",
            codigoIngresso,
            emailEnviado,
            mensagem: "O pedido já estava confirmado.",
        };
    }

    /*
     * Conferência de valor.
     *
     * Ela ocorre somente quando valorPago foi informado.
     * Isso permite usar a mesma função para Pix e cartão.
     */
    if (valorPago !== undefined) {
        const valorPedidoCentavos = converterParaCentavos(pedido.valorTotal);
        const valorPagoCentavos = converterParaCentavos(valorPago);

        if (valorPagoCentavos !== valorPedidoCentavos) {
            await atualizarPedido(pedidoId, {
                statusPagamento: "valor_divergente",
                statusOperacional: "bloqueado",

                formaPagamento,

                valorPago: Number(valorPago),

                sicrediStatus:
                    formaPagamento === "pix"
                        ? "CONCLUIDA"
                        : cartaoStatus || "VALOR_DIVERGENTE",

                ...(formaPagamento === "pix"
                    ? {
                        pixEndToEndId: pixEndToEndId || "",
                        pixHorario: pixHorario || "",
                        sicrediTxid: sicrediTxid || pedido.sicrediTxid || "",
                    }
                    : {
                        cartaoTransacaoId: cartaoTransacaoId || "",
                        cartaoAutorizacao: cartaoAutorizacao || "",
                        cartaoStatus: cartaoStatus || "VALOR_DIVERGENTE",
                        cartaoBandeira: cartaoBandeira || "",
                        cartaoUltimosDigitos: cartaoUltimosDigitos || "",
                        cartaoParcelas: Number(cartaoParcelas || 1),
                    }),

                valorDivergenteRegistradoEm: new Date().toISOString(),
            });

            console.error("FINALIZAÇÃO: VALOR DIVERGENTE", {
                pedidoId,
                formaPagamento,
                valorPedido: pedido.valorTotal,
                valorPago,
            });

            return {
                ok: false,
                pedidoId,
                status: "valor_divergente",
                mensagem: "O valor pago é diferente do valor do pedido.",
            };
        }
    }

    const dataConfirmacao = new Date().toISOString();

    const dadosPagamento: Record<string, unknown> = {
        statusPagamento: "pago",
        statusOperacional: "ativo",

        formaPagamento,

        codigoIngresso,
        qrCodeIngresso: codigoIngresso,

        pagamentoConfirmadoEm: dataConfirmacao,
        atualizadoEm: dataConfirmacao,
    };

    if (valorPago !== undefined) {
        dadosPagamento.valorPago = Number(valorPago);
    }

    if (formaPagamento === "pix") {
        dadosPagamento.sicrediStatus = "CONCLUIDA";
        dadosPagamento.pixEndToEndId = pixEndToEndId || "";
        dadosPagamento.pixHorario = pixHorario || "";
        dadosPagamento.sicrediTxid =
            sicrediTxid || pedido.sicrediTxid || "";
        dadosPagamento.pixConfirmadoEm = dataConfirmacao;
    }

    if (formaPagamento === "cartao") {
        dadosPagamento.sicrediStatus = cartaoStatus || "APROVADO";
        dadosPagamento.cartaoStatus = cartaoStatus || "APROVADO";
        dadosPagamento.cartaoTransacaoId = cartaoTransacaoId || "";
        dadosPagamento.cartaoAutorizacao = cartaoAutorizacao || "";
        dadosPagamento.cartaoBandeira = cartaoBandeira || "";
        dadosPagamento.cartaoUltimosDigitos = cartaoUltimosDigitos || "";
        dadosPagamento.cartaoParcelas = Number(cartaoParcelas || 1);
        dadosPagamento.cartaoConfirmadoEm = dataConfirmacao;
    }

    await atualizarPedido(pedidoId, dadosPagamento);

    console.log("FINALIZAÇÃO: PAGAMENTO CONFIRMADO", {
        pedidoId,
        formaPagamento,
        valorPago,
        codigoIngresso,
    });

    const emailEnviado = await tentarEnviarEmail({
        pedido,
        pedidoId,
        codigoIngresso,
    });

    return {
        ok: true,
        pedidoId,
        status: "pago",
        codigoIngresso,
        emailEnviado,
        mensagem: "Pagamento confirmado e ingresso liberado.",
    };
}

async function tentarEnviarEmail({
    pedido,
    pedidoId,
    codigoIngresso,
}: {
    pedido: any;
    pedidoId: string;
    codigoIngresso: string;
}) {
    if (pedido.emailIngressoEnviado) {
        return true;
    }

    if (!pedido.email) {
        console.log("FINALIZAÇÃO: PEDIDO SEM E-MAIL", {
            pedidoId,
        });

        await atualizarPedido(pedidoId, {
            emailIngressoErro: "Pedido sem endereço de e-mail.",
            emailIngressoErroEm: new Date().toISOString(),
        });

        return false;
    }

    try {
        await enviarIngressoPorEmail({
            para: pedido.email,
            nome: pedido.nome || "Cliente",
            produto: pedido.produto || "Ingresso Parque Mundo Novo",
            quantidade: Number(
                pedido.quantidade || pedido.quantidadePessoas || 1
            ),
            codigoIngresso,
            pedidoId,
            dataVisita: pedido.dataVisita || pedido.dataEntrada || "",
        });

        await atualizarPedido(pedidoId, {
            emailIngressoEnviado: true,
            emailIngressoEnviadoEm: new Date().toISOString(),

            // Limpa eventual erro anterior.
            emailIngressoErro: "",
            emailIngressoErroEm: "",
        });

        console.log("FINALIZAÇÃO: E-MAIL DO INGRESSO ENVIADO", {
            pedidoId,
            email: pedido.email,
        });

        return true;
    } catch (error: any) {
        const mensagemErro = String(
            error?.message || error || "Erro desconhecido ao enviar e-mail."
        );

        console.error("FINALIZAÇÃO: ERRO AO ENVIAR E-MAIL", {
            pedidoId,
            erro: mensagemErro,
        });

        await atualizarPedido(pedidoId, {
            emailIngressoEnviado: false,
            emailIngressoErro: mensagemErro,
            emailIngressoErroEm: new Date().toISOString(),
        });

        /*
         * O pagamento continua aprovado mesmo se o e-mail falhar.
         * O ingresso permanece disponível na página de sucesso.
         */
        return false;
    }
}