"use client";

import {
    atualizarPedido,
    listarPedidosAtivosPortaria,
    Pedido,
} from "@/lib/pedidos";

import {
    listarPedidosLocalmente,
    listarReservasAgenciasLocalmente,
    obterPendentes,
    registrarValidacaoOffline,
    registrarValidacaoReservaOffline,
    ReservaAgenciaCache,
    salvarPedidosLocalmente,
    salvarReservasAgenciasLocalmente,
    sincronizarPendentes,
} from "@/lib/portariaDb";

import { db } from "@/lib/firebase";

import {
    collection,
    doc,
    getDocs,
    updateDoc,
} from "firebase/firestore";

import { Html5Qrcode } from "html5-qrcode";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

/* ==========================================
   FUNCIONÁRIOS
========================================== */

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

/* ==========================================
   TIPOS
========================================== */

type ResultadoElevador = {
    valido: boolean;
    mensagem: string;
    quantidadeComprada: number;
    quantidadeJaUtilizada: number;
    saldo: number;
};

type EntidadeElevador =
    | {
        tipo: "pedido";
        pedido: Pedido;
        resultadoElevador: ResultadoElevador;
    }
    | {
        tipo: "reserva_agencia";
        reserva: ReservaAgenciaCache;
        resultadoElevador: ResultadoElevador;
    };

type QrExtraido = {
    codigo: string;
    pedidoId: string;
    codigoGrupo: string;
    tipo:
    | "pedido"
    | "reserva_agencia"
    | "desconhecido";
};

/* ==========================================
   FUNÇÕES AUXILIARES
========================================== */

function limpar(valor: unknown) {
    return String(valor || "").trim();
}

function normalizarCodigo(valor: unknown) {
    return limpar(valor).toUpperCase();
}

function numeroSeguro(valor: unknown) {
    const numero = Number(valor || 0);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

function campoPedido(
    pedido: Pedido,
    campo: string
) {
    return (
        pedido as unknown as
        Record<string, unknown>
    )[campo];
}

function formatarData(valor?: string) {
    if (!valor) {
        return "Não informada";
    }

    const partes = valor.split("-");

    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return valor;
}

function formatarDataHora(valor?: string) {
    if (!valor) {
        return "-";
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return valor;
    }

    return data.toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

/* ==========================================
   INGRESSO TEM DIREITO AO ELEVADOR?
========================================== */

function pedidoTemElevador(
    pedido: Pedido
) {
    const tipo =
        normalizarCodigo(
            pedido.tipo
        );

    const produto =
        normalizarCodigo(
            pedido.produto
        );

    if (tipo === "ELEVADOR") {
        return true;
    }

    if (
        produto.includes(
            "ELEVADOR"
        )
    ) {
        return true;
    }

    if (
        campoPedido(
            pedido,
            "elevador"
        ) === true
    ) {
        return true;
    }

    if (
        numeroSeguro(
            campoPedido(
                pedido,
                "qtdElevador"
            )
        ) > 0
    ) {
        return true;
    }

    return false;
}

/* ==========================================
   É INGRESSO DE ACESSO AO PARQUE?
   USADO SOMENTE PARA COMPATIBILIDADE
   COM O SISTEMA ANTIGO
========================================== */

function pedidoEhAcessoPrincipal(
    pedido: Pedido
) {
    const tipo =
        normalizarCodigo(
            pedido.tipo
        );

    const produto =
        normalizarCodigo(
            pedido.produto
        );

    if (tipo === "ELEVADOR") {
        return false;
    }

    if (
        tipo === "INGRESSO" ||
        tipo === "PARQUE" ||
        tipo === "IDOSO" ||
        tipo === "CAMPING"
    ) {
        return true;
    }

    if (
        produto.includes(
            "INGRESSO PARQUE"
        )
    ) {
        return true;
    }

    if (
        produto.includes(
            "MEIA ENTRADA IDOSO"
        )
    ) {
        return true;
    }

    if (
        produto.includes(
            "CAMPING"
        )
    ) {
        return true;
    }

    return false;
}

/* ==========================================
   QUANTIDADE COMPRADA DO ELEVADOR
========================================== */

function quantidadeElevadorPedido(
    pedido: Pedido
) {
    const quantidadeEspecifica =
        numeroSeguro(
            campoPedido(
                pedido,
                "qtdElevador"
            )
        );

    if (
        quantidadeEspecifica > 0
    ) {
        return quantidadeEspecifica;
    }

    const quantidade =
        numeroSeguro(
            pedido.quantidade
        );

    if (quantidade > 0) {
        return quantidade;
    }

    return 1;
}

/* ==========================================
   RESERVA TEM ELEVADOR?
========================================== */

function reservaTemElevador(
    reserva: ReservaAgenciaCache
) {
    return (
        reserva.elevador === true &&
        numeroSeguro(
            reserva.qtdElevador
        ) > 0
    );
}

/* ==========================================
   COMPATIBILIDADE COM SISTEMA ANTIGO
========================================== */

/*
 * Antes da criação do aplicativo separado,
 * o aparelho do elevador utilizava o mesmo
 * sistema da portaria.
 *
 * Ingressos antigos EXCLUSIVOS do Elevador
 * podem possuir:
 *
 * statusOperacional = "utilizado"
 *
 * sem elevadorValidado = true.
 *
 * Esses ingressos devem continuar bloqueados.
 *
 * IMPORTANTE:
 *
 * Se o pedido também for ingresso de acesso
 * ao Parque, statusOperacional = "utilizado"
 * representa somente a Portaria Principal.
 *
 * Nesse caso NÃO significa que o elevador
 * já foi utilizado.
 */

function pedidoFoiUtilizadoNoSistemaAntigo(
    pedido: Pedido
) {
    if (
        !pedidoTemElevador(
            pedido
        )
    ) {
        return false;
    }

    if (
        campoPedido(
            pedido,
            "elevadorValidado"
        ) === true
    ) {
        return false;
    }

    if (
        pedidoEhAcessoPrincipal(
            pedido
        )
    ) {
        return false;
    }

    return (
        normalizarCodigo(
            pedido.statusOperacional
        ) === "UTILIZADO"
    );
}

/* ==========================================
   QUANTIDADE JÁ UTILIZADA NO ELEVADOR
========================================== */

function quantidadeElevadorJaUtilizadaPedido(
    pedido: Pedido
) {
    const quantidadeComprada =
        quantidadeElevadorPedido(
            pedido
        );

    /*
     * Primeiro usa a quantidade
     * registrada pelo novo validador.
     */

    const quantidadeRegistrada =
        numeroSeguro(
            campoPedido(
                pedido,
                "elevadorQuantidadeValidada"
            )
        );

    if (
        quantidadeRegistrada > 0
    ) {
        return Math.min(
            quantidadeComprada,
            quantidadeRegistrada
        );
    }

    /*
     * Ingresso antigo exclusivo
     * do elevador já utilizado.
     */

    if (
        pedidoFoiUtilizadoNoSistemaAntigo(
            pedido
        )
    ) {
        return quantidadeComprada;
    }

    /*
     * Compatibilidade com registros
     * que possuem apenas o booleano.
     */

    if (
        campoPedido(
            pedido,
            "elevadorValidado"
        ) === true
    ) {
        return quantidadeComprada;
    }

    return 0;
}

/* ==========================================
   SALDO DO ELEVADOR - PEDIDO
========================================== */

/*
 * REGRA DO ELEVADOR:
 *
 * quantidade comprada
 * -
 * quantidade já utilizada
 * =
 * saldo disponível
 *
 * A PORTARIA PRINCIPAL NÃO PARTICIPA
 * MAIS DESTA VALIDAÇÃO.
 */

function verificarSaldoElevadorPedido(
    pedido: Pedido
): ResultadoElevador {
    const quantidadeComprada =
        quantidadeElevadorPedido(
            pedido
        );

    if (
        !pedidoTemElevador(
            pedido
        )
    ) {
        return {
            valido: false,
            mensagem:
                "ESTE INGRESSO NÃO POSSUI ELEVADOR",
            quantidadeComprada: 0,
            quantidadeJaUtilizada: 0,
            saldo: 0,
        };
    }

    const quantidadeJaUtilizada =
        quantidadeElevadorJaUtilizadaPedido(
            pedido
        );

    const saldo =
        Math.max(
            0,
            quantidadeComprada -
            quantidadeJaUtilizada
        );

    if (saldo <= 0) {
        return {
            valido: false,
            mensagem:
                "ELEVADOR JÁ UTILIZADO — NÃO LIBERAR",
            quantidadeComprada,
            quantidadeJaUtilizada,
            saldo,
        };
    }

    return {
        valido: true,
        mensagem:
            `SALDO DISPONÍVEL NO ELEVADOR: ${saldo} PESSOA(S)`,
        quantidadeComprada,
        quantidadeJaUtilizada,
        saldo,
    };
}

/* ==========================================
   QUANTIDADE JÁ UTILIZADA - RESERVA
========================================== */

function quantidadeElevadorJaUtilizadaReserva(
    reserva: ReservaAgenciaCache
) {
    const quantidadeComprada =
        numeroSeguro(
            reserva.qtdElevador
        );

    const quantidadeRegistrada =
        numeroSeguro(
            reserva.elevadorQuantidadeValidada
        );

    if (
        quantidadeRegistrada > 0
    ) {
        return Math.min(
            quantidadeComprada,
            quantidadeRegistrada
        );
    }

    if (
        reserva.elevadorValidado ===
        true
    ) {
        return quantidadeComprada;
    }

    return 0;
}

/* ==========================================
   SALDO DO ELEVADOR - RESERVA
========================================== */

function verificarSaldoElevadorReserva(
    reserva: ReservaAgenciaCache
): ResultadoElevador {
    if (
        !reservaTemElevador(
            reserva
        )
    ) {
        return {
            valido: false,
            mensagem:
                "ESTA RESERVA NÃO POSSUI ELEVADOR",
            quantidadeComprada: 0,
            quantidadeJaUtilizada: 0,
            saldo: 0,
        };
    }

    const quantidadeComprada =
        numeroSeguro(
            reserva.qtdElevador
        );

    const quantidadeJaUtilizada =
        quantidadeElevadorJaUtilizadaReserva(
            reserva
        );

    const saldo =
        Math.max(
            0,
            quantidadeComprada -
            quantidadeJaUtilizada
        );

    if (saldo <= 0) {
        return {
            valido: false,
            mensagem:
                "ELEVADOR JÁ UTILIZADO — NÃO LIBERAR",
            quantidadeComprada,
            quantidadeJaUtilizada,
            saldo,
        };
    }

    return {
        valido: true,
        mensagem:
            `SALDO DISPONÍVEL NO ELEVADOR: ${saldo} PESSOA(S)`,
        quantidadeComprada,
        quantidadeJaUtilizada,
        saldo,
    };
}

/* ==========================================
   EXTRAIR QR
========================================== */

function extrairQr(
    texto: string
): QrExtraido {
    const valor =
        limpar(texto);

    if (!valor) {
        return {
            codigo: "",
            pedidoId: "",
            codigoGrupo: "",
            tipo: "desconhecido",
        };
    }

    try {
        const dados =
            JSON.parse(valor);

        const codigoGrupo =
            normalizarCodigo(
                dados?.codigoGrupo ||
                ""
            );

        if (
            dados?.tipo ===
            "reserva_agencia" ||
            codigoGrupo.startsWith(
                "GRP-"
            )
        ) {
            return {
                codigo: "",
                pedidoId: "",
                codigoGrupo,
                tipo:
                    "reserva_agencia",
            };
        }

        const codigo =
            normalizarCodigo(
                dados?.codigo ||
                dados?.codigoIngresso ||
                ""
            );

        const pedidoId =
            limpar(
                dados?.pedidoId ||
                dados?.id ||
                ""
            );

        return {
            codigo,
            pedidoId,
            codigoGrupo: "",
            tipo: "pedido",
        };
    } catch {
        const codigo =
            normalizarCodigo(
                valor
            );

        if (
            codigo.startsWith(
                "GRP-"
            )
        ) {
            return {
                codigo: "",
                pedidoId: "",
                codigoGrupo:
                    codigo,
                tipo:
                    "reserva_agencia",
            };
        }

        return {
            codigo,
            pedidoId: "",
            codigoGrupo: "",
            tipo:
                codigo.startsWith(
                    "PMN-"
                )
                    ? "pedido"
                    : "desconhecido",
        };
    }
}

/* ==========================================
   COMPONENTE
========================================== */

export default function ElevadorValidacaoPage() {
    const [
        entidade,
        setEntidade,
    ] =
        useState<
            EntidadeElevador |
            null
        >(null);

    const [
        mensagem,
        setMensagem,
    ] =
        useState(
            "Aguardando leitura do ingresso do elevador"
        );

    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        cameraAtiva,
        setCameraAtiva,
    ] =
        useState(false);

    const [
        codigoManual,
        setCodigoManual,
    ] =
        useState("");

    const [
        funcionario,
        setFuncionario,
    ] =
        useState("");

    const [
        isOnline,
        setIsOnline,
    ] =
        useState(true);

    const [
        sincronizando,
        setSincronizando,
    ] =
        useState(false);

    const [
        pendentesCount,
        setPendentesCount,
    ] =
        useState(0);

    const [
        pedidosCache,
        setPedidosCache,
    ] =
        useState<Pedido[]>([]);

    const [
        reservasCache,
        setReservasCache,
    ] =
        useState<
            ReservaAgenciaCache[]
        >([]);

    const [
        pessoasHoje,
        setPessoasHoje,
    ] =
        useState(0);

    const leitorRef =
        useRef<
            Html5Qrcode |
            null
        >(null);

    const leituraEmAndamentoRef =
        useRef(false);

    /* ======================================
       INICIALIZAÇÃO
    ====================================== */

    useEffect(
        () => {
            if (
                typeof window ===
                "undefined"
            ) {
                return;
            }

            setIsOnline(
                navigator.onLine
            );

            function ficouOnline() {
                setIsOnline(true);

                void sincronizarTudo();
            }

            function ficouOffline() {
                setIsOnline(false);
            }

            window.addEventListener(
                "online",
                ficouOnline
            );

            window.addEventListener(
                "offline",
                ficouOffline
            );

            void carregarDados();

            return () => {
                window.removeEventListener(
                    "online",
                    ficouOnline
                );

                window.removeEventListener(
                    "offline",
                    ficouOffline
                );

                void pararCamera();
            };
        },
        []
    );

    useEffect(
        () => {
            void atualizarPendencias();
        },
        [
            entidade,
        ]
    );

    /* ======================================
       FIRESTORE - RESERVAS
    ====================================== */

    async function carregarReservasOnline() {
        const snap =
            await getDocs(
                collection(
                    db,
                    "reservas_agencias"
                )
            );

        return snap.docs.map(
            (item) => ({
                id:
                    item.id,
                ...item.data(),
            })
        ) as
            ReservaAgenciaCache[];
    }

    /* ======================================
       FIRESTORE - PEDIDOS
    ====================================== */

    async function carregarPedidosOnline() {
        return await listarPedidosAtivosPortaria();
    }

    /* ======================================
       CARREGAR DADOS
    ====================================== */

    async function carregarDados() {
        const online =
            typeof navigator !==
            "undefined" &&
            navigator.onLine;

        if (online) {
            try {
                const [
                    pedidos,
                    reservas,
                ] =
                    await Promise.all([
                        carregarPedidosOnline(),
                        carregarReservasOnline(),
                    ]);

                setPedidosCache(
                    pedidos
                );

                setReservasCache(
                    reservas
                );

                await Promise.all([
                    salvarPedidosLocalmente(
                        pedidos
                    ),
                    salvarReservasAgenciasLocalmente(
                        reservas
                    ),
                ]);

                calcularContadorHoje(
                    pedidos,
                    reservas
                );

                return;
            } catch (error) {
                console.error(
                    "ELEVADOR: erro ao carregar dados online:",
                    error
                );
            }
        }

        try {
            const [
                pedidosLocais,
                reservasLocais,
            ] =
                await Promise.all([
                    listarPedidosLocalmente(),
                    listarReservasAgenciasLocalmente(),
                ]);

            setPedidosCache(
                pedidosLocais
            );

            setReservasCache(
                reservasLocais
            );

            calcularContadorHoje(
                pedidosLocais,
                reservasLocais
            );
        } catch (error) {
            console.error(
                "ELEVADOR: erro ao carregar cache:",
                error
            );
        }
    }

    /* ======================================
       PEDIDOS PARA BUSCA
    ====================================== */

    async function obterPedidosParaBusca() {
        const online =
            typeof navigator !==
            "undefined" &&
            navigator.onLine;

        if (online) {
            try {
                const pedidos =
                    await carregarPedidosOnline();

                setPedidosCache(
                    pedidos
                );

                try {
                    await salvarPedidosLocalmente(
                        pedidos
                    );
                } catch (error) {
                    console.error(
                        "Erro cache pedidos:",
                        error
                    );
                }

                return pedidos;
            } catch (error) {
                console.error(
                    "Erro Firestore pedidos:",
                    error
                );
            }
        }

        try {
            const pedidos =
                await listarPedidosLocalmente();

            setPedidosCache(
                pedidos
            );

            return pedidos;
        } catch {
            return pedidosCache;
        }
    }

    /* ======================================
       RESERVAS PARA BUSCA
    ====================================== */

    async function obterReservasParaBusca() {
        const online =
            typeof navigator !==
            "undefined" &&
            navigator.onLine;

        if (online) {
            try {
                const reservas =
                    await carregarReservasOnline();

                setReservasCache(
                    reservas
                );

                try {
                    await salvarReservasAgenciasLocalmente(
                        reservas
                    );
                } catch (error) {
                    console.error(
                        "Erro cache reservas:",
                        error
                    );
                }

                return reservas;
            } catch (error) {
                console.error(
                    "Erro Firestore reservas:",
                    error
                );
            }
        }

        try {
            const reservas =
                await listarReservasAgenciasLocalmente();

            setReservasCache(
                reservas
            );

            return reservas;
        } catch {
            return reservasCache;
        }
    }

    /* ======================================
       CONTADOR DO DIA
    ====================================== */

    function calcularContadorHoje(
        pedidos: Pedido[],
        reservas:
            ReservaAgenciaCache[]
    ) {
        const hoje =
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                );

        let total = 0;

        pedidos.forEach(
            (pedido) => {
                if (
                    campoPedido(
                        pedido,
                        "elevadorValidado"
                    ) === true &&
                    String(
                        campoPedido(
                            pedido,
                            "elevadorValidadoEm"
                        ) ||
                        ""
                    ).startsWith(
                        hoje
                    )
                ) {
                    total +=
                        numeroSeguro(
                            campoPedido(
                                pedido,
                                "elevadorQuantidadeValidada"
                            )
                        ) ||
                        quantidadeElevadorPedido(
                            pedido
                        );
                }
            }
        );

        reservas.forEach(
            (reserva) => {
                if (
                    reserva.elevadorValidado ===
                    true &&
                    String(
                        reserva.elevadorValidadoEm ||
                        ""
                    ).startsWith(
                        hoje
                    )
                ) {
                    total +=
                        numeroSeguro(
                            reserva.elevadorQuantidadeValidada
                        ) ||
                        numeroSeguro(
                            reserva.qtdElevador
                        );
                }
            }
        );

        setPessoasHoje(
            total
        );
    }

    /* ======================================
       PENDÊNCIAS OFFLINE
    ====================================== */

    async function atualizarPendencias() {
        try {
            const itens =
                await obterPendentes();

            const elevador =
                itens.filter(
                    (item) =>
                        item.local ===
                        "elevador"
                );

            setPendentesCount(
                elevador.length
            );
        } catch (error) {
            console.error(
                "Erro pendências:",
                error
            );
        }
    }

    /* ======================================
       SINCRONIZAÇÃO
    ====================================== */

    async function sincronizarTudo() {
        if (sincronizando) {
            return;
        }

        try {
            setSincronizando(
                true
            );

            const quantidade =
                await sincronizarPendentes();

            await carregarDados();

            await atualizarPendencias();

            if (
                quantidade > 0
            ) {
                setMensagem(
                    `${quantidade} validação(ões) sincronizada(s)`
                );
            }
        } catch (error) {
            console.error(
                "Erro sincronização:",
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
            | "sucesso"
            | "erro"
    ) {
        if (
            typeof navigator ===
            "undefined" ||
            !navigator.vibrate
        ) {
            return;
        }

        if (
            tipo === "sucesso"
        ) {
            navigator.vibrate(
                [
                    120,
                    70,
                    120,
                ]
            );
        } else {
            navigator.vibrate(
                [
                    220,
                    120,
                    220,
                ]
            );
        }
    }

    /* ======================================
       PEDIDO ENCONTRADO
    ====================================== */

    function validarPedidoEncontrado(
        pedido: Pedido
    ) {
        const resultadoElevador =
            verificarSaldoElevadorPedido(
                pedido
            );

        setEntidade({
            tipo: "pedido",
            pedido,
            resultadoElevador,
        });

        setCodigoManual(
            pedido.codigoIngresso ||
            ""
        );

        /* PAGAMENTO */

        if (
            pedido.statusPagamento !==
            "pago"
        ) {
            setMensagem(
                "PAGAMENTO NÃO CONFIRMADO — NÃO LIBERAR"
            );

            vibrar("erro");

            return;
        }

        /* PRODUTO */

        if (
            !pedidoTemElevador(
                pedido
            )
        ) {
            setMensagem(
                "ESTE INGRESSO NÃO É DO ELEVADOR"
            );

            vibrar("erro");

            return;
        }

        /* SALDO DO ELEVADOR */

        if (
            !resultadoElevador.valido
        ) {
            if (
                campoPedido(
                    pedido,
                    "elevadorValidado"
                ) === true
            ) {
                setMensagem(
                    `ELEVADOR JÁ UTILIZADO EM ${formatarDataHora(
                        limpar(
                            campoPedido(
                                pedido,
                                "elevadorValidadoEm"
                            )
                        )
                    )}`
                );
            } else if (
                pedidoFoiUtilizadoNoSistemaAntigo(
                    pedido
                )
            ) {
                setMensagem(
                    "INGRESSO JÁ UTILIZADO NO SISTEMA ANTERIOR"
                );
            } else {
                setMensagem(
                    resultadoElevador.mensagem
                );
            }

            vibrar("erro");

            return;
        }

        /* LIBERADO */

        setMensagem(
            `INGRESSO VÁLIDO — LIBERAR ${resultadoElevador.saldo} PESSOA(S)`
        );

        vibrar("sucesso");
    }

    /* ======================================
       RESERVA ENCONTRADA
    ====================================== */

    function validarReservaEncontrada(
        reserva:
            ReservaAgenciaCache
    ) {
        const resultadoElevador =
            verificarSaldoElevadorReserva(
                reserva
            );

        setEntidade({
            tipo:
                "reserva_agencia",
            reserva,
            resultadoElevador,
        });

        setCodigoManual(
            reserva.codigoGrupo ||
            ""
        );

        if (
            reserva.statusPagamento !==
            "pago"
        ) {
            setMensagem(
                "PAGAMENTO PENDENTE — NÃO LIBERAR"
            );

            vibrar("erro");

            return;
        }

        if (
            !reservaTemElevador(
                reserva
            )
        ) {
            setMensagem(
                "ESTA RESERVA NÃO POSSUI ELEVADOR"
            );

            vibrar("erro");

            return;
        }

        if (
            !resultadoElevador.valido
        ) {
            if (
                reserva.elevadorValidado ===
                true
            ) {
                setMensagem(
                    `ELEVADOR JÁ UTILIZADO EM ${formatarDataHora(
                        reserva.elevadorValidadoEm
                    )}`
                );
            } else {
                setMensagem(
                    resultadoElevador.mensagem
                );
            }

            vibrar("erro");

            return;
        }

        setMensagem(
            `RESERVA VÁLIDA — LIBERAR ${resultadoElevador.saldo} PESSOA(S)`
        );

        vibrar("sucesso");
    }

    /* ======================================
       BUSCAR QR / CÓDIGO
    ====================================== */

    async function buscarCodigo(
        textoQr: string
    ) {
        if (
            carregando ||
            leituraEmAndamentoRef.current
        ) {
            return;
        }

        const dadosQr =
            extrairQr(
                textoQr
            );

        if (
            !dadosQr.codigo &&
            !dadosQr.pedidoId &&
            !dadosQr.codigoGrupo
        ) {
            setMensagem(
                "CÓDIGO INVÁLIDO"
            );

            vibrar("erro");

            return;
        }

        leituraEmAndamentoRef.current =
            true;

        try {
            setCarregando(
                true
            );

            setEntidade(null);

            await pararCamera();

            /* ==================================
               RESERVA
            ================================== */

            if (
                dadosQr.tipo ===
                "reserva_agencia" ||
                dadosQr.codigoGrupo
            ) {
                const reservas =
                    await obterReservasParaBusca();

                const codigoGrupo =
                    normalizarCodigo(
                        dadosQr.codigoGrupo
                    );

                const encontrada =
                    reservas.find(
                        (item) =>
                            normalizarCodigo(
                                item.codigoGrupo
                            ) ===
                            codigoGrupo
                    );

                if (!encontrada) {
                    setMensagem(
                        "RESERVA NÃO ENCONTRADA"
                    );

                    vibrar("erro");

                    return;
                }

                validarReservaEncontrada(
                    encontrada
                );

                return;
            }

            /* ==================================
               PEDIDO
            ================================== */

            const pedidos =
                await obterPedidosParaBusca();

            const codigoQr =
                normalizarCodigo(
                    dadosQr.codigo
                );

            const pedidoIdQr =
                limpar(
                    dadosQr.pedidoId
                );

            const textoOriginal =
                limpar(
                    textoQr
                );

            const encontrado =
                pedidos.find(
                    (item) => {
                        const codigoIngresso =
                            normalizarCodigo(
                                item.codigoIngresso
                            );

                        const qrCodeIngresso =
                            limpar(
                                item.qrCodeIngresso
                            );

                        const qrNormalizado =
                            normalizarCodigo(
                                item.qrCodeIngresso
                            );

                        const id =
                            limpar(
                                item.id
                            );

                        if (
                            codigoQr &&
                            codigoIngresso ===
                            codigoQr
                        ) {
                            return true;
                        }

                        if (
                            pedidoIdQr &&
                            id ===
                            pedidoIdQr
                        ) {
                            return true;
                        }

                        if (
                            codigoQr &&
                            normalizarCodigo(
                                id
                            ) ===
                            codigoQr
                        ) {
                            return true;
                        }

                        if (
                            codigoQr &&
                            qrNormalizado &&
                            qrNormalizado ===
                            codigoQr
                        ) {
                            return true;
                        }

                        if (
                            qrCodeIngresso &&
                            textoOriginal &&
                            qrCodeIngresso ===
                            textoOriginal
                        ) {
                            return true;
                        }

                        return false;
                    }
                );

            if (!encontrado) {
                setMensagem(
                    "INGRESSO NÃO ENCONTRADO"
                );

                vibrar("erro");

                return;
            }

            validarPedidoEncontrado(
                encontrado
            );
        } catch (error) {
            console.error(
                "Erro ao consultar ingresso:",
                error
            );

            setMensagem(
                "ERRO AO CONSULTAR INGRESSO"
            );

            vibrar("erro");
        } finally {
            setCarregando(
                false
            );

            setTimeout(
                () => {
                    leituraEmAndamentoRef.current =
                        false;
                },
                600
            );
        }
    }

    /* ======================================
       CÂMERA
    ====================================== */

    async function iniciarCamera() {
        if (!funcionario) {
            setMensagem(
                "SELECIONE O FUNCIONÁRIO PRIMEIRO"
            );

            vibrar("erro");

            return;
        }

        setEntidade(null);

        setMensagem(
            "Aponte a câmera para o QR Code"
        );

        setCameraAtiva(true);

        setTimeout(
            async () => {
                try {
                    const leitor =
                        new Html5Qrcode(
                            "leitor-elevador"
                        );

                    leitorRef.current =
                        leitor;

                    await leitor.start(
                        {
                            facingMode:
                                "environment",
                        },

                        {
                            fps: 10,

                            qrbox: {
                                width: 280,
                                height: 280,
                            },
                        },

                        async (texto) => {
                            if (texto) {
                                await buscarCodigo(
                                    texto
                                );
                            }
                        },

                        () => { }
                    );
                } catch (error) {
                    console.error(
                        "Erro câmera:",
                        error
                    );

                    setCameraAtiva(
                        false
                    );

                    setMensagem(
                        "NÃO FOI POSSÍVEL ACESSAR A CÂMERA"
                    );

                    vibrar("erro");
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
                try {
                    await leitorRef.current.stop();
                } catch { }

                try {
                    await leitorRef.current.clear();
                } catch { }

                leitorRef.current =
                    null;
            }
        } finally {
            setCameraAtiva(false);
        }
    }

    /* ======================================
       PERMISSÃO DE VALIDAÇÃO
    ====================================== */

    const podeConfirmar =
        useMemo(
            () => {
                if (
                    !entidade ||
                    !funcionario
                ) {
                    return false;
                }

                if (
                    entidade.tipo ===
                    "pedido"
                ) {
                    return (
                        entidade.pedido
                            .statusPagamento ===
                        "pago" &&
                        pedidoTemElevador(
                            entidade.pedido
                        ) &&
                        entidade
                            .resultadoElevador
                            .valido &&
                        entidade
                            .resultadoElevador
                            .saldo > 0
                    );
                }

                return (
                    entidade.reserva
                        .statusPagamento ===
                    "pago" &&
                    reservaTemElevador(
                        entidade.reserva
                    ) &&
                    entidade
                        .resultadoElevador
                        .valido &&
                    entidade
                        .resultadoElevador
                        .saldo > 0
                );
            },
            [
                entidade,
                funcionario,
            ]
        );

    /* ======================================
       CONFIRMAR USO
    ====================================== */

    async function confirmarUsoElevador() {
        if (
            !entidade ||
            !funcionario ||
            !podeConfirmar
        ) {
            setMensagem(
                "VALIDAÇÃO NÃO PERMITIDA"
            );

            vibrar("erro");

            return;
        }

        const agora =
            new Date()
                .toISOString();

        try {
            setCarregando(true);

            /* ==================================
               INGRESSO NORMAL
            ================================== */

            if (
                entidade.tipo ===
                "pedido"
            ) {
                /*
                 * Antes de gravar, consulta
                 * novamente o pedido.
                 *
                 * A segunda conferência agora
                 * verifica SOMENTE:
                 *
                 * - pagamento
                 * - direito ao elevador
                 * - saldo disponível
                 *
                 * Não existe mais dependência
                 * da Portaria Principal.
                 */

                const pedidosAtuais =
                    await obterPedidosParaBusca();

                const pedidoAtual =
                    pedidosAtuais.find(
                        (item) =>
                            item.id ===
                            entidade.pedido.id
                    ) ||
                    entidade.pedido;

                if (
                    pedidoAtual.statusPagamento !==
                    "pago"
                ) {
                    const resultadoElevador =
                        verificarSaldoElevadorPedido(
                            pedidoAtual
                        );

                    setEntidade({
                        tipo:
                            "pedido",
                        pedido:
                            pedidoAtual,
                        resultadoElevador,
                    });

                    setMensagem(
                        "PAGAMENTO NÃO CONFIRMADO — NÃO LIBERAR"
                    );

                    vibrar("erro");

                    return;
                }

                if (
                    !pedidoTemElevador(
                        pedidoAtual
                    )
                ) {
                    const resultadoElevador =
                        verificarSaldoElevadorPedido(
                            pedidoAtual
                        );

                    setEntidade({
                        tipo:
                            "pedido",
                        pedido:
                            pedidoAtual,
                        resultadoElevador,
                    });

                    setMensagem(
                        "ESTE INGRESSO NÃO É DO ELEVADOR"
                    );

                    vibrar("erro");

                    return;
                }

                const resultadoElevador =
                    verificarSaldoElevadorPedido(
                        pedidoAtual
                    );

                if (
                    !resultadoElevador.valido ||
                    resultadoElevador.saldo <= 0
                ) {
                    setEntidade({
                        tipo:
                            "pedido",
                        pedido:
                            pedidoAtual,
                        resultadoElevador,
                    });

                    setMensagem(
                        resultadoElevador.mensagem
                    );

                    vibrar("erro");

                    return;
                }

                /*
                 * Libera somente o saldo
                 * restante do ingresso.
                 */

                const quantidade =
                    resultadoElevador.saldo;

                const totalUtilizado =
                    Math.min(
                        resultadoElevador
                            .quantidadeComprada,
                        resultadoElevador
                            .quantidadeJaUtilizada +
                        quantidade
                    );

                const dados = {
                    elevadorValidado:
                        true,

                    elevadorValidadoPor:
                        funcionario,

                    elevadorValidadoEm:
                        agora,

                    elevadorQuantidadeValidada:
                        totalUtilizado,
                };

                const online =
                    typeof navigator !==
                    "undefined" &&
                    navigator.onLine;

                if (online) {
                    await atualizarPedido(
                        pedidoAtual.id,
                        dados
                    );
                } else {
                    await registrarValidacaoOffline(
                        pedidoAtual.id,
                        "elevador",
                        dados
                    );
                }

                const atualizado =
                    {
                        ...pedidoAtual,
                        ...dados,
                    } as Pedido;

                const resultadoAtualizado =
                    verificarSaldoElevadorPedido(
                        atualizado
                    );

                setEntidade({
                    tipo:
                        "pedido",
                    pedido:
                        atualizado,
                    resultadoElevador:
                        resultadoAtualizado,
                });

                setPedidosCache(
                    (atuais) =>
                        atuais.map(
                            (item) =>
                                item.id ===
                                    atualizado.id
                                    ? atualizado
                                    : item
                        )
                );

                setPessoasHoje(
                    (atual) =>
                        atual +
                        quantidade
                );

                setMensagem(
                    `ELEVADOR VALIDADO — LIBERAR ${quantidade} PESSOA(S)`
                );

                vibrar("sucesso");
            }

            /* ==================================
               RESERVA DE AGÊNCIA
            ================================== */

            if (
                entidade.tipo ===
                "reserva_agencia"
            ) {
                /*
                 * Atualiza a reserva antes
                 * da gravação.
                 *
                 * A reserva também não depende
                 * mais da Portaria Principal.
                 */

                const reservasAtuais =
                    await obterReservasParaBusca();

                const reservaAtual =
                    reservasAtuais.find(
                        (item) =>
                            item.id ===
                            entidade.reserva.id
                    ) ||
                    entidade.reserva;

                if (
                    reservaAtual.statusPagamento !==
                    "pago"
                ) {
                    const resultadoElevador =
                        verificarSaldoElevadorReserva(
                            reservaAtual
                        );

                    setEntidade({
                        tipo:
                            "reserva_agencia",
                        reserva:
                            reservaAtual,
                        resultadoElevador,
                    });

                    setMensagem(
                        "PAGAMENTO PENDENTE — NÃO LIBERAR"
                    );

                    vibrar("erro");

                    return;
                }

                if (
                    !reservaTemElevador(
                        reservaAtual
                    )
                ) {
                    const resultadoElevador =
                        verificarSaldoElevadorReserva(
                            reservaAtual
                        );

                    setEntidade({
                        tipo:
                            "reserva_agencia",
                        reserva:
                            reservaAtual,
                        resultadoElevador,
                    });

                    setMensagem(
                        "ESTA RESERVA NÃO POSSUI ELEVADOR"
                    );

                    vibrar("erro");

                    return;
                }

                const resultadoElevador =
                    verificarSaldoElevadorReserva(
                        reservaAtual
                    );

                if (
                    !resultadoElevador.valido ||
                    resultadoElevador.saldo <= 0
                ) {
                    setEntidade({
                        tipo:
                            "reserva_agencia",
                        reserva:
                            reservaAtual,
                        resultadoElevador,
                    });

                    setMensagem(
                        resultadoElevador.mensagem
                    );

                    vibrar("erro");

                    return;
                }

                const quantidade =
                    resultadoElevador.saldo;

                const totalUtilizado =
                    Math.min(
                        resultadoElevador
                            .quantidadeComprada,
                        resultadoElevador
                            .quantidadeJaUtilizada +
                        quantidade
                    );

                const dados = {
                    elevadorValidado:
                        true,

                    elevadorValidadoPor:
                        funcionario,

                    elevadorValidadoEm:
                        agora,

                    elevadorQuantidadeValidada:
                        totalUtilizado,
                };

                const online =
                    typeof navigator !==
                    "undefined" &&
                    navigator.onLine;

                if (online) {
                    await updateDoc(
                        doc(
                            db,
                            "reservas_agencias",
                            reservaAtual.id
                        ),
                        dados
                    );
                } else {
                    await registrarValidacaoReservaOffline(
                        reservaAtual.id,
                        "elevador",
                        dados
                    );
                }

                const atualizada:
                    ReservaAgenciaCache =
                {
                    ...reservaAtual,
                    ...dados,
                };

                const resultadoAtualizado =
                    verificarSaldoElevadorReserva(
                        atualizada
                    );

                setEntidade({
                    tipo:
                        "reserva_agencia",
                    reserva:
                        atualizada,
                    resultadoElevador:
                        resultadoAtualizado,
                });

                setReservasCache(
                    (atuais) =>
                        atuais.map(
                            (item) =>
                                item.id ===
                                    atualizada.id
                                    ? atualizada
                                    : item
                        )
                );

                setPessoasHoje(
                    (atual) =>
                        atual +
                        quantidade
                );

                setMensagem(
                    `ELEVADOR VALIDADO — LIBERAR ${quantidade} PESSOA(S)`
                );

                vibrar("sucesso");
            }

            await atualizarPendencias();
        } catch (error) {
            console.error(
                "Erro ao validar elevador:",
                error
            );

            setMensagem(
                "ERRO AO REGISTRAR USO DO ELEVADOR"
            );

            vibrar("erro");
        } finally {
            setCarregando(false);
        }
    }

    /* ======================================
       NOVA LEITURA
    ====================================== */

    function novaLeitura() {
        setEntidade(null);

        setCodigoManual("");

        setMensagem(
            "Aguardando leitura do ingresso do elevador"
        );
    }

    /* ======================================
       STATUS VISUAL
    ====================================== */

    const statusVisual =
        useMemo(
            () => {
                if (!entidade) {
                    return {
                        titulo:
                            "AGUARDANDO",

                        classe:
                            "border-slate-300 bg-white/95 text-slate-900",

                        icone:
                            "🚡",
                    };
                }

                /* PEDIDO */

                if (
                    entidade.tipo ===
                    "pedido"
                ) {
                    const pedido =
                        entidade.pedido;

                    if (
                        pedido.statusPagamento !==
                        "pago"
                    ) {
                        return {
                            titulo:
                                "PAGAMENTO PENDENTE",

                            classe:
                                "border-red-500 bg-red-50 text-red-950",

                            icone:
                                "⛔",
                        };
                    }

                    if (
                        !pedidoTemElevador(
                            pedido
                        )
                    ) {
                        return {
                            titulo:
                                "INGRESSO INCORRETO",

                            classe:
                                "border-red-500 bg-red-50 text-red-950",

                            icone:
                                "⛔",
                        };
                    }

                    if (
                        entidade
                            .resultadoElevador
                            .saldo <= 0
                    ) {
                        return {
                            titulo:
                                "JÁ UTILIZADO",

                            classe:
                                "border-amber-500 bg-amber-50 text-amber-950",

                            icone:
                                "⚠️",
                        };
                    }

                    return {
                        titulo:
                            "INGRESSO VÁLIDO",

                        classe:
                            "border-emerald-500 bg-emerald-50 text-emerald-950",

                        icone:
                            "✅",
                    };
                }

                /* RESERVA */

                const reserva =
                    entidade.reserva;

                if (
                    reserva.statusPagamento !==
                    "pago"
                ) {
                    return {
                        titulo:
                            "PAGAMENTO PENDENTE",

                        classe:
                            "border-red-500 bg-red-50 text-red-950",

                        icone:
                            "⛔",
                    };
                }

                if (
                    !reservaTemElevador(
                        reserva
                    )
                ) {
                    return {
                        titulo:
                            "SEM ELEVADOR",

                        classe:
                            "border-red-500 bg-red-50 text-red-950",

                        icone:
                            "⛔",
                    };
                }

                if (
                    entidade
                        .resultadoElevador
                        .saldo <= 0
                ) {
                    return {
                        titulo:
                            "JÁ UTILIZADO",

                        classe:
                            "border-amber-500 bg-amber-50 text-amber-950",

                        icone:
                            "⚠️",
                    };
                }

                return {
                    titulo:
                        "RESERVA VÁLIDA",

                    classe:
                        "border-emerald-500 bg-emerald-50 text-emerald-950",

                    icone:
                        "✅",
                };
            },
            [
                entidade,
            ]
        );

    /* ======================================
       TELA
    ====================================== */

    return (
        <main
            className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-5 text-white"
            style={{
                backgroundImage:
                    "url('/fotos/fundo-geral.jpg')",
            }}
        >
            <div className="absolute inset-0 bg-black/70" />

            <div className="relative z-10 mx-auto max-w-md">

                {/* TÍTULO */}

                <header className="mb-4 text-center">

                    <h1 className="text-3xl font-black">
                        🚡 Elevador Panorâmico
                    </h1>

                    <p className="mt-1 text-sm text-white/75">
                        Validação exclusiva do elevador
                    </p>

                </header>

                {/* CONEXÃO */}

                <section className="mb-4 rounded-2xl bg-slate-950/90 p-4 shadow-xl">

                    <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-2">

                            <span
                                className={`h-3 w-3 rounded-full ${isOnline
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`}
                            />

                            <span className="font-black">
                                {isOnline
                                    ? "ONLINE"
                                    : "OFFLINE"}
                            </span>

                        </div>

                        <button
                            type="button"
                            onClick={
                                sincronizarTudo
                            }
                            disabled={
                                !isOnline ||
                                sincronizando
                            }
                            className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-black disabled:opacity-40"
                        >
                            🔄 SINCRONIZAR
                        </button>

                    </div>

                </section>

                {/* CONTADORES */}

                <div className="mb-4 grid grid-cols-2 gap-3">

                    <div className="rounded-2xl bg-sky-600 p-4 text-center shadow-xl">

                        <p className="text-xs font-black uppercase">
                            Pessoas hoje
                        </p>

                        <p className="text-4xl font-black">
                            {pessoasHoje}
                        </p>

                    </div>

                    <div className="rounded-2xl bg-slate-900 p-4 text-center shadow-xl">

                        <p className="text-xs font-black uppercase">
                            Pendências
                        </p>

                        <p className="text-4xl font-black">
                            {pendentesCount}
                        </p>

                    </div>

                </div>

                {/* FUNCIONÁRIO */}

                <section className="mb-4 rounded-3xl bg-white p-4 text-slate-900 shadow-xl">

                    <p className="mb-2 text-xs font-black uppercase">
                        Funcionário do elevador
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
                        className="w-full rounded-2xl border-2 border-slate-300 px-4 py-4 text-lg font-black"
                    >

                        <option value="">
                            SELECIONE
                        </option>

                        {FUNCIONARIOS.map(
                            (nome) => (
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

                {/* LEITOR */}

                <section className="mb-4 rounded-3xl bg-white p-4 text-slate-900 shadow-xl">

                    {!cameraAtiva ? (

                        <button
                            type="button"
                            onClick={
                                iniciarCamera
                            }
                            className="w-full rounded-2xl bg-sky-600 px-5 py-5 text-xl font-black text-white"
                        >
                            📷 LER QR CODE
                        </button>

                    ) : (

                        <button
                            type="button"
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
                                id="leitor-elevador"
                            />

                        </div>

                    )}

                    <div className="mt-4 border-t border-slate-300 pt-4">

                        <p className="mb-2 text-xs font-black uppercase">
                            Digitar código
                        </p>

                        <div className="flex gap-2">

                            <input
                                value={
                                    codigoManual
                                }
                                onChange={(
                                    event
                                ) =>
                                    setCodigoManual(
                                        event.target.value.toUpperCase()
                                    )
                                }
                                onKeyDown={(
                                    event
                                ) => {
                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {
                                        void buscarCodigo(
                                            codigoManual
                                        );
                                    }
                                }}
                                placeholder="PMN-12345"
                                className="min-w-0 flex-1 rounded-2xl border-2 border-slate-300 px-4 py-4 font-black uppercase"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    buscarCodigo(
                                        codigoManual
                                    )
                                }
                                disabled={
                                    carregando
                                }
                                className="rounded-2xl bg-slate-900 px-5 font-black text-white"
                            >
                                BUSCAR
                            </button>

                        </div>

                    </div>

                </section>

                {/* RESULTADO */}

                <section
                    className={`rounded-3xl border-4 p-6 text-center shadow-2xl ${statusVisual.classe}`}
                >

                    <p className="text-6xl">
                        {statusVisual.icone}
                    </p>

                    <p className="mt-3 text-xs font-black uppercase tracking-widest">
                        {statusVisual.titulo}
                    </p>

                    <p className="mt-3 text-2xl font-black">
                        {carregando
                            ? "CONSULTANDO..."
                            : mensagem}
                    </p>

                </section>

                {/* DADOS DO PEDIDO */}

                {entidade?.tipo ===
                    "pedido" && (

                        <section className="mt-4 rounded-3xl bg-white p-5 text-slate-900 shadow-xl">

                            <p className="text-xs font-black uppercase text-slate-500">
                                Código
                            </p>

                            <p className="font-mono text-2xl font-black">
                                {entidade.pedido.codigoIngresso}
                            </p>

                            <div className="mt-4 rounded-2xl bg-sky-100 p-5 text-center text-sky-950">

                                <p className="text-xs font-black uppercase">
                                    Ingressos do elevador
                                </p>

                                <p className="text-6xl font-black">
                                    {
                                        entidade
                                            .resultadoElevador
                                            .quantidadeComprada
                                    }
                                </p>

                                <p className="font-black">
                                    PESSOA(S)
                                </p>

                            </div>

                            {/* CONTROLE EXCLUSIVO DO ELEVADOR */}

                            <div
                                className={`mt-4 rounded-2xl p-4 ${entidade
                                        .resultadoElevador
                                        .saldo > 0
                                        ? "bg-emerald-100 text-emerald-950"
                                        : "bg-red-100 text-red-950"
                                    }`}
                            >

                                <p className="font-black">
                                    {entidade
                                        .resultadoElevador
                                        .saldo > 0
                                        ? "✅ SALDO DO ELEVADOR DISPONÍVEL"
                                        : "⛔ ELEVADOR SEM SALDO"}
                                </p>

                                <p className="mt-2 text-sm font-bold">
                                    {
                                        entidade
                                            .resultadoElevador
                                            .mensagem
                                    }
                                </p>

                                <div className="mt-3 text-sm">

                                    <p>
                                        Comprados para o elevador:{" "}
                                        <strong>
                                            {
                                                entidade
                                                    .resultadoElevador
                                                    .quantidadeComprada
                                            }
                                        </strong>
                                    </p>

                                    <p>
                                        Já utilizados no elevador:{" "}
                                        <strong>
                                            {
                                                entidade
                                                    .resultadoElevador
                                                    .quantidadeJaUtilizada
                                            }
                                        </strong>
                                    </p>

                                    <p>
                                        Saldo disponível:{" "}
                                        <strong>
                                            {
                                                entidade
                                                    .resultadoElevador
                                                    .saldo
                                            }
                                        </strong>
                                    </p>

                                </div>

                            </div>

                            <div className="mt-4 space-y-2 rounded-2xl bg-slate-100 p-4">

                                <p>
                                    <strong>
                                        Nome:
                                    </strong>{" "}
                                    {entidade.pedido.nome}
                                </p>

                                <p>
                                    <strong>
                                        Produto:
                                    </strong>{" "}
                                    {entidade.pedido.produto}
                                </p>

                                <p>
                                    <strong>
                                        Data da visita:
                                    </strong>{" "}
                                    {formatarData(
                                        entidade.pedido.dataVisita
                                    )}
                                </p>

                                <p>
                                    <strong>
                                        Pagamento:
                                    </strong>{" "}
                                    {entidade.pedido.statusPagamento ===
                                        "pago"
                                        ? "CONFIRMADO"
                                        : entidade.pedido.statusPagamento}
                                </p>

                            </div>

                            {/* USADO NO NOVO SISTEMA */}

                            {campoPedido(
                                entidade.pedido,
                                "elevadorValidado"
                            ) === true && (

                                    <div className="mt-4 rounded-2xl bg-amber-100 p-4 text-amber-950">

                                        <p className="font-black">
                                            ⚠️ ELEVADOR JÁ UTILIZADO
                                        </p>

                                        <p className="mt-2">

                                            <strong>
                                                Funcionário:
                                            </strong>{" "}

                                            {limpar(
                                                campoPedido(
                                                    entidade.pedido,
                                                    "elevadorValidadoPor"
                                                )
                                            ) ||
                                                "-"}

                                        </p>

                                        <p>

                                            <strong>
                                                Data/hora:
                                            </strong>{" "}

                                            {formatarDataHora(
                                                limpar(
                                                    campoPedido(
                                                        entidade.pedido,
                                                        "elevadorValidadoEm"
                                                    )
                                                )
                                            )}

                                        </p>

                                    </div>

                                )}

                            {/* LEGADO */}

                            {pedidoFoiUtilizadoNoSistemaAntigo(
                                entidade.pedido
                            ) && (

                                    <div className="mt-4 rounded-2xl bg-red-100 p-4 text-red-950">

                                        <p className="text-lg font-black">
                                            ⛔ INGRESSO JÁ UTILIZADO
                                        </p>

                                        <p className="mt-2 text-sm font-bold">
                                            Este ingresso foi validado pelo sistema anterior do elevador.
                                        </p>

                                        {entidade.pedido.validadoPor && (

                                            <p className="mt-2">

                                                <strong>
                                                    Validado por:
                                                </strong>{" "}

                                                {entidade.pedido.validadoPor}

                                            </p>

                                        )}

                                        {entidade.pedido.utilizadoEm && (

                                            <p>

                                                <strong>
                                                    Utilizado em:
                                                </strong>{" "}

                                                {formatarDataHora(
                                                    entidade.pedido.utilizadoEm
                                                )}

                                            </p>

                                        )}

                                    </div>

                                )}

                        </section>

                    )}

                {/* RESERVA */}

                {entidade?.tipo ===
                    "reserva_agencia" && (

                        <section className="mt-4 rounded-3xl bg-white p-5 text-slate-900 shadow-xl">

                            <p className="text-xs font-black uppercase text-slate-500">
                                Reserva de agência
                            </p>

                            <p className="font-mono text-xl font-black">
                                {entidade.reserva.codigoGrupo}
                            </p>

                            <p className="mt-2 text-lg font-black">
                                {entidade.reserva.agenciaNome ||
                                    "Agência"}
                            </p>

                            <div className="mt-4 rounded-2xl bg-sky-100 p-5 text-center text-sky-950">

                                <p className="text-xs font-black uppercase">
                                    Ingressos do elevador
                                </p>

                                <p className="text-6xl font-black">
                                    {
                                        entidade
                                            .resultadoElevador
                                            .quantidadeComprada
                                    }
                                </p>

                                <p className="font-black">
                                    PESSOA(S)
                                </p>

                            </div>

                            <div
                                className={`mt-4 rounded-2xl p-4 ${entidade
                                        .resultadoElevador
                                        .saldo > 0
                                        ? "bg-emerald-100 text-emerald-950"
                                        : "bg-red-100 text-red-950"
                                    }`}
                            >

                                <p className="font-black">
                                    {entidade
                                        .resultadoElevador
                                        .saldo > 0
                                        ? "✅ SALDO DO ELEVADOR DISPONÍVEL"
                                        : "⛔ ELEVADOR SEM SALDO"}
                                </p>

                                <div className="mt-3 text-sm">

                                    <p>
                                        Comprados para o elevador:{" "}
                                        <strong>
                                            {
                                                entidade
                                                    .resultadoElevador
                                                    .quantidadeComprada
                                            }
                                        </strong>
                                    </p>

                                    <p>
                                        Já utilizados no elevador:{" "}
                                        <strong>
                                            {
                                                entidade
                                                    .resultadoElevador
                                                    .quantidadeJaUtilizada
                                            }
                                        </strong>
                                    </p>

                                    <p>
                                        Saldo disponível:{" "}
                                        <strong>
                                            {
                                                entidade
                                                    .resultadoElevador
                                                    .saldo
                                            }
                                        </strong>
                                    </p>

                                </div>

                            </div>

                        </section>

                    )}

                {/* BOTÃO CONFIRMAR */}

                {entidade && (

                    <section className="mt-4 rounded-3xl bg-white p-4 shadow-xl">

                        {podeConfirmar ? (

                            <button
                                type="button"
                                onClick={
                                    confirmarUsoElevador
                                }
                                disabled={
                                    carregando
                                }
                                className="w-full rounded-2xl bg-emerald-600 px-5 py-6 text-xl font-black text-white"
                            >
                                ✅ CONFIRMAR USO DO ELEVADOR
                            </button>

                        ) : (

                            <button
                                type="button"
                                disabled
                                className="w-full rounded-2xl bg-red-700 px-5 py-6 text-xl font-black text-white"
                            >
                                ⛔ NÃO LIBERAR
                            </button>

                        )}

                        <button
                            type="button"
                            onClick={
                                novaLeitura
                            }
                            className="mt-3 w-full rounded-2xl border-2 border-slate-300 px-5 py-4 font-black text-slate-900"
                        >
                            NOVA LEITURA
                        </button>

                    </section>

                )}

                <p className="mt-6 text-center text-xs text-white/60">
                    Parque Mundo Novo • Elevador Panorâmico
                </p>

            </div>

        </main>
    );
}