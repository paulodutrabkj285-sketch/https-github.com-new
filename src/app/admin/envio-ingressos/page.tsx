"use client";

import {
    collection,
    getDocs,
    orderBy,
    query,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

type Pedido = {
    id: string;

    produto?: string;
    tipo?: string;

    nome?: string;
    cpf?: string;
    telefone?: string;
    email?: string;

    dataVisita?: string;
    dataEntrada?: string;

    quantidade?: number;

    valorTotal?: number;

    statusPagamento?: string;
    statusOperacional?: string;

    codigoIngresso?: string;

    emailIngressoEnviado?: boolean;
    emailIngressoEnviadoEm?: string;

    emailIngressoReenviado?: boolean;
    emailIngressoReenviadoEm?: string;

    whatsappIngressoEnviado?: boolean;
    whatsappIngressoEnviadoEm?: string;

    whatsappIngressoReenviado?: boolean;
    whatsappIngressoReenviadoEm?: string;
};

type StatusEnvio = {
    tipo:
    | "sucesso"
    | "erro"
    | "processando";

    mensagem: string;
};

export default function EnvioIngressosPage() {
    const [pedidos, setPedidos] =
        useState<Pedido[]>([]);

    const [carregando, setCarregando] =
        useState(true);

    const [busca, setBusca] =
        useState("");

    const [statusEnvios, setStatusEnvios] =
        useState<
            Record<
                string,
                StatusEnvio
            >
        >({});

    const [statusWhatsapp, setStatusWhatsapp] =
        useState<
            Record<
                string,
                StatusEnvio
            >
        >({});

    const [processandoId, setProcessandoId] =
        useState("");

    const [
        processandoWhatsappId,
        setProcessandoWhatsappId,
    ] = useState("");

    /* ==========================================
       CARREGAR PEDIDOS
    ========================================== */

    useEffect(() => {
        carregarPedidos();
    }, []);

    async function carregarPedidos() {
        try {
            setCarregando(true);

            const q = query(
                collection(
                    db,
                    "pedidos"
                ),

                orderBy(
                    "createdAt",
                    "desc"
                )
            );

            const snapshot =
                await getDocs(q);

            const lista =
                snapshot.docs.map(
                    (documento) => ({
                        id:
                            documento.id,

                        ...documento.data(),
                    })
                ) as Pedido[];

            setPedidos(
                lista
            );
        } catch (error) {
            console.error(
                "Erro ao carregar pedidos:",
                error
            );

            alert(
                "Não foi possível carregar os pedidos."
            );
        } finally {
            setCarregando(
                false
            );
        }
    }

    /* ==========================================
       PEDIDOS PAGOS + BUSCA
    ========================================== */

    const pedidosFiltrados =
        useMemo(() => {
            const texto =
                busca
                    .trim()
                    .toLowerCase();

            const somentePagos =
                pedidos.filter(
                    (pedido) =>
                        pedido.statusPagamento ===
                        "pago"
                );

            if (!texto) {
                return somentePagos;
            }

            return somentePagos.filter(
                (pedido) => {
                    const campos = [
                        pedido.nome,
                        pedido.cpf,
                        pedido.telefone,
                        pedido.email,
                        pedido.codigoIngresso,
                        pedido.produto,
                        pedido.id,
                    ];

                    return campos.some(
                        (campo) =>
                            String(
                                campo || ""
                            )
                                .toLowerCase()
                                .includes(
                                    texto
                                )
                    );
                }
            );
        }, [
            pedidos,
            busca,
        ]);

    /* ==========================================
       FORMATAR DATA
    ========================================== */

    function formatarData(
        valor?: string
    ) {
        if (!valor) {
            return "-";
        }

        const partes =
            valor.split("-");

        if (
            partes.length ===
            3
        ) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }

        try {
            return new Date(
                valor
            ).toLocaleDateString(
                "pt-BR"
            );
        } catch {
            return valor;
        }
    }

    /* ==========================================
       FORMATAR DATA/HORA
    ========================================== */

    function formatarDataHora(
        valor?: string
    ) {
        if (!valor) {
            return "-";
        }

        try {
            return new Date(
                valor
            ).toLocaleString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                }
            );
        } catch {
            return valor;
        }
    }

    /* ==========================================
       FORMATAR MOEDA
    ========================================== */

    function formatarMoeda(
        valor?: number
    ) {
        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
            }
        );
    }

    /* ==========================================
       REENVIAR EMAIL
    ========================================== */

    async function reenviarIngresso(
        pedido: Pedido
    ) {
        if (
            pedido.statusPagamento !==
            "pago"
        ) {
            alert(
                "Somente pedidos pagos podem ser reenviados."
            );

            return;
        }

        if (!pedido.email) {
            alert(
                "Este pedido não possui e-mail cadastrado."
            );

            return;
        }

        const confirmou =
            window.confirm(
                `Reenviar o ingresso ${pedido.codigoIngresso || ""} para:\n\n${pedido.email}?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessandoId(
                pedido.id
            );

            setStatusEnvios(
                (anterior) => ({
                    ...anterior,

                    [pedido.id]: {
                        tipo:
                            "processando",

                        mensagem:
                            "Enviando ingresso por e-mail...",
                    },
                })
            );

            const response =
                await fetch(
                    "/api/reenviar-ingresso",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                pedidoId:
                                    pedido.id,
                            }),
                    }
                );

            const resultado =
                await response.json();

            if (
                !response.ok ||
                !resultado?.ok
            ) {
                throw new Error(
                    resultado?.error ||
                    resultado?.mensagem ||
                    "Erro ao reenviar ingresso."
                );
            }

            setStatusEnvios(
                (anterior) => ({
                    ...anterior,

                    [pedido.id]: {
                        tipo:
                            "sucesso",

                        mensagem:
                            `Ingresso reenviado para ${pedido.email}`,
                    },
                })
            );

            await carregarPedidos();
        } catch (
        error: any
        ) {
            const mensagem =
                String(
                    error?.message ||
                    error ||
                    "Erro ao reenviar."
                );

            console.error(
                "Erro no reenvio:",
                error
            );

            setStatusEnvios(
                (anterior) => ({
                    ...anterior,

                    [pedido.id]: {
                        tipo:
                            "erro",

                        mensagem,
                    },
                })
            );
        } finally {
            setProcessandoId(
                ""
            );
        }
    }

    /* ==========================================
       REENVIAR WHATSAPP
    ========================================== */

    async function reenviarWhatsapp(
        pedido: Pedido
    ) {
        if (
            pedido.statusPagamento !==
            "pago"
        ) {
            alert(
                "Somente pedidos pagos podem ser enviados pelo WhatsApp."
            );

            return;
        }

        if (!pedido.telefone) {
            alert(
                "Este pedido não possui telefone cadastrado."
            );

            return;
        }

        const confirmou =
            window.confirm(
                `Enviar o ingresso ${pedido.codigoIngresso || ""} pelo WhatsApp para:\n\n${pedido.telefone}?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessandoWhatsappId(
                pedido.id
            );

            setStatusWhatsapp(
                (anterior) => ({
                    ...anterior,

                    [pedido.id]: {
                        tipo:
                            "processando",

                        mensagem:
                            "Enviando ingresso pelo WhatsApp...",
                    },
                })
            );

            /*
             * A rota recebe somente o pedidoId.
             *
             * O backend deve:
             *
             * 1. Buscar o pedido no Firestore
             * 2. Confirmar statusPagamento = pago
             * 3. Gerar/localizar o PDF
             * 4. Enviar pelo respond.io
             * 5. Utilizar o template:
             *
             * ingresso_parque_mundo_novo
             *
             * 6. Preencher:
             *
             * {{1}} = nome
             * {{2}} = data da visita
             * {{3}} = código do ingresso
             */

            const response =
                await fetch(
                    "/api/reenviar-ingresso-whatsapp",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                pedidoId:
                                    pedido.id,
                            }),
                    }
                );

            let resultado: any =
                null;

            try {
                resultado =
                    await response.json();
            } catch {
                throw new Error(
                    "O servidor não retornou uma resposta JSON válida."
                );
            }

            if (
                !response.ok ||
                !resultado?.ok
            ) {
                throw new Error(
                    resultado?.error ||
                    resultado?.mensagem ||
                    "Erro ao enviar ingresso pelo WhatsApp."
                );
            }

            setStatusWhatsapp(
                (anterior) => ({
                    ...anterior,

                    [pedido.id]: {
                        tipo:
                            "sucesso",

                        mensagem:
                            `Ingresso enviado pelo WhatsApp para ${pedido.telefone}`,
                    },
                })
            );

            await carregarPedidos();
        } catch (
        error: any
        ) {
            const mensagem =
                String(
                    error?.message ||
                    error ||
                    "Erro ao enviar pelo WhatsApp."
                );

            console.error(
                "Erro no envio WhatsApp:",
                error
            );

            setStatusWhatsapp(
                (anterior) => ({
                    ...anterior,

                    [pedido.id]: {
                        tipo:
                            "erro",

                        mensagem,
                    },
                })
            );
        } finally {
            setProcessandoWhatsappId(
                ""
            );
        }
    }

    /* ==========================================
       TELA
    ========================================== */

    return (
        <main
            style={{
                minHeight:
                    "100vh",

                background:
                    "linear-gradient(to bottom, #edf7ed, #ffffff)",

                padding:
                    "34px 20px 50px",
            }}
        >
            <div
                style={{
                    maxWidth:
                        "1200px",

                    margin:
                        "0 auto",
                }}
            >
                {/* CABEÇALHO */}

                <section
                    style={{
                        background:
                            "linear-gradient(135deg, #5a7a60, #4f6f57)",

                        borderRadius:
                            "28px",

                        padding:
                            "30px",

                        marginBottom:
                            "30px",

                        boxShadow:
                            "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                >
                    <div
                        style={{
                            display:
                                "flex",

                            alignItems:
                                "center",

                            gap:
                                "24px",

                            flexWrap:
                                "wrap",
                        }}
                    >
                        <img
                            src="/logo-final.png"
                            alt="Parque Mundo Novo"
                            style={{
                                width:
                                    "110px",

                                height:
                                    "110px",

                                objectFit:
                                    "contain",

                                borderRadius:
                                    "20px",

                                background:
                                    "rgba(255,255,255,0.08)",

                                padding:
                                    "10px",
                            }}
                        />

                        <div>
                            <h1
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#ffffff",

                                    fontSize:
                                        "clamp(30px, 4vw, 48px)",

                                    fontWeight:
                                        "bold",
                                }}
                            >
                                Envio de
                                Ingressos
                            </h1>

                            <p
                                style={{
                                    marginTop:
                                        "10px",

                                    marginBottom:
                                        0,

                                    color:
                                        "#f1f5f9",

                                    fontSize:
                                        "18px",
                                }}
                            >
                                Pesquise pedidos
                                pagos e reenvie o
                                ingresso por e-mail
                                ou WhatsApp.
                            </p>
                        </div>
                    </div>
                </section>

                {/* BUSCA */}

                <section
                    style={{
                        background:
                            "#ffffff",

                        borderRadius:
                            "20px",

                        padding:
                            "24px",

                        boxShadow:
                            "0 4px 14px rgba(0,0,0,0.08)",

                        border:
                            "1px solid #dbe5db",

                        marginBottom:
                            "24px",
                    }}
                >
                    <label
                        style={{
                            display:
                                "block",

                            fontWeight:
                                "bold",

                            color:
                                "#334155",

                            marginBottom:
                                "8px",
                        }}
                    >
                        Buscar cliente ou
                        ingresso
                    </label>

                    <input
                        value={
                            busca
                        }
                        onChange={(e) =>
                            setBusca(
                                e.target.value
                            )
                        }
                        placeholder="Nome, CPF, e-mail, telefone, PMN-12345 ou ID do pedido"
                        style={{
                            width:
                                "100%",

                            padding:
                                "15px",

                            borderRadius:
                                "12px",

                            border:
                                "1px solid #cbd5e1",

                            fontSize:
                                "16px",
                        }}
                    />

                    <p
                        style={{
                            marginBottom:
                                0,

                            color:
                                "#64748b",
                        }}
                    >
                        Mostrando apenas
                        pedidos com pagamento
                        confirmado.
                    </p>
                </section>

                {/* PEDIDOS */}

                <section>
                    {carregando ? (
                        <div
                            style={
                                cardStyle
                            }
                        >
                            Carregando
                            pedidos...
                        </div>
                    ) : pedidosFiltrados
                        .length ===
                        0 ? (
                        <div
                            style={
                                cardStyle
                            }
                        >
                            Nenhum pedido
                            pago encontrado.
                        </div>
                    ) : (
                        <div
                            style={{
                                display:
                                    "grid",

                                gap:
                                    "18px",
                            }}
                        >
                            {pedidosFiltrados.map(
                                (pedido) => {
                                    const status =
                                        statusEnvios[
                                        pedido.id
                                        ];

                                    const statusWA =
                                        statusWhatsapp[
                                        pedido.id
                                        ];

                                    const processando =
                                        processandoId ===
                                        pedido.id;

                                    const processandoWA =
                                        processandoWhatsappId ===
                                        pedido.id;

                                    return (
                                        <article
                                            key={
                                                pedido.id
                                            }
                                            style={
                                                cardStyle
                                            }
                                        >
                                            <div
                                                style={{
                                                    display:
                                                        "flex",

                                                    justifyContent:
                                                        "space-between",

                                                    alignItems:
                                                        "flex-start",

                                                    gap:
                                                        "18px",

                                                    flexWrap:
                                                        "wrap",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        flex:
                                                            "1 1 500px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",

                                                            alignItems:
                                                                "center",

                                                            gap:
                                                                "10px",

                                                            flexWrap:
                                                                "wrap",

                                                            marginBottom:
                                                                "12px",
                                                        }}
                                                    >
                                                        <h2
                                                            style={{
                                                                margin:
                                                                    0,

                                                                color:
                                                                    "#166534",

                                                                fontSize:
                                                                    "24px",
                                                            }}
                                                        >
                                                            {pedido.nome ||
                                                                "Cliente"}
                                                        </h2>

                                                        <span
                                                            style={{
                                                                background:
                                                                    "#dcfce7",

                                                                color:
                                                                    "#166534",

                                                                borderRadius:
                                                                    "999px",

                                                                padding:
                                                                    "6px 10px",

                                                                fontSize:
                                                                    "12px",

                                                                fontWeight:
                                                                    "bold",
                                                            }}
                                                        >
                                                            PAGO
                                                        </span>
                                                    </div>

                                                    <div
                                                        style={{
                                                            display:
                                                                "grid",

                                                            gridTemplateColumns:
                                                                "repeat(auto-fit, minmax(200px, 1fr))",

                                                            gap:
                                                                "10px",

                                                            color:
                                                                "#334155",
                                                        }}
                                                    >
                                                        <p>
                                                            <strong>
                                                                Produto:
                                                            </strong>
                                                            <br />
                                                            {pedido.produto ||
                                                                "-"}
                                                        </p>

                                                        <p>
                                                            <strong>
                                                                Código:
                                                            </strong>
                                                            <br />
                                                            {pedido.codigoIngresso ||
                                                                "-"}
                                                        </p>

                                                        <p>
                                                            <strong>
                                                                Quantidade:
                                                            </strong>
                                                            <br />
                                                            {pedido.quantidade ||
                                                                0}{" "}
                                                            {Number(
                                                                pedido.quantidade ||
                                                                0
                                                            ) ===
                                                                1
                                                                ? "pessoa"
                                                                : "pessoas"}
                                                        </p>

                                                        <p>
                                                            <strong>
                                                                Valor:
                                                            </strong>
                                                            <br />
                                                            {formatarMoeda(
                                                                pedido.valorTotal
                                                            )}
                                                        </p>

                                                        <p>
                                                            <strong>
                                                                Data da visita:
                                                            </strong>
                                                            <br />
                                                            {formatarData(
                                                                pedido.dataEntrada ||
                                                                pedido.dataVisita
                                                            )}
                                                        </p>

                                                        <p>
                                                            <strong>
                                                                Telefone:
                                                            </strong>
                                                            <br />
                                                            {pedido.telefone ||
                                                                "-"}
                                                        </p>
                                                    </div>

                                                    <div
                                                        style={{
                                                            marginTop:
                                                                "12px",

                                                            background:
                                                                "#f8fafc",

                                                            borderRadius:
                                                                "12px",

                                                            padding:
                                                                "14px",
                                                        }}
                                                    >
                                                        <p
                                                            style={{
                                                                margin:
                                                                    "0 0 6px 0",
                                                            }}
                                                        >
                                                            <strong>
                                                                E-mail:
                                                            </strong>{" "}
                                                            {pedido.email ||
                                                                "-"}
                                                        </p>

                                                        <p
                                                            style={{
                                                                margin:
                                                                    "0 0 6px 0",
                                                            }}
                                                        >
                                                            <strong>
                                                                Último envio por e-mail:
                                                            </strong>{" "}
                                                            {pedido.emailIngressoReenviadoEm
                                                                ? formatarDataHora(
                                                                    pedido.emailIngressoReenviadoEm
                                                                )
                                                                : pedido.emailIngressoEnviadoEm
                                                                    ? formatarDataHora(
                                                                        pedido.emailIngressoEnviadoEm
                                                                    )
                                                                    : "Nenhum envio registrado"}
                                                        </p>

                                                        <p
                                                            style={{
                                                                margin:
                                                                    0,
                                                            }}
                                                        >
                                                            <strong>
                                                                Último envio por WhatsApp:
                                                            </strong>{" "}
                                                            {pedido.whatsappIngressoReenviadoEm
                                                                ? formatarDataHora(
                                                                    pedido.whatsappIngressoReenviadoEm
                                                                )
                                                                : pedido.whatsappIngressoEnviadoEm
                                                                    ? formatarDataHora(
                                                                        pedido.whatsappIngressoEnviadoEm
                                                                    )
                                                                    : "Nenhum envio registrado"}
                                                        </p>
                                                    </div>

                                                    {status && (
                                                        <div
                                                            style={{
                                                                marginTop:
                                                                    "14px",

                                                                borderRadius:
                                                                    "12px",

                                                                padding:
                                                                    "12px",

                                                                fontWeight:
                                                                    "bold",

                                                                background:
                                                                    status.tipo ===
                                                                        "sucesso"
                                                                        ? "#dcfce7"
                                                                        : status.tipo ===
                                                                            "erro"
                                                                            ? "#fee2e2"
                                                                            : "#fef9c3",

                                                                color:
                                                                    status.tipo ===
                                                                        "sucesso"
                                                                        ? "#166534"
                                                                        : status.tipo ===
                                                                            "erro"
                                                                            ? "#991b1b"
                                                                            : "#854d0e",
                                                            }}
                                                        >
                                                            {
                                                                status.mensagem
                                                            }
                                                        </div>
                                                    )}

                                                    {statusWA && (
                                                        <div
                                                            style={{
                                                                marginTop:
                                                                    "14px",

                                                                borderRadius:
                                                                    "12px",

                                                                padding:
                                                                    "12px",

                                                                fontWeight:
                                                                    "bold",

                                                                background:
                                                                    statusWA.tipo ===
                                                                        "sucesso"
                                                                        ? "#dcfce7"
                                                                        : statusWA.tipo ===
                                                                            "erro"
                                                                            ? "#fee2e2"
                                                                            : "#fef9c3",

                                                                color:
                                                                    statusWA.tipo ===
                                                                        "sucesso"
                                                                        ? "#166534"
                                                                        : statusWA.tipo ===
                                                                            "erro"
                                                                            ? "#991b1b"
                                                                            : "#854d0e",
                                                            }}
                                                        >
                                                            {
                                                                statusWA.mensagem
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                <div
                                                    style={{
                                                        minWidth:
                                                            "250px",
                                                    }}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            reenviarIngresso(
                                                                pedido
                                                            )
                                                        }
                                                        disabled={
                                                            processando ||
                                                            !pedido.email
                                                        }
                                                        style={{
                                                            width:
                                                                "100%",

                                                            border:
                                                                "none",

                                                            borderRadius:
                                                                "14px",

                                                            padding:
                                                                "16px",

                                                            background:
                                                                processando
                                                                    ? "#94a3b8"
                                                                    : "#166534",

                                                            color:
                                                                "#ffffff",

                                                            fontWeight:
                                                                "bold",

                                                            fontSize:
                                                                "16px",

                                                            cursor:
                                                                processando
                                                                    ? "not-allowed"
                                                                    : "pointer",
                                                        }}
                                                    >
                                                        {processando
                                                            ? "ENVIANDO..."
                                                            : "📧 REENVIAR POR E-MAIL"}
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            reenviarWhatsapp(
                                                                pedido
                                                            )
                                                        }
                                                        disabled={
                                                            processandoWA ||
                                                            !pedido.telefone
                                                        }
                                                        style={{
                                                            width:
                                                                "100%",

                                                            marginTop:
                                                                "10px",

                                                            border:
                                                                "none",

                                                            borderRadius:
                                                                "14px",

                                                            padding:
                                                                "16px",

                                                            background:
                                                                processandoWA ||
                                                                    !pedido.telefone
                                                                    ? "#94a3b8"
                                                                    : "#16a34a",

                                                            color:
                                                                "#ffffff",

                                                            fontWeight:
                                                                "bold",

                                                            fontSize:
                                                                "16px",

                                                            cursor:
                                                                processandoWA ||
                                                                    !pedido.telefone
                                                                    ? "not-allowed"
                                                                    : "pointer",
                                                        }}
                                                    >
                                                        {processandoWA
                                                            ? "ENVIANDO WHATSAPP..."
                                                            : "💬 REENVIAR POR WHATSAPP"}
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

const cardStyle:
    React.CSSProperties = {
    background:
        "#ffffff",

    borderRadius:
        "20px",

    padding:
        "22px",

    boxShadow:
        "0 4px 14px rgba(0,0,0,0.08)",

    border:
        "1px solid #dbe5db",

    color:
        "#1f2937",
};