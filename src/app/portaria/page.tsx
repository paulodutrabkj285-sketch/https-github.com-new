"use client";

import {
    atualizarPedido,
    listarPedidosAtivosPortaria,
    Pedido,
} from "@/lib/pedidos";

import { db } from "@/lib/firebase";

import {
    atualizarReservaAgenciaComPontuacao,
    listarPedidosLocalmente,
    listarReservasAgenciasLocalmente,
    LocalValidacao,
    obterPendentes,
    registrarValidacaoOffline,
    registrarValidacaoReservaOffline,
    ReservaAgenciaCache,
    salvarPedidosLocalmente,
    salvarReservasAgenciasLocalmente,
    sincronizarPendentes,
} from "@/lib/portariaDb";

import {
    collection,
    doc,
    getDocs,
    updateDoc,
} from "firebase/firestore";

import {
    Html5Qrcode,
} from "html5-qrcode";

import {
    useEffect,
    useRef,
    useState,
} from "react";

/* ======================================
   FUNCIONÁRIOS AUTORIZADOS
====================================== */

const FUNCIONARIOS = [
    "HANDERSON",
    "DANIELA",
    "JULIA",
    "JHAMES",
    "JOSEVITOR",
    "SILVANA",
    "VICTOR",
    "WELLINGTON",
    "PEDRO",
    "FRANCISCO",
    "Perteson",
    "Matheus matias",
];

/* ======================================
   TIPOS
====================================== */

type PedidoPortaria =
    Pedido & {
        cachoeiraMundoNovoValidado?:
        boolean;

        cachoeiraMundoNovoValidadoPor?:
        string;

        cachoeiraMundoNovoValidadoEm?:
        string;
    };

type ReservaAgenciaPortaria =
    ReservaAgenciaCache & {
        cachoeiraMundoNovoValidado?:
        boolean;

        cachoeiraMundoNovoValidadoPor?:
        string;

        cachoeiraMundoNovoValidadoEm?:
        string;
    };

type DadosQr = {
    tipo:
    string;

    codigo:
    string;

    pedidoId:
    string;

    codigoGrupo:
    string;

    reservaAgenciaId:
    string;
};

/* ======================================
   COMPONENTE
====================================== */

export default function PortariaPage() {
    /* ======================================
       ITEM ATUAL
    ====================================== */

    const [
        pedido,
        setPedido,
    ] =
        useState<
            PedidoPortaria |
            null
        >(null);

    const [
        reservaAgencia,
        setReservaAgencia,
    ] =
        useState<
            ReservaAgenciaPortaria |
            null
        >(null);

    /* ======================================
       TELA
    ====================================== */

    const [
        mensagem,
        setMensagem,
    ] =
        useState(
            "Selecione o local de validação"
        );

    const [
        localValidacao,
        setLocalValidacao,
    ] =
        useState<
            LocalValidacao |
            ""
        >("");

    const [
        carregando,
        setCarregando,
    ] =
        useState(
            false
        );

    const [
        cameraAtiva,
        setCameraAtiva,
    ] =
        useState(
            false
        );

    const [
        codigoManual,
        setCodigoManual,
    ] =
        useState(
            ""
        );

    const [
        funcionario,
        setFuncionario,
    ] =
        useState(
            ""
        );

    const [
        splash,
        setSplash,
    ] =
        useState(
            true
        );

    /* ======================================
       OFFLINE
    ====================================== */

    const [
        isOnline,
        setIsOnline,
    ] =
        useState(
            true
        );

    const [
        pendentesCount,
        setPendentesCount,
    ] =
        useState(
            0
        );

    const [
        ultimaSinc,
        setUltimaSinc,
    ] =
        useState<
            string |
            null
        >(null);

    const [
        sincronizando,
        setSincronizando,
    ] =
        useState(
            false
        );

    /* ======================================
       CONTADORES
    ====================================== */

    const [
        entradasHoje,
        setEntradasHoje,
    ] =
        useState(
            0
        );

    const [
        entradasMes,
        setEntradasMes,
    ] =
        useState(
            0
        );

    const [
        totalUtilizados,
        setTotalUtilizados,
    ] =
        useState(
            0
        );

    const leitorRef =
        useRef<
            Html5Qrcode |
            null
        >(null);

    /* ======================================
       INICIALIZAÇÃO
    ====================================== */

    useEffect(
        () => {
            if (
                typeof window !==
                "undefined"
            ) {
                setIsOnline(
                    navigator.onLine
                );

                window.addEventListener(
                    "online",
                    handleOnline
                );

                window.addEventListener(
                    "offline",
                    handleOffline
                );
            }

            inicializarDados();

            const timer =
                setTimeout(
                    () => {
                        setSplash(
                            false
                        );
                    },
                    1800
                );

            return () => {
                if (
                    typeof window !==
                    "undefined"
                ) {
                    window.removeEventListener(
                        "online",
                        handleOnline
                    );

                    window.removeEventListener(
                        "offline",
                        handleOffline
                    );
                }

                clearTimeout(
                    timer
                );
            };
        },
        []
    );

    /* ======================================
       FILA
    ====================================== */

    useEffect(
        () => {
            obterPendentes()
                .then(
                    (
                        itens
                    ) => {
                        setPendentesCount(
                            itens.length
                        );
                    }
                )
                .catch(
                    (
                        error
                    ) => {
                        console.error(
                            "PORTARIA: erro ao contar pendências:",
                            error
                        );
                    }
                );
        },
        [
            pedido,
            reservaAgencia,
        ]
    );

    /* ======================================
       TROCA DE LOCAL
    ====================================== */

    useEffect(
        () => {
            if (
                !localValidacao
            ) {
                setEntradasHoje(
                    0
                );

                setEntradasMes(
                    0
                );

                setTotalUtilizados(
                    0
                );

                return;
            }

            setPedido(
                null
            );

            setReservaAgencia(
                null
            );

            setCodigoManual(
                ""
            );

            if (
                localValidacao ===
                "principal"
            ) {
                setMensagem(
                    "PORTARIA PRINCIPAL - Aguardando ingresso ou grupo"
                );
            } else {
                setMensagem(
                    "CACHOEIRA MUNDO NOVO - Aguardando ingresso ou grupo"
                );
            }

            atualizarContadores();
        },
        [
            localValidacao,
        ]
    );

    /* ======================================
       INTERNET
    ====================================== */

    function handleOnline() {
        setIsOnline(
            true
        );

        realizarSincronizacaoAutomatica();
    }

    function handleOffline() {
        setIsOnline(
            false
        );
    }

    /* ======================================
       RESERVAS NA NUVEM
    ====================================== */

    async function listarReservasAgenciasNuvem(): Promise<
        ReservaAgenciaPortaria[]
    > {
        const snapshot =
            await getDocs(
                collection(
                    db,
                    "reservas_agencias"
                )
            );

        return snapshot.docs.map(
            (
                documento
            ) => ({
                id:
                    documento.id,

                ...documento.data(),
            })
        ) as
            ReservaAgenciaPortaria[];
    }

    /* ======================================
       INICIALIZAÇÃO DOS DADOS
    ====================================== */

    async function inicializarDados() {
        try {
            const online =
                typeof navigator !==
                    "undefined"
                    ? navigator.onLine
                    : true;

            if (
                !online
            ) {
                return;
            }

            /* PEDIDOS */

            try {
                const pedidosNuvem =
                    await listarPedidosAtivosPortaria();

                await salvarPedidosLocalmente(
                    pedidosNuvem
                );
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: erro ao carregar pedidos:",
                    error
                );
            }

            /* RESERVAS */

            try {
                const reservas =
                    await listarReservasAgenciasNuvem();

                await salvarReservasAgenciasLocalmente(
                    reservas
                );
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: erro ao carregar reservas de agência:",
                    error
                );
            }

            /* SINCRONIZAÇÃO */

            try {
                await sincronizarPendentes();
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: erro ao sincronizar pendentes:",
                    error
                );
            }

            setUltimaSinc(
                new Date()
                    .toLocaleTimeString(
                        "pt-BR",
                        {
                            hour:
                                "2-digit",

                            minute:
                                "2-digit",
                        }
                    )
            );
        } catch (
        error
        ) {
            console.error(
                "PORTARIA: erro de inicialização:",
                error
            );
        }
    }

    /* ======================================
       SINCRONIZAÇÃO
    ====================================== */

    async function realizarSincronizacaoAutomatica() {
        try {
            setSincronizando(
                true
            );

            let enviados =
                0;

            try {
                enviados =
                    await sincronizarPendentes();
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: erro ao enviar pendências:",
                    error
                );
            }

            try {
                const pedidosNuvem =
                    await listarPedidosAtivosPortaria();

                await salvarPedidosLocalmente(
                    pedidosNuvem
                );
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: erro ao atualizar pedidos:",
                    error
                );
            }

            try {
                const reservasNuvem =
                    await listarReservasAgenciasNuvem();

                await salvarReservasAgenciasLocalmente(
                    reservasNuvem
                );
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: erro ao atualizar reservas:",
                    error
                );
            }

            setUltimaSinc(
                new Date()
                    .toLocaleTimeString(
                        "pt-BR",
                        {
                            hour:
                                "2-digit",
                            minute:
                                "2-digit",
                        }
                    )
            );

            const pendentes =
                await obterPendentes();

            setPendentesCount(
                pendentes.length
            );

            if (
                enviados >
                0
            ) {
                setMensagem(
                    `${enviados} validação(ões) sincronizada(s)`
                );

                vibrar(
                    "sucesso"
                );
            }

            await atualizarContadores();
        } catch (
        error
        ) {
            console.error(
                "PORTARIA: sincronização falhou:",
                error
            );

            setMensagem(
                "ERRO AO SINCRONIZAR"
            );
        } finally {
            setSincronizando(
                false
            );
        }
    }

    /* ======================================
       VIBRAÇÃO
    ====================================== */

    function vibrar(
        tipo:
            "sucesso" |
            "erro"
    ) {
        if (
            typeof navigator ===
            "undefined" ||
            !navigator.vibrate
        ) {
            return;
        }

        if (
            tipo ===
            "sucesso"
        ) {
            navigator.vibrate(
                120
            );
        } else {
            navigator.vibrate(
                [
                    180,
                    100,
                    180,
                ]
            );
        }
    }
    /* ======================================
   AUXILIARES
====================================== */

    function limpar(
        valor:
            unknown
    ) {
        return String(
            valor ||
            ""
        ).trim();
    }

    function pedidoExclusivoElevador(
        item?:
            Pedido |
            null
    ) {
        if (
            !item
        ) {
            return false;
        }

        const tipo =
            limpar(
                item.tipo
            ).toLowerCase();

        const produto =
            limpar(
                item.produto
            ).toLowerCase();

        if (
            tipo ===
            "elevador"
        ) {
            return true;
        }

        if (
            produto ===
            "elevador panorâmico" ||
            produto ===
            "elevador panoramico" ||
            produto ===
            "elevador"
        ) {
            return true;
        }

        return false;
    }

    function quantidadeDoPedido(
        item?:
            Pedido |
            null
    ) {
        if (
            !item
        ) {
            return 1;
        }

        const produto =
            String(
                item.produto ||
                item.tipo ||
                ""
            ).toLowerCase();

        const quantidade =
            Number(
                produto.includes("camping")
                    ? (
                        item.quantidadePessoas ||
                        item.quantidade ||
                        1
                    )
                    : (
                        item.quantidade ||
                        item.quantidadePessoas ||
                        1
                    )
            );

        if (
            !Number.isFinite(
                quantidade
            ) ||
            quantidade <=
            0
        ) {
            return 1;
        }

        return quantidade;
    }

    function quantidadeDaReserva(
        item?:
            ReservaAgenciaPortaria |
            null
    ) {
        if (
            !item
        ) {
            return 1;
        }

        const quantidade =
            Number(
                item.totalVisitantes ||
                1
            );

        if (
            !Number.isFinite(
                quantidade
            ) ||
            quantidade <=
            0
        ) {
            return 1;
        }

        return quantidade;
    }

    function textoPessoas(
        quantidade:
            number
    ) {
        return quantidade ===
            1
            ? "1 PESSOA"
            : `${quantidade} PESSOAS`;
    }

    function formatarMoeda(
        valor?:
            number
    ) {
        return Number(
            valor ||
            0
        ).toLocaleString(
            "pt-BR",
            {
                style:
                    "currency",

                currency:
                    "BRL",
            }
        );
    }

    function formatarDataHora(
        valor?:
            string
    ) {
        if (
            !valor
        ) {
            return "";
        }

        return new Date(
            valor
        ).toLocaleString(
            "pt-BR",
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit",
            }
        );
    }

    function formatarData(
        valor?:
            string
    ) {
        if (
            !valor
        ) {
            return "Não informada";
        }

        const partes =
            valor.split(
                "-"
            );

        if (
            partes.length ===
            3
        ) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        return valor;
    }

    function nomeLocal() {
        if (
            localValidacao ===
            "principal"
        ) {
            return "Portaria Principal";
        }

        if (
            localValidacao ===
            "cachoeira_mundo_novo"
        ) {
            return "Cachoeira Mundo Novo";
        }

        return "Local não selecionado";
    }

    /* ======================================
       VALIDADE
    ====================================== */

    function verificarValidadeData(
        dataVisita?: string,
        dataCompra?: string
    ) {
        if (
            !dataVisita
        ) {
            return {
                valido:
                    true,

                mensagem:
                    "",
            };
        }

        const hoje =
            new Date();

        hoje.setHours(
            0,
            0,
            0,
            0
        );

        const dataIngresso =
            new Date(
                `${dataVisita}T00:00:00`
            );

        dataIngresso.setHours(
            0,
            0,
            0,
            0
        );

        const dataCompraIngresso =
            dataCompra
                ? new Date(
                    dataCompra
                )
                : null;

        const temDataCompraValida =
            !!dataCompraIngresso &&
            !Number.isNaN(
                dataCompraIngresso.getTime()
            );

        /*
         * PEDIDO NORMAL:
         * pode antecipar em até 5 dias.
         *
         * RESERVA DE AGÊNCIA:
         * mantém a regra anterior de 1 dia.
         */
        const diasAntecipacao =
            temDataCompraValida
                ? 5
                : 1;

        const inicioPermitido =
            new Date(
                dataIngresso
            );

        inicioPermitido.setDate(
            inicioPermitido.getDate() -
            diasAntecipacao
        );

        const fimPermitido =
            temDataCompraValida &&
                dataCompraIngresso
                ? new Date(
                    dataCompraIngresso
                )
                : new Date(
                    dataIngresso
                );

        if (
            temDataCompraValida
        ) {
            /*
             * Ingresso normal:
             * validade de 6 meses
             * a partir da compra.
             */
            fimPermitido.setMonth(
                fimPermitido.getMonth() +
                6
            );
        } else {
            /*
             * Reserva de agência:
             * mantém a regra já existente.
             */
            fimPermitido.setDate(
                fimPermitido.getDate() +
                30
            );
        }

        fimPermitido.setHours(
            23,
            59,
            59,
            999
        );

        if (
            hoje <
            inicioPermitido
        ) {
            return {
                valido:
                    false,

                mensagem:
                    "AINDA NÃO VÁLIDO",
            };
        }

        if (
            hoje >
            fimPermitido
        ) {
            return {
                valido:
                    false,

                mensagem:
                    "EXPIRADO",
            };
        }

        return {
            valido:
                true,

            mensagem:
                "",
        };
    }

    /* ======================================
       PEDIDOS ATIVOS
    ====================================== */

    async function obterListaDePedidosAtiva(): Promise<
        PedidoPortaria[]
    > {
        if (
            isOnline
        ) {
            try {
                const pedidos =
                    await listarPedidosAtivosPortaria();

                try {
                    await salvarPedidosLocalmente(
                        pedidos
                    );
                } catch (
                error
                ) {
                    console.error(
                        "PORTARIA: erro no cache de pedidos:",
                        error
                    );
                }

                return pedidos as
                    PedidoPortaria[];
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: Firestore indisponível:",
                    error
                );
            }
        }

        try {
            return (
                await listarPedidosLocalmente()
            ) as
                PedidoPortaria[];
        } catch {
            return [];
        }
    }

    /* ======================================
       RESERVAS ATIVAS
    ====================================== */

    async function obterListaDeReservasAtiva(): Promise<
        ReservaAgenciaPortaria[]
    > {
        if (
            isOnline
        ) {
            try {
                const reservas =
                    await listarReservasAgenciasNuvem();

                try {
                    await salvarReservasAgenciasLocalmente(
                        reservas
                    );
                } catch (
                error
                ) {
                    console.error(
                        "PORTARIA: erro no cache de reservas:",
                        error
                    );
                }

                return reservas;
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: reservas Firestore indisponíveis:",
                    error
                );
            }
        }

        try {
            return (
                await listarReservasAgenciasLocalmente()
            ) as
                ReservaAgenciaPortaria[];
        } catch {
            return [];
        }
    }

    /* ======================================
       CONTADORES
    ====================================== */

    async function atualizarContadores() {
        if (
            !localValidacao
        ) {
            return;
        }

        try {
            const [
                pedidos,
                reservas,
            ] =
                await Promise.all(
                    [
                        obterListaDePedidosAtiva(),
                        obterListaDeReservasAtiva(),
                    ]
                );

            const hoje =
                new Date();

            const dia =
                hoje.getDate();

            const mes =
                hoje.getMonth();

            const ano =
                hoje.getFullYear();

            let contadorHoje =
                0;

            let contadorMes =
                0;

            let contadorTotal =
                0;

            function somar(
                quantidade:
                    number,

                utilizado:
                    boolean,

                dataEntrada:
                    string
            ) {
                if (
                    !utilizado
                ) {
                    return;
                }

                contadorTotal +=
                    quantidade;

                if (
                    !dataEntrada
                ) {
                    return;
                }

                const data =
                    new Date(
                        dataEntrada
                    );

                if (
                    data.getDate() ===
                    dia &&
                    data.getMonth() ===
                    mes &&
                    data.getFullYear() ===
                    ano
                ) {
                    contadorHoje +=
                        quantidade;
                }

                if (
                    data.getMonth() ===
                    mes &&
                    data.getFullYear() ===
                    ano
                ) {
                    contadorMes +=
                        quantidade;
                }
            }

            /* PEDIDOS */

            pedidos.forEach(
                (
                    item
                ) => {
                    if (
                        localValidacao ===
                        "principal"
                    ) {
                        somar(
                            quantidadeDoPedido(
                                item
                            ),

                            item.statusOperacional ===
                            "utilizado",

                            item.utilizadoEm ||
                            item.validadoEm ||
                            ""
                        );
                    } else {
                        somar(
                            quantidadeDoPedido(
                                item
                            ),

                            item.cachoeiraMundoNovoValidado ===
                            true,

                            item.cachoeiraMundoNovoValidadoEm ||
                            ""
                        );
                    }
                }
            );

            /* RESERVAS DE AGÊNCIA */

            reservas.forEach(
                (
                    item
                ) => {
                    if (
                        localValidacao ===
                        "principal"
                    ) {
                        somar(
                            quantidadeDaReserva(
                                item
                            ),

                            item.statusOperacional ===
                            "utilizado",

                            limpar(
                                item.utilizadoEm ||
                                item.validadoEm
                            )
                        );
                    } else {
                        somar(
                            quantidadeDaReserva(
                                item
                            ),

                            item.cachoeiraMundoNovoValidado ===
                            true,

                            limpar(
                                item.cachoeiraMundoNovoValidadoEm
                            )
                        );
                    }
                }
            );

            setEntradasHoje(
                contadorHoje
            );

            setEntradasMes(
                contadorMes
            );

            setTotalUtilizados(
                contadorTotal
            );
        } catch (
        error
        ) {
            console.error(
                "PORTARIA: erro nos contadores:",
                error
            );
        }
    }

    /* ======================================
       EXTRAIR QR
    ====================================== */

    function extrairQr(
        texto:
            string
    ): DadosQr {
        const valor =
            limpar(
                texto
            );

        try {
            const dados =
                JSON.parse(
                    valor
                );

            return {
                tipo:
                    limpar(
                        dados?.tipo
                    ),

                codigo:
                    limpar(
                        dados?.codigo ||
                        dados?.codigoIngresso
                    ),

                pedidoId:
                    limpar(
                        dados?.pedidoId
                    ),

                codigoGrupo:
                    limpar(
                        dados?.codigoGrupo
                    ),

                reservaAgenciaId:
                    limpar(
                        dados?.reservaAgenciaId
                    ),
            };
        } catch {
            return {
                tipo:
                    "",

                codigo:
                    valor,

                pedidoId:
                    "",

                codigoGrupo:
                    valor.startsWith(
                        "GRP-"
                    )
                        ? valor
                        : "",

                reservaAgenciaId:
                    "",
            };
        }
    }

    /* ======================================
       PEDIDO - UTILIZAÇÃO
    ====================================== */

    function foiPedidoUtilizadoNesteLocal(
        item:
            PedidoPortaria
    ) {
        if (
            localValidacao ===
            "principal"
        ) {
            return (
                item.statusOperacional ===
                "utilizado"
            );
        }

        return (
            item.cachoeiraMundoNovoValidado ===
            true
        );
    }

    function dataUtilizacaoPedido(
        item?:
            PedidoPortaria |
            null
    ) {
        if (
            !item
        ) {
            return "";
        }

        if (
            localValidacao ===
            "principal"
        ) {
            return (
                item.utilizadoEm ||
                item.validadoEm ||
                ""
            );
        }

        return (
            item.cachoeiraMundoNovoValidadoEm ||
            ""
        );
    }

    function funcionarioUtilizacaoPedido(
        item?:
            PedidoPortaria |
            null
    ) {
        if (
            !item
        ) {
            return "";
        }

        if (
            localValidacao ===
            "principal"
        ) {
            return (
                item.validadoPor ||
                ""
            );
        }

        return (
            item.cachoeiraMundoNovoValidadoPor ||
            ""
        );
    }

    /* ======================================
       RESERVA - UTILIZAÇÃO
    ====================================== */

    function foiReservaUtilizadaNesteLocal(
        item:
            ReservaAgenciaPortaria
    ) {
        if (
            localValidacao ===
            "principal"
        ) {
            return (
                item.statusOperacional ===
                "utilizado"
            );
        }

        return (
            item.cachoeiraMundoNovoValidado ===
            true
        );
    }

    function dataUtilizacaoReserva(
        item?:
            ReservaAgenciaPortaria |
            null
    ) {
        if (
            !item
        ) {
            return "";
        }

        if (
            localValidacao ===
            "principal"
        ) {
            return limpar(
                item.utilizadoEm ||
                item.validadoEm
            );
        }

        return limpar(
            item.cachoeiraMundoNovoValidadoEm
        );
    }

    function funcionarioUtilizacaoReserva(
        item?:
            ReservaAgenciaPortaria |
            null
    ) {
        if (
            !item
        ) {
            return "";
        }

        if (
            localValidacao ===
            "principal"
        ) {
            return limpar(
                item.validadoPor
            );
        }

        return limpar(
            item.cachoeiraMundoNovoValidadoPor
        );
    }
    /* ======================================
   VALIDAR PEDIDO NORMAL
====================================== */

    function validarPedidoEncontrado(
        encontrado:
            PedidoPortaria,

        codigo?:
            string
    ) {
        setReservaAgencia(
            null
        );

        setPedido(
            encontrado
        );

        setCodigoManual(
            encontrado.codigoIngresso ||
            codigo ||
            ""
        );

        if (
            !localValidacao
        ) {
            setMensagem(
                "SELECIONE O LOCAL DE VALIDAÇÃO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            encontrado.statusPagamento !==
            "pago"
        ) {
            setMensagem(
                "INGRESSO NÃO PAGO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        /* ==================================
           CANCELADO / BLOQUEADO
        ================================== */

        if (
            encontrado.statusOperacional ===
            "cancelado" ||
            encontrado.statusOperacional ===
            "bloqueado"
        ) {
            setMensagem(
                encontrado.statusOperacional ===
                    "cancelado"
                    ? "INGRESSO CANCELADO"
                    : "INGRESSO BLOQUEADO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            pedidoExclusivoElevador(
                encontrado
            )
        ) {
            setMensagem(
                localValidacao ===
                    "principal"
                    ? "INGRESSO EXCLUSIVO DO ELEVADOR — APRESENTE O INGRESSO DE ENTRADA DO PARQUE"
                    : "INGRESSO DO ELEVADOR NÃO DÁ ACESSO À CACHOEIRA"
            );

            vibrar(
                "erro"
            );

            return;
        }

        const validade =
            verificarValidadeData(
                encontrado.dataVisita,
                encontrado.createdAt
            );

        if (
            !validade.valido
        ) {
            setMensagem(
                validade.mensagem ||
                "INGRESSO FORA DO PERÍODO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        /* PORTARIA PRINCIPAL */

        if (
            localValidacao ===
            "principal"
        ) {
            if (
                encontrado.statusOperacional ===
                "utilizado"
            ) {
                setMensagem(
                    "INGRESSO JÁ UTILIZADO NA PORTARIA PRINCIPAL"
                );

                vibrar(
                    "erro"
                );

                return;
            }

            setMensagem(
                "INGRESSO VÁLIDO"
            );

            vibrar(
                "sucesso"
            );

            return;
        }

        /* CACHOEIRA */

        if (
            encontrado.statusOperacional !==
            "utilizado"
        ) {
            setMensagem(
                "VALIDAR PRIMEIRO NA PORTARIA PRINCIPAL"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            encontrado.cachoeiraMundoNovoValidado ===
            true
        ) {
            setMensagem(
                "ACESSO À CACHOEIRA JÁ UTILIZADO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        setMensagem(
            "ACESSO À CACHOEIRA VÁLIDO"
        );

        vibrar(
            "sucesso"
        );
    }

    /* ======================================
       VALIDAR RESERVA DE AGÊNCIA
    ====================================== */

    function validarReservaEncontrada(
        encontrada:
            ReservaAgenciaPortaria
    ) {
        setPedido(
            null
        );

        setReservaAgencia(
            encontrada
        );

        setCodigoManual(
            encontrada.codigoGrupo ||
            ""
        );

        if (
            !localValidacao
        ) {
            setMensagem(
                "SELECIONE O LOCAL DE VALIDAÇÃO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            encontrada.statusOperacional ===
            "bloqueado"
        ) {
            setMensagem(
                "RESERVA BLOQUEADA"
            );

            vibrar(
                "erro"
            );

            return;
        }

        const validade =
            verificarValidadeData(
                encontrada.dataVisita
            );

        if (
            !validade.valido
        ) {
            setMensagem(
                validade.mensagem ||
                "RESERVA FORA DO PERÍODO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        /* ==================================
           PORTARIA PRINCIPAL
        ================================== */

        if (
            localValidacao ===
            "principal"
        ) {
            if (
                encontrada.statusOperacional ===
                "utilizado"
            ) {
                setMensagem(
                    "GRUPO JÁ UTILIZADO NA PORTARIA PRINCIPAL"
                );

                vibrar(
                    "erro"
                );

                return;
            }

            const statusPagamento =
                limpar(
                    encontrada.statusPagamento
                );

            if (
                statusPagamento ===
                "a_pagar_na_chegada"
            ) {
                setMensagem(
                    "RESERVA VÁLIDA - RECEBER PAGAMENTO"
                );

                vibrar(
                    "sucesso"
                );

                return;
            }

            if (
                statusPagamento ===
                "pago"
            ) {
                setMensagem(
                    "RESERVA DE AGÊNCIA VÁLIDA"
                );

                vibrar(
                    "sucesso"
                );

                return;
            }

            setMensagem(
                "PAGAMENTO DA RESERVA NÃO LIBERADO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        /* ==================================
           CACHOEIRA
        ================================== */

        if (
            encontrada.statusOperacional !==
            "utilizado"
        ) {
            setMensagem(
                "VALIDAR PRIMEIRO NA PORTARIA PRINCIPAL"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            encontrada.cachoeiraMundoNovoValidado ===
            true
        ) {
            setMensagem(
                "GRUPO JÁ UTILIZOU O ACESSO À CACHOEIRA"
            );

            vibrar(
                "erro"
            );

            return;
        }

        setMensagem(
            "ACESSO DO GRUPO À CACHOEIRA VÁLIDO"
        );

        vibrar(
            "sucesso"
        );
    }

    /* ======================================
       BUSCAR
    ====================================== */

    async function buscarIngresso(
        textoQr:
            string
    ) {
        if (
            !localValidacao
        ) {
            setMensagem(
                "SELECIONE O LOCAL DE VALIDAÇÃO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        try {
            setCarregando(
                true
            );

            setPedido(
                null
            );

            setReservaAgencia(
                null
            );

            const dadosQr =
                extrairQr(
                    textoQr
                );

            /* ==================================
               QR EXPLÍCITO DE AGÊNCIA
            ================================== */

            const pareceReserva =
                dadosQr.tipo ===
                "reserva_agencia" ||
                !!dadosQr.codigoGrupo ||
                !!dadosQr.reservaAgenciaId ||
                dadosQr.codigo.startsWith(
                    "GRP-"
                );

            if (
                pareceReserva
            ) {
                const reservas =
                    await obterListaDeReservasAtiva();

                const codigoBusca =
                    dadosQr.codigoGrupo ||
                    dadosQr.codigo;

                const encontrada =
                    reservas.find(
                        (
                            item
                        ) => {
                            return (
                                limpar(
                                    item.id
                                ) ===
                                dadosQr.reservaAgenciaId ||

                                limpar(
                                    item.codigoGrupo
                                ) ===
                                codigoBusca
                            );
                        }
                    );

                await pararCamera();

                if (
                    !encontrada
                ) {
                    setMensagem(
                        "RESERVA DE AGÊNCIA NÃO ENCONTRADA"
                    );

                    vibrar(
                        "erro"
                    );

                    return;
                }

                validarReservaEncontrada(
                    encontrada
                );

                return;
            }

            /* ==================================
               PRIMEIRO PROCURA INGRESSO NORMAL
            ================================== */

            const pedidos =
                await obterListaDePedidosAtiva();

            const encontradoPedido =
                pedidos.find(
                    (
                        item
                    ) => {
                        const codigoIngresso =
                            limpar(
                                item.codigoIngresso
                            );

                        const qrCode =
                            limpar(
                                item.qrCodeIngresso
                            );

                        const id =
                            limpar(
                                item.id
                            );

                        return (
                            codigoIngresso ===
                            dadosQr.codigo ||

                            qrCode ===
                            dadosQr.codigo ||

                            id ===
                            dadosQr.codigo ||

                            id ===
                            dadosQr.pedidoId
                        );
                    }
                );

            if (
                encontradoPedido
            ) {
                await pararCamera();

                validarPedidoEncontrado(
                    encontradoPedido,
                    dadosQr.codigo
                );

                return;
            }

            /* ==================================
               PROCURA RESERVA POR GRP DIGITADO
            ================================== */

            const reservas =
                await obterListaDeReservasAtiva();

            const encontradaReserva =
                reservas.find(
                    (
                        item
                    ) =>
                        limpar(
                            item.codigoGrupo
                        ) ===
                        dadosQr.codigo
                );

            await pararCamera();

            if (
                encontradaReserva
            ) {
                validarReservaEncontrada(
                    encontradaReserva
                );

                return;
            }

            setMensagem(
                "INGRESSO OU RESERVA NÃO ENCONTRADO"
            );

            vibrar(
                "erro"
            );
        } catch (
        error
        ) {
            console.error(
                "PORTARIA: erro ao validar:",
                error
            );

            setMensagem(
                "ERRO AO VALIDAR"
            );

            vibrar(
                "erro"
            );
        } finally {
            setCarregando(
                false
            );
        }
    }

    /* ======================================
       CÂMERA
    ====================================== */

    async function iniciarCamera() {
        if (
            !localValidacao
        ) {
            setMensagem(
                "SELECIONE O LOCAL DE VALIDAÇÃO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        setPedido(
            null
        );

        setReservaAgencia(
            null
        );

        setMensagem(
            `Aponte a câmera para o QR Code - ${nomeLocal()}`
        );

        setCameraAtiva(
            true
        );

        setTimeout(
            async () => {
                try {
                    const leitor =
                        new Html5Qrcode(
                            "leitor-portaria"
                        );

                    leitorRef.current =
                        leitor;

                    await leitor.start(
                        {
                            facingMode:
                                "environment",
                        },

                        {
                            fps:
                                10,

                            qrbox: {
                                width:
                                    280,

                                height:
                                    280,
                            },
                        },

                        async (
                            texto
                        ) => {
                            if (
                                texto
                            ) {
                                await buscarIngresso(
                                    texto
                                );
                            }
                        },

                        () => { }
                    );
                } catch (
                error
                ) {
                    console.error(
                        "PORTARIA: erro câmera:",
                        error
                    );

                    setMensagem(
                        "NÃO FOI POSSÍVEL ACESSAR A CÂMERA"
                    );

                    setCameraAtiva(
                        false
                    );

                    vibrar(
                        "erro"
                    );
                }
            },
            300
        );
    }

    async function pararCamera() {
        try {
            if (
                leitorRef.current
            ) {
                await leitorRef.current.stop();

                await leitorRef.current.clear();

                leitorRef.current =
                    null;
            }
        } catch (
        error
        ) {
            console.error(
                "PORTARIA: erro ao parar câmera:",
                error
            );
        } finally {
            setCameraAtiva(
                false
            );
        }
    }

    /* ======================================
       CONFIRMAR PEDIDO NORMAL
    ====================================== */

    async function confirmarPedidoNormal() {
        if (
            !pedido ||
            !localValidacao
        ) {
            return;
        }

        /* ==================================
           PROTEÇÃO: CANCELADO / BLOQUEADO
        ================================== */

        if (
            pedido.statusOperacional ===
            "cancelado" ||
            pedido.statusOperacional ===
            "bloqueado"
        ) {
            setMensagem(
                pedido.statusOperacional ===
                    "cancelado"
                    ? "INGRESSO CANCELADO"
                    : "INGRESSO BLOQUEADO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            pedidoExclusivoElevador(
                pedido
            )
        ) {
            setMensagem(
                localValidacao ===
                    "principal"
                    ? "INGRESSO EXCLUSIVO DO ELEVADOR — APRESENTE O INGRESSO DE ENTRADA DO PARQUE"
                    : "INGRESSO DO ELEVADOR NÃO DÁ ACESSO À CACHOEIRA"
            );

            vibrar(
                "erro"
            );

            return;
        }

        const validade =
            verificarValidadeData(
                pedido.dataVisita,
                pedido.createdAt
            );

        if (
            !validade.valido
        ) {
            setMensagem(
                validade.mensagem ||
                "INGRESSO INVÁLIDO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            localValidacao ===
            "principal" &&
            pedido.statusOperacional ===
            "utilizado"
        ) {
            setMensagem(
                "INGRESSO JÁ UTILIZADO NA PORTARIA PRINCIPAL"
            );

            vibrar(
                "erro"
            );

            return;
        }

        if (
            localValidacao ===
            "cachoeira_mundo_novo"
        ) {
            if (
                pedido.statusOperacional !==
                "utilizado"
            ) {
                setMensagem(
                    "VALIDAR PRIMEIRO NA PORTARIA PRINCIPAL"
                );

                vibrar(
                    "erro"
                );

                return;
            }

            if (
                pedido.cachoeiraMundoNovoValidado ===
                true
            ) {
                setMensagem(
                    "ACESSO À CACHOEIRA JÁ UTILIZADO"
                );

                vibrar(
                    "erro"
                );

                return;
            }
        }

        const agora =
            new Date()
                .toISOString();

        let dadosUtilizacao:
            Record<
                string,
                unknown
            >;

        if (
            localValidacao ===
            "principal"
        ) {
            dadosUtilizacao =
            {
                statusOperacional:
                    "utilizado",

                validadoPor:
                    funcionario,

                validadoEm:
                    agora,

                utilizadoEm:
                    agora,
            };
        } else {
            dadosUtilizacao =
            {
                cachoeiraMundoNovoValidado:
                    true,

                cachoeiraMundoNovoValidadoPor:
                    funcionario,

                cachoeiraMundoNovoValidadoEm:
                    agora,
            };
        }

        if (
            isOnline
        ) {
            await atualizarPedido(
                pedido.id,
                dadosUtilizacao
            );
        } else {
            await registrarValidacaoOffline(
                pedido.id,
                localValidacao,
                dadosUtilizacao
            );
        }

        setPedido({
            ...pedido,
            ...dadosUtilizacao,
        } as
            PedidoPortaria);

        setMensagem(
            localValidacao ===
                "principal"
                ? "ENTRADA PRINCIPAL CONFIRMADA"
                : "ACESSO À CACHOEIRA CONFIRMADO"
        );
    }
    /* ======================================
   CONFIRMAR RESERVA DE AGÊNCIA
====================================== */

    async function confirmarReservaAgencia() {
        if (
            !reservaAgencia ||
            !localValidacao
        ) {
            return;
        }

        const validade =
            verificarValidadeData(
                reservaAgencia.dataVisita
            );

        if (
            !validade.valido
        ) {
            setMensagem(
                validade.mensagem ||
                "RESERVA INVÁLIDA"
            );

            vibrar(
                "erro"
            );

            return;
        }

        const agora =
            new Date()
                .toISOString();

        let dadosUtilizacao:
            Record<
                string,
                unknown
            >;

        /* ==================================
           PORTARIA PRINCIPAL
        ================================== */

        if (
            localValidacao ===
            "principal"
        ) {
            if (
                reservaAgencia.statusOperacional ===
                "utilizado"
            ) {
                setMensagem(
                    "GRUPO JÁ UTILIZADO NA PORTARIA PRINCIPAL"
                );

                vibrar(
                    "erro"
                );

                return;
            }

            const statusPagamento =
                limpar(
                    reservaAgencia.statusPagamento
                );

            if (
                statusPagamento !==
                "a_pagar_na_chegada" &&
                statusPagamento !==
                "pago"
            ) {
                setMensagem(
                    "PAGAMENTO DA RESERVA NÃO LIBERADO"
                );

                vibrar(
                    "erro"
                );

                return;
            }

            dadosUtilizacao =
            {
                statusPagamento:
                    "pago",

                formaPagamento:
                    "pago_na_chegada",

                pagamentoNaChegada:
                    true,

                pagamentoConfirmadoEm:
                    agora,

                pagamentoConfirmadoPor:
                    funcionario,

                statusOperacional:
                    "utilizado",

                validadoPor:
                    funcionario,

                validadoEm:
                    agora,

                utilizadoEm:
                    agora,

                quantidadeValidada:
                    quantidadeDaReserva(
                        reservaAgencia
                    ),
            };
        } else {
            /* ==================================
               CACHOEIRA
            ================================== */

            if (
                reservaAgencia.statusOperacional !==
                "utilizado"
            ) {
                setMensagem(
                    "VALIDAR PRIMEIRO NA PORTARIA PRINCIPAL"
                );

                vibrar(
                    "erro"
                );

                return;
            }

            if (
                reservaAgencia.cachoeiraMundoNovoValidado ===
                true
            ) {
                setMensagem(
                    "GRUPO JÁ UTILIZOU O ACESSO À CACHOEIRA"
                );

                vibrar(
                    "erro"
                );

                return;
            }

            dadosUtilizacao =
            {
                cachoeiraMundoNovoValidado:
                    true,

                cachoeiraMundoNovoValidadoPor:
                    funcionario,

                cachoeiraMundoNovoValidadoEm:
                    agora,
            };
        }

        if (
            isOnline
        ) {
            await atualizarReservaAgenciaComPontuacao(
                reservaAgencia.id,
                localValidacao,
                dadosUtilizacao
            );
        } else {
            await registrarValidacaoReservaOffline(
                reservaAgencia.id,
                localValidacao,
                dadosUtilizacao
            );
        }

        setReservaAgencia({
            ...reservaAgencia,
            ...dadosUtilizacao,
        });

        setMensagem(
            localValidacao ===
                "principal"
                ? `PAGAMENTO E ENTRADA DE ${textoPessoas(
                    quantidadeDaReserva(
                        reservaAgencia
                    )
                )} CONFIRMADOS`
                : "ACESSO DO GRUPO À CACHOEIRA CONFIRMADO"
        );
    }

    /* ======================================
       CONFIRMAR ENTRADA
    ====================================== */

    async function confirmarEntrada() {
        if (
            !localValidacao
        ) {
            return;
        }

        if (
            !funcionario
        ) {
            setMensagem(
                "SELECIONE O FUNCIONÁRIO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        try {
            setCarregando(
                true
            );

            if (
                reservaAgencia
            ) {
                await confirmarReservaAgencia();
            } else if (
                pedido
            ) {
                await confirmarPedidoNormal();
            }

            vibrar(
                "sucesso"
            );

            try {
                const pendentes =
                    await obterPendentes();

                setPendentesCount(
                    pendentes.length
                );
            } catch (
            error
            ) {
                console.error(
                    "PORTARIA: erro fila:",
                    error
                );
            }

            if (
                isOnline
            ) {
                try {
                    const [
                        pedidosNuvem,
                        reservasNuvem,
                    ] =
                        await Promise.all(
                            [
                                listarPedidosAtivosPortaria(),
                                listarReservasAgenciasNuvem(),
                            ]
                        );

                    await Promise.all(
                        [
                            salvarPedidosLocalmente(
                                pedidosNuvem
                            ),

                            salvarReservasAgenciasLocalmente(
                                reservasNuvem
                            ),
                        ]
                    );
                } catch (
                error
                ) {
                    console.error(
                        "PORTARIA: erro ao atualizar cache após validação:",
                        error
                    );
                }
            }

            await atualizarContadores();
        } catch (
        error
        ) {
            console.error(
                "PORTARIA: erro ao confirmar:",
                error
            );

            setMensagem(
                "ERRO AO CONFIRMAR ENTRADA"
            );

            vibrar(
                "erro"
            );
        } finally {
            setCarregando(
                false
            );
        }
    }

    /* ======================================
       ESTADO VISUAL
    ====================================== */

    const itemAtualExiste =
        !!pedido ||
        !!reservaAgencia;

    const dataVisitaAtual =
        pedido?.dataVisita ||
        limpar(
            reservaAgencia?.dataVisita
        );

    const validadeAtual =
        verificarValidadeData(
            dataVisitaAtual,
            pedido?.createdAt
        );

    const usado =
        pedido
            ? foiPedidoUtilizadoNesteLocal(
                pedido
            )
            : reservaAgencia
                ? foiReservaUtilizadaNesteLocal(
                    reservaAgencia
                )
                : false;

    let valido =
        false;

    /* PEDIDO NORMAL */

    if (
        pedido
    ) {
        valido =
            pedido.statusPagamento ===
            "pago" &&
            pedido.statusOperacional !==
            "bloqueado" &&
            pedido.statusOperacional !==
            "cancelado" &&
            !pedidoExclusivoElevador(
                pedido
            ) &&
            validadeAtual.valido &&
            !usado;

        if (
            valido &&
            localValidacao ===
            "cachoeira_mundo_novo"
        ) {
            valido =
                pedido.statusOperacional ===
                "utilizado";
        }
    }

    /* RESERVA DE AGÊNCIA */

    if (
        reservaAgencia
    ) {
        const pagamentoAceito =
            reservaAgencia.statusPagamento ===
            "a_pagar_na_chegada" ||
            reservaAgencia.statusPagamento ===
            "pago";

        valido =
            reservaAgencia.statusOperacional !==
            "bloqueado" &&
            validadeAtual.valido &&
            !usado &&
            pagamentoAceito;

        if (
            valido &&
            localValidacao ===
            "cachoeira_mundo_novo"
        ) {
            valido =
                reservaAgencia.statusOperacional ===
                "utilizado";
        }
    }

    const quantidadeAtual =
        pedido
            ? quantidadeDoPedido(
                pedido
            )
            : reservaAgencia
                ? quantidadeDaReserva(
                    reservaAgencia
                )
                : 1;

    const usadoEm =
        pedido
            ? dataUtilizacaoPedido(
                pedido
            )
            : dataUtilizacaoReserva(
                reservaAgencia
            );

    const validadoPor =
        pedido
            ? funcionarioUtilizacaoPedido(
                pedido
            )
            : funcionarioUtilizacaoReserva(
                reservaAgencia
            );

    const painelClass =
        valido
            ? "bg-green-600/95 border-green-300"
            : itemAtualExiste
                ? "bg-red-600/95 border-red-300"
                : "bg-slate-950/85 border-white/30";

    /* ======================================
       SPLASH
    ====================================== */

    if (
        splash
    ) {
        return (
            <main
                className="flex min-h-screen items-center justify-center bg-cover bg-center px-6 text-white"
                style={{
                    backgroundImage:
                        "url('/fotos/fundo-geral.jpg')",
                }}
            >
                <div className="absolute inset-0 bg-black/70" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <img
                        src="/logo-final.png"
                        alt="Parque Mundo Novo"
                        className="h-36 w-36 rounded-3xl bg-white/10 object-contain p-3 shadow-2xl"
                    />

                    <h1 className="mt-6 text-3xl font-black">
                        Parque Mundo Novo
                    </h1>

                    <p className="mt-2 text-lg font-semibold">
                        Portaria Digital
                    </p>

                    <div className="mt-8 h-2 w-44 overflow-hidden rounded-full bg-white/20">
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-green-400" />
                    </div>

                    <p className="mt-4 text-sm text-white/70">
                        Carregando sistema...
                    </p>
                </div>
            </main>
        );
    }

    /* ======================================
       TELA PRINCIPAL
    ====================================== */

    return (
        <main
            className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-5 text-white"
            style={{
                backgroundImage:
                    "url('/fotos/fundo-geral.jpg')",
            }}
        >
            <div className="absolute inset-0 bg-black/65" />

            <div className="relative z-10 mx-auto max-w-md">

                {/* CABEÇALHO */}

                <header className="mb-4 text-center">
                    <img
                        src="/logo-final.png"
                        alt="Parque Mundo Novo"
                        className="mx-auto h-20 w-20 rounded-3xl bg-white/10 object-contain p-2 shadow-xl"
                    />

                    <h1 className="mt-3 text-2xl font-black">
                        Portaria Digital
                    </h1>

                    <p className="mt-1 text-sm font-semibold text-white/75">
                        Parque Mundo Novo
                    </p>
                </header>

                {/* INTERNET */}

                <section className="mb-4 rounded-3xl border border-white/15 bg-black/40 p-4 shadow-xl backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                                Conexão
                            </p>

                            <p
                                className={`mt-1 text-sm font-black ${isOnline
                                    ? "text-green-300"
                                    : "text-yellow-300"
                                    }`}
                            >
                                {isOnline
                                    ? "● ONLINE"
                                    : "● OFFLINE"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                realizarSincronizacaoAutomatica
                            }
                            disabled={
                                !isOnline ||
                                sincronizando
                            }
                            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black disabled:opacity-40"
                        >
                            {sincronizando
                                ? "SINCRONIZANDO..."
                                : "SINCRONIZAR"}
                        </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-white/70">
                        <div className="rounded-xl bg-white/5 p-2">
                            Pendentes:{" "}
                            <strong className="text-white">
                                {pendentesCount}
                            </strong>
                        </div>

                        <div className="rounded-xl bg-white/5 p-2">
                            Última sinc.:{" "}
                            <strong className="text-white">
                                {ultimaSinc ||
                                    "--:--"}
                            </strong>
                        </div>
                    </div>
                </section>

                {/* LOCAL DE VALIDAÇÃO */}

                <section className="mb-4 rounded-3xl border border-white/15 bg-black/40 p-4 shadow-xl backdrop-blur-md">
                    <p className="mb-3 text-sm font-black uppercase tracking-wide">
                        Local de validação
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() =>
                                setLocalValidacao(
                                    "principal"
                                )
                            }
                            className={`rounded-2xl px-3 py-4 text-sm font-black ${localValidacao ===
                                "principal"
                                ? "bg-green-500 text-black"
                                : "bg-white/10 text-white"
                                }`}
                        >
                            🏡 PORTARIA
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setLocalValidacao(
                                    "cachoeira_mundo_novo"
                                )
                            }
                            className={`rounded-2xl px-3 py-4 text-sm font-black ${localValidacao ===
                                "cachoeira_mundo_novo"
                                ? "bg-blue-500 text-white"
                                : "bg-white/10 text-white"
                                }`}
                        >
                            💦 CACHOEIRA
                        </button>
                    </div>

                    {localValidacao && (
                        <p className="mt-3 text-center text-xs font-bold text-white/70">
                            Local atual:{" "}
                            <span className="text-white">
                                {nomeLocal()}
                            </span>
                        </p>
                    )}
                </section>

                {/* FUNCIONÁRIO */}

                <section className="mb-4 rounded-3xl border border-white/15 bg-black/40 p-4 shadow-xl backdrop-blur-md">
                    <label className="mb-2 block text-sm font-black uppercase tracking-wide">
                        Funcionário
                    </label>

                    <select
                        value={
                            funcionario
                        }
                        onChange={(
                            event
                        ) =>
                            setFuncionario(
                                event.target.value
                            )
                        }
                        className="w-full rounded-2xl border border-white/20 bg-slate-900 px-4 py-4 font-bold text-white outline-none"
                    >
                        <option value="">
                            Selecione...
                        </option>

                        {FUNCIONARIOS.map(
                            (
                                nome
                            ) => (
                                <option
                                    key={
                                        nome
                                    }
                                    value={
                                        nome
                                    }
                                >
                                    {nome}
                                </option>
                            )
                        )}
                    </select>
                </section>

                {/* CONTADORES */}

                {localValidacao && (
                    <section className="mb-4 grid grid-cols-3 gap-2">
                        <div className="rounded-2xl border border-white/15 bg-black/40 p-3 text-center backdrop-blur-md">
                            <p className="text-xs font-bold text-white/60">
                                HOJE
                            </p>

                            <p className="mt-1 text-2xl font-black">
                                {entradasHoje}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-black/40 p-3 text-center backdrop-blur-md">
                            <p className="text-xs font-bold text-white/60">
                                MÊS
                            </p>

                            <p className="mt-1 text-2xl font-black">
                                {entradasMes}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-black/40 p-3 text-center backdrop-blur-md">
                            <p className="text-xs font-bold text-white/60">
                                TOTAL
                            </p>

                            <p className="mt-1 text-2xl font-black">
                                {totalUtilizados}
                            </p>
                        </div>
                    </section>
                )}

                {/* LEITOR */}

                <section className="mb-4 rounded-3xl border border-white/15 bg-black/40 p-4 shadow-xl backdrop-blur-md">
                    {!cameraAtiva ? (
                        <button
                            type="button"
                            onClick={
                                iniciarCamera
                            }
                            disabled={
                                !localValidacao ||
                                carregando
                            }
                            className="w-full rounded-2xl bg-green-500 px-5 py-4 text-lg font-black text-black shadow-lg disabled:opacity-40"
                        >
                            📷 LER QR CODE
                        </button>
                    ) : (
                        <>
                            <div
                                id="leitor-portaria"
                                className="overflow-hidden rounded-2xl bg-black"
                            />

                            <button
                                type="button"
                                onClick={
                                    pararCamera
                                }
                                className="mt-3 w-full rounded-2xl bg-red-600 px-5 py-3 font-black text-white"
                            >
                                FECHAR CÂMERA
                            </button>
                        </>
                    )}

                    <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/20" />

                        <span className="text-xs font-bold text-white/50">
                            OU
                        </span>

                        <div className="h-px flex-1 bg-white/20" />
                    </div>

                    <input
                        value={
                            codigoManual
                        }
                        onChange={(
                            event
                        ) =>
                            setCodigoManual(
                                event.target.value
                            )
                        }
                        onKeyDown={(
                            event
                        ) => {
                            if (
                                event.key ===
                                "Enter"
                            ) {
                                buscarIngresso(
                                    codigoManual
                                );
                            }
                        }}
                        placeholder="Digite o código do ingresso ou grupo"
                        className="w-full rounded-2xl border border-white/20 bg-slate-900 px-4 py-4 font-bold text-white outline-none placeholder:text-white/35"
                    />

                    <button
                        type="button"
                        onClick={() =>
                            buscarIngresso(
                                codigoManual
                            )
                        }
                        disabled={
                            carregando ||
                            !codigoManual.trim() ||
                            !localValidacao
                        }
                        className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-4 font-black text-white disabled:opacity-40"
                    >
                        {carregando
                            ? "BUSCANDO..."
                            : "BUSCAR"}
                    </button>
                </section>

                {/* PAINEL DE RESULTADO */}

                <section
                    className={`mb-4 rounded-3xl border p-5 text-center shadow-2xl ${painelClass}`}
                >
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                        Resultado
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                        {mensagem}
                    </h2>

                    {itemAtualExiste && (
                        <p className="mt-2 text-sm font-bold">
                            {textoPessoas(
                                quantidadeAtual
                            )}
                        </p>
                    )}
                </section>

                {/* DADOS DO PEDIDO */}

                {pedido && (
                    <section className="mb-4 rounded-3xl border border-white/15 bg-black/50 p-5 shadow-xl backdrop-blur-md">
                        <p className="mb-3 rounded-xl bg-white/10 p-3 text-center text-base font-black">
                            🎟️ INGRESSO
                        </p>

                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-white/50">
                                    Cliente
                                </p>

                                <p className="text-lg font-black">
                                    {pedido.nome ||
                                        "Não informado"}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Produto
                                </p>

                                <p className="font-bold">
                                    {pedido.produto ||
                                        pedido.tipo ||
                                        "Ingresso Parque"}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Quantidade
                                </p>

                                <p className="font-bold">
                                    {textoPessoas(
                                        quantidadeDoPedido(
                                            pedido
                                        )
                                    )}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Código
                                </p>

                                <p className="font-black">
                                    {pedido.codigoIngresso ||
                                        pedido.id}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Data da visita
                                </p>

                                <p className="font-bold">
                                    {formatarData(
                                        pedido.dataVisita
                                    )}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Pagamento
                                </p>

                                <p className="font-bold">
                                    {pedido.statusPagamento ===
                                        "pago"
                                        ? "Confirmado"
                                        : pedido.statusPagamento ||
                                        "Não informado"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="font-black">
                                    🚪 Portaria Principal
                                </p>

                                <p className="mt-1 font-bold">
                                    {pedido.statusOperacional ===
                                        "utilizado"
                                        ? `✅ Validada${pedido.utilizadoEm
                                            ? ` em ${formatarDataHora(
                                                pedido.utilizadoEm
                                            )}`
                                            : ""
                                        }`
                                        : "⏳ Ainda não validada"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-white/10 p-4">
                                <p className="font-black">
                                    🌊 Cachoeira Mundo Novo
                                </p>

                                <p className="mt-1 font-bold">
                                    {pedido.cachoeiraMundoNovoValidado
                                        ? `✅ Validada${pedido.cachoeiraMundoNovoValidadoEm
                                            ? ` em ${formatarDataHora(
                                                pedido.cachoeiraMundoNovoValidadoEm
                                            )}`
                                            : ""
                                        }`
                                        : "⏳ Ainda não validada"}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Status
                                </p>

                                <p
                                    className={`font-black ${pedido.statusOperacional ===
                                        "cancelado"
                                        ? "text-red-300"
                                        : pedido.statusOperacional ===
                                            "bloqueado"
                                            ? "text-red-300"
                                            : pedido.statusOperacional ===
                                                "utilizado"
                                                ? "text-yellow-300"
                                                : "text-green-300"
                                        }`}
                                >
                                    {pedido.statusOperacional ===
                                        "cancelado"
                                        ? "⛔ INGRESSO CANCELADO"
                                        : pedido.statusOperacional ===
                                            "bloqueado"
                                            ? "⛔ INGRESSO BLOQUEADO"
                                            : pedido.statusOperacional ===
                                                "utilizado"
                                                ? "⚠️ INGRESSO UTILIZADO"
                                                : "✅ INGRESSO LIBERADO"}
                                </p>
                            </div>

                            {usado &&
                                usadoEm && (
                                    <div className="rounded-2xl bg-white/10 p-3">
                                        <p className="text-white/50">
                                            Utilizado em
                                        </p>

                                        <p className="font-bold">
                                            {formatarDataHora(
                                                usadoEm
                                            )}
                                        </p>

                                        {validadoPor && (
                                            <>
                                                <p className="mt-2 text-white/50">
                                                    Validado por
                                                </p>

                                                <p className="font-bold">
                                                    {validadoPor}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                        </div>
                    </section>
                )}

                {/* DADOS DA RESERVA */}

                {reservaAgencia && (
                    <section className="mb-4 rounded-3xl border border-white/15 bg-black/50 p-5 shadow-xl backdrop-blur-md">
                        <p className="text-xs font-black uppercase tracking-wider text-white/50">
                            Reserva de Agência
                        </p>

                        <div className="mt-4 space-y-3 text-sm">
                            <div>
                                <p className="text-white/50">
                                    Código do grupo
                                </p>

                                <p className="font-black">
                                    {reservaAgencia.codigoGrupo ||
                                        reservaAgencia.id}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Agência
                                </p>

                                <p className="font-bold">
                                    {limpar(reservaAgencia.nomeAgencia) ||
                                        "Agência parceira"}

                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Data da visita
                                </p>

                                <p className="font-bold">
                                    {formatarData(
                                        reservaAgencia.dataVisita
                                    )}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Visitantes
                                </p>

                                <p className="font-bold">
                                    {textoPessoas(
                                        quantidadeDaReserva(
                                            reservaAgencia
                                        )
                                    )}
                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Valor
                                </p>

                                <p className="font-bold">

                                    {formatarMoeda(
                                        Number(reservaAgencia.valorTotal || 0)
                                    )}


                                </p>
                            </div>

                            <div>
                                <p className="text-white/50">
                                    Pagamento
                                </p>

                                <p className="font-bold">
                                    {reservaAgencia.statusPagamento ||
                                        "Não informado"}
                                </p>
                            </div>

                            {usado &&
                                usadoEm && (
                                    <div className="rounded-2xl bg-white/10 p-3">
                                        <p className="text-white/50">
                                            Utilizado em
                                        </p>

                                        <p className="font-bold">
                                            {formatarDataHora(
                                                usadoEm
                                            )}
                                        </p>

                                        {validadoPor && (
                                            <>
                                                <p className="mt-2 text-white/50">
                                                    Validado por
                                                </p>

                                                <p className="font-bold">
                                                    {validadoPor}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                        </div>
                    </section>
                )}

                {/* CONFIRMAÇÃO */}

                {valido &&
                    itemAtualExiste && (
                        <button
                            type="button"
                            onClick={
                                confirmarEntrada
                            }
                            disabled={
                                carregando
                            }
                            className={`mt-5 w-full rounded-3xl px-5 py-6 text-xl font-black text-white shadow-xl disabled:opacity-60 ${localValidacao ===
                                "principal"
                                ? "bg-green-500"
                                : "bg-blue-500"
                                }`}
                        >
                            {reservaAgencia &&
                                localValidacao ===
                                "principal" &&
                                reservaAgencia.statusPagamento ===
                                "a_pagar_na_chegada"
                                ? `💰 CONFIRMAR PAGAMENTO E ENTRADA DE ${textoPessoas(
                                    quantidadeAtual
                                )}`
                                : localValidacao ===
                                    "principal"
                                    ? `✅ CONFIRMAR ENTRADA DE ${textoPessoas(
                                        quantidadeAtual
                                    )}`
                                    : `💦 CONFIRMAR ACESSO DE ${textoPessoas(
                                        quantidadeAtual
                                    )}`}
                        </button>
                    )}

                {!valido &&
                    itemAtualExiste && (
                        <button
                            type="button"
                            disabled
                            className="mt-5 w-full rounded-3xl bg-red-700 px-5 py-6 text-xl font-black text-white"
                        >
                            ⛔ ACESSO BLOQUEADO
                        </button>
                    )}

            </div>
        </main>
    );
}