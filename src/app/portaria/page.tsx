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
                    "PORTARIA: erro ao atualizar pedidos:",
                    error
                );
            }

            /* RESERVAS */

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

        const quantidade =
            Number(
                item.quantidade ||
                item.quantidadePessoas ||
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
        dataVisita?:
            string
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

        const inicioPermitido =
            new Date(
                dataIngresso
            );

        inicioPermitido.setDate(
            inicioPermitido.getDate() -
            1
        );

        const fimPermitido =
            new Date(
                dataIngresso
            );

        fimPermitido.setDate(
            fimPermitido.getDate() +
            30
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

        if (
            encontrado.statusOperacional ===
            "bloqueado"
        ) {
            setMensagem(
                "INGRESSO BLOQUEADO"
            );

            vibrar(
                "erro"
            );

            return;
        }

        const validade =
            verificarValidadeData(
                encontrado.dataVisita
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

        const validade =
            verificarValidadeData(
                pedido.dataVisita
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
                /*
                 * A confirmação da portaria
                 * também confirma o pagamento
                 * da reserva feita para pagar
                 * na chegada.
                 */
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

            /*
             * Se estiver online,
             * renova os caches para
             * refletir a gravação.
             */
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
            dataVisitaAtual
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

                    <h1 className="mt-2 text-2xl font-black">
                        Portaria Digital
                    </h1>
                </header>

                {/* LOCAL */}

                <section className="mb-4 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-xl">
                    <p className="mb-3 text-center text-sm font-black uppercase tracking-wide text-slate-600">
                        📍 Local de validação
                    </p>

                    <div className="grid gap-3">
                        <button
                            type="button"
                            onClick={() =>
                                setLocalValidacao(
                                    "principal"
                                )
                            }
                            className={`rounded-2xl border-4 px-4 py-5 text-lg font-black transition ${localValidacao ===
                                "principal"
                                ? "border-green-700 bg-green-700 text-white"
                                : "border-slate-200 bg-white text-slate-800"
                                }`}
                        >
                            🚪 PORTARIA PRINCIPAL
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setLocalValidacao(
                                    "cachoeira_mundo_novo"
                                )
                            }
                            className={`rounded-2xl border-4 px-4 py-5 text-lg font-black transition ${localValidacao ===
                                "cachoeira_mundo_novo"
                                ? "border-blue-700 bg-blue-700 text-white"
                                : "border-slate-200 bg-white text-slate-800"
                                }`}
                        >
                            🌊 CACHOEIRA MUNDO NOVO
                        </button>
                    </div>

                    {localValidacao && (
                        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-center text-sm font-black">
                            Local atual:{" "}
                            {nomeLocal()}
                        </p>
                    )}
                </section>

                {/* INTERNET */}

                <section className="mb-4 rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-sm shadow-lg">
                    <div className="flex items-center justify-between gap-2">

                        <div className="flex items-center gap-2">
                            <span
                                className={`h-3.5 w-3.5 rounded-full ${isOnline
                                    ? "animate-pulse bg-green-500"
                                    : "bg-red-500"
                                    }`}
                            />

                            <span className="font-bold uppercase">
                                {isOnline
                                    ? "Online"
                                    : "Offline"}
                            </span>
                        </div>

                        {isOnline && (
                            <button
                                onClick={
                                    realizarSincronizacaoAutomatica
                                }
                                disabled={
                                    sincronizando
                                }
                                className="rounded-xl bg-green-700 px-3 py-2 text-xs font-black disabled:opacity-50"
                            >
                                {sincronizando
                                    ? "SINCRONIZANDO..."
                                    : "SINCRONIZAR"}
                            </button>
                        )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-white/80">
                        <p>
                            Última sinc:
                            <br />

                            <strong className="text-white">
                                {ultimaSinc ||
                                    "Nunca"}
                            </strong>
                        </p>

                        <p className="text-right">
                            Fila:
                            <br />

                            <strong
                                className={
                                    pendentesCount >
                                        0
                                        ? "text-yellow-400"
                                        : "text-white"
                                }
                            >
                                {
                                    pendentesCount
                                }
                            </strong>
                        </p>
                    </div>

                    {!isOnline && (
                        <div className="mt-3 rounded-xl bg-red-950/50 p-3 text-center text-xs font-bold text-red-200">
                            ⚠️ OFFLINE
                            <br />
                            Use apenas um aparelho por
                            portaria enquanto estiver
                            sem internet.
                        </div>
                    )}
                </section>

                {/* CONTADORES */}

                {localValidacao && (
                    <>
                        <div className="mb-2 rounded-xl bg-black/70 p-2 text-center text-xs font-black uppercase">
                            Contadores —{" "}
                            {nomeLocal()}
                        </div>

                        <div className="mb-4 grid grid-cols-3 gap-2">
                            <div className="rounded-2xl bg-green-700/95 p-3 text-center shadow-lg">
                                <p className="text-xs font-bold">
                                    👥 Hoje
                                </p>

                                <p className="text-2xl font-black">
                                    {
                                        entradasHoje
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl bg-blue-700/95 p-3 text-center shadow-lg">
                                <p className="text-xs font-bold">
                                    📅 Mês
                                </p>

                                <p className="text-2xl font-black">
                                    {
                                        entradasMes
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl bg-purple-700/95 p-3 text-center shadow-lg">
                                <p className="text-xs font-bold">
                                    🏆 Total
                                </p>

                                <p className="text-2xl font-black">
                                    {
                                        totalUtilizados
                                    }
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* FUNCIONÁRIO */}

                <section className="mb-4 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-xl">
                    <p className="mb-2 text-sm font-black uppercase tracking-wide text-slate-600">
                        Funcionário responsável
                    </p>

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
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-lg font-black"
                    >
                        <option value="">
                            SELECIONE O FUNCIONÁRIO
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
                                    {
                                        nome
                                    }
                                </option>
                            )
                        )}
                    </select>

                    {funcionario && (
                        <p className="mt-3 rounded-xl bg-green-100 p-2 text-center text-sm font-black text-green-800">
                            ✅ Atendimento:{" "}
                            {
                                funcionario
                            }
                        </p>
                    )}
                </section>

                {/* RESULTADO */}

                <section
                    className={`rounded-3xl border-4 p-6 text-center shadow-2xl backdrop-blur-sm ${painelClass}`}
                >
                    <p className="text-7xl">
                        {valido
                            ? "✅"
                            : itemAtualExiste
                                ? "⛔"
                                : localValidacao
                                    ? "📷"
                                    : "📍"}
                    </p>

                    <h2 className="mt-4 text-3xl font-black leading-tight">
                        {
                            mensagem
                        }
                    </h2>

                    {/* QUANTIDADE */}

                    {valido && (
                        <div className="mt-5 rounded-3xl border-4 border-white bg-white px-4 py-6 text-green-700 shadow-2xl">
                            <p className="text-sm font-black uppercase tracking-[0.2em]">
                                Liberar
                            </p>

                            <p className="mt-2 text-5xl font-black">
                                {textoPessoas(
                                    quantidadeAtual
                                )}
                            </p>

                            <p className="mt-3 text-sm font-black">
                                {
                                    nomeLocal()
                                }
                            </p>
                        </div>
                    )}

                    {/* JÁ UTILIZADO */}

                    {usado &&
                        usadoEm && (
                            <div className="mt-4 rounded-2xl bg-white/20 p-4 text-center text-lg font-black">
                                Já utilizado em:
                                <br />

                                {formatarDataHora(
                                    usadoEm
                                )}

                                {validadoPor && (
                                    <>
                                        <br />
                                        Por:{" "}
                                        {
                                            validadoPor
                                        }
                                    </>
                                )}
                            </div>
                        )}

                    {/* PEDIDO NORMAL */}

                    {pedido && (
                        <div className="mt-6 rounded-2xl bg-white/15 p-4 text-left text-base font-bold">

                            <p className="mb-3 rounded-xl bg-black/20 p-2 text-center font-black">
                                🎟️ INGRESSO
                            </p>

                            <p>
                                Cliente:{" "}
                                {
                                    pedido.nome
                                }
                            </p>

                            <p>
                                Produto:{" "}
                                {
                                    pedido.produto
                                }
                            </p>

                            <p>
                                Quantidade:{" "}
                                {
                                    quantidadeAtual
                                }{" "}
                                {quantidadeAtual ===
                                    1
                                    ? "pessoa"
                                    : "pessoas"}
                            </p>

                            <p>
                                Código:{" "}
                                {
                                    pedido.codigoIngresso
                                }
                            </p>

                            <p>
                                Data da visita:{" "}
                                {formatarData(
                                    pedido.dataVisita
                                )}
                            </p>

                            <p>
                                Pagamento:{" "}
                                {pedido.statusPagamento ===
                                    "pago"
                                    ? "Confirmado"
                                    : pedido.statusPagamento}
                            </p>

                            <div className="mt-4 rounded-xl bg-black/20 p-3">
                                <p className="font-black">
                                    🚪 Portaria Principal
                                </p>

                                <p>
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

                            <div className="mt-2 rounded-xl bg-black/20 p-3">
                                <p className="font-black">
                                    🌊 Cachoeira Mundo Novo
                                </p>

                                <p>
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
                        </div>
                    )}

                    {/* RESERVA DE AGÊNCIA */}

                    {reservaAgencia && (
                        <div className="mt-6 rounded-2xl bg-white/15 p-4 text-left text-base font-bold">

                            <p className="mb-3 rounded-xl bg-black/20 p-2 text-center font-black">
                                🚌 GRUPO DE AGÊNCIA
                            </p>

                            <p>
                                Agência:{" "}
                                {
                                    reservaAgencia.agenciaNome ||
                                    "-"
                                }
                            </p>

                            <p>
                                Responsável:{" "}
                                {
                                    reservaAgencia.agenciaResponsavel ||
                                    "-"
                                }
                            </p>

                            <p>
                                Código:{" "}
                                {
                                    reservaAgencia.codigoGrupo ||
                                    "-"
                                }
                            </p>

                            <p>
                                Data:{" "}
                                {formatarData(
                                    limpar(
                                        reservaAgencia.dataVisita
                                    )
                                )}
                            </p>

                            <p>
                                Chegada prevista:{" "}
                                {
                                    reservaAgencia.horaPrevista ||
                                    "Não informada"
                                }
                            </p>

                            <p>
                                Veículo:{" "}
                                {
                                    reservaAgencia.tipoVeiculo ||
                                    "-"
                                }
                            </p>

                            <div className="mt-3 rounded-xl bg-black/20 p-3">
                                <p>
                                    👨 Adultos:{" "}
                                    <strong>
                                        {
                                            Number(
                                                reservaAgencia.adultos ||
                                                0
                                            )
                                        }
                                    </strong>
                                </p>

                                <p>
                                    👵 Idosos:{" "}
                                    <strong>
                                        {
                                            Number(
                                                reservaAgencia.idosos ||
                                                0
                                            )
                                        }
                                    </strong>
                                </p>

                                <p className="mt-2 text-xl font-black">
                                    👥 TOTAL:{" "}
                                    {
                                        quantidadeDaReserva(
                                            reservaAgencia
                                        )
                                    }{" "}
                                    PESSOAS
                                </p>
                            </div>

                            <div className="mt-3 rounded-xl bg-black/20 p-3">
                                <p className="font-black">
                                    🚡 Elevador Panorâmico
                                </p>

                                <p>
                                    {reservaAgencia.elevador
                                        ? `Sim - ${Number(
                                            reservaAgencia.qtdElevador ||
                                            0
                                        )} pessoa(s)`
                                        : "Não"}
                                </p>
                            </div>

                            <div className="mt-3 rounded-xl bg-black/20 p-3">
                                <p>
                                    Valor:{" "}
                                    <strong>
                                        {formatarMoeda(
                                            Number(
                                                reservaAgencia.valorFinal ||
                                                0
                                            )
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    Pagamento:{" "}
                                    <strong>
                                        {reservaAgencia.statusPagamento ===
                                            "pago"
                                            ? "✅ PAGO"
                                            : reservaAgencia.statusPagamento ===
                                                "a_pagar_na_chegada"
                                                ? "💰 A PAGAR NA CHEGADA"
                                                : limpar(
                                                    reservaAgencia.statusPagamento
                                                )}
                                    </strong>
                                </p>
                            </div>

                            <div className="mt-3 rounded-xl bg-black/20 p-3">
                                <p className="font-black">
                                    🚪 Portaria Principal
                                </p>

                                <p>
                                    {reservaAgencia.statusOperacional ===
                                        "utilizado"
                                        ? `✅ Grupo validado${reservaAgencia.utilizadoEm
                                            ? ` em ${formatarDataHora(
                                                limpar(
                                                    reservaAgencia.utilizadoEm
                                                )
                                            )}`
                                            : ""
                                        }`
                                        : "⏳ Grupo ainda não entrou"}
                                </p>

                                {reservaAgencia.validadoPor && (
                                    <p>
                                        Por:{" "}
                                        {
                                            limpar(
                                                reservaAgencia.validadoPor
                                            )
                                        }
                                    </p>
                                )}
                            </div>

                            <div className="mt-2 rounded-xl bg-black/20 p-3">
                                <p className="font-black">
                                    🌊 Cachoeira Mundo Novo
                                </p>

                                <p>
                                    {reservaAgencia.cachoeiraMundoNovoValidado
                                        ? `✅ Grupo validado${reservaAgencia.cachoeiraMundoNovoValidadoEm
                                            ? ` em ${formatarDataHora(
                                                limpar(
                                                    reservaAgencia.cachoeiraMundoNovoValidadoEm
                                                )
                                            )}`
                                            : ""
                                        }`
                                        : "⏳ Ainda não validada"}
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* QR / BUSCA */}

                <section className="mt-5 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-xl">

                    {!cameraAtiva ? (
                        <button
                            onClick={
                                iniciarCamera
                            }
                            disabled={
                                carregando ||
                                !localValidacao
                            }
                            className="w-full rounded-2xl bg-green-700 px-5 py-6 text-2xl font-black text-white disabled:bg-slate-400"
                        >
                            📷 ESCANEAR QR CODE
                        </button>
                    ) : (
                        <button
                            onClick={
                                pararCamera
                            }
                            className="w-full rounded-2xl bg-red-600 px-5 py-5 text-xl font-black text-white"
                        >
                            FECHAR CÂMERA
                        </button>
                    )}

                    {cameraAtiva && (
                        <div className="mt-4 overflow-hidden rounded-2xl bg-black p-2">
                            <div
                                id="leitor-portaria"
                                className="w-full"
                            />
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <input
                            type="text"
                            value={
                                codigoManual
                            }
                            onChange={(
                                event
                            ) =>
                                setCodigoManual(
                                    event.target.value
                                        .toUpperCase()
                                )
                            }
                            placeholder="Código PMN ou GRP"
                            disabled={
                                !localValidacao
                            }
                            className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-lg font-bold uppercase disabled:bg-slate-200"
                        />

                        <button
                            onClick={() => {
                                if (
                                    !localValidacao
                                ) {
                                    setMensagem(
                                        "SELECIONE O LOCAL"
                                    );

                                    return;
                                }

                                if (
                                    !codigoManual.trim()
                                ) {
                                    setMensagem(
                                        "DIGITE O CÓDIGO"
                                    );

                                    vibrar(
                                        "erro"
                                    );

                                    return;
                                }

                                buscarIngresso(
                                    codigoManual.trim()
                                );
                            }}
                            disabled={
                                carregando ||
                                !localValidacao
                            }
                            className="rounded-2xl bg-blue-600 px-5 py-4 font-black text-white disabled:bg-slate-400"
                        >
                            BUSCAR
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setPedido(
                                null
                            );

                            setReservaAgencia(
                                null
                            );

                            setCodigoManual(
                                ""
                            );

                            setMensagem(
                                localValidacao
                                    ? `${nomeLocal()} - Aguardando ingresso ou grupo`
                                    : "Selecione o local de validação"
                            );
                        }}
                        className="mt-4 w-full rounded-2xl border border-slate-300 px-5 py-4 font-bold text-slate-700"
                    >
                        LIMPAR
                    </button>
                </section>

                {/* CONFIRMAR */}

                {valido && (
                    <button
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
                                : `🌊 CONFIRMAR ACESSO DE ${textoPessoas(
                                    quantidadeAtual
                                )}`}
                    </button>
                )}

                {!valido &&
                    itemAtualExiste && (
                        <button
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