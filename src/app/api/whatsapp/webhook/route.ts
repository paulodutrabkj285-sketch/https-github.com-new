import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN || "parque-mundo-novo-webhook-2026";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("Verificação do webhook recebida:", {
        mode,
        tokenRecebido: token,
        challenge,
    });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verificado com sucesso.");

        return new NextResponse(challenge, {
            status: 200,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    }

    console.error("Falha na verificação do webhook.");

    return NextResponse.json(
        {
            ok: false,
            erro: "Token de verificação inválido",
        },
        { status: 403 }
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log("=================================================");
        console.log("WEBHOOK WHATSAPP RECEBIDO");
        console.log(JSON.stringify(body, null, 2));
        console.log("=================================================");

        const entry = body?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;

        const messages = value?.messages;
        const statuses = value?.statuses;
        const contacts = value?.contacts;

        if (messages && messages.length > 0) {
            for (const message of messages) {
                const numeroCliente = message?.from;
                const idMensagem = message?.id;
                const tipoMensagem = message?.type;

                let conteudo = "";

                if (tipoMensagem === "text") {
                    conteudo = message?.text?.body || "";
                } else if (tipoMensagem === "button") {
                    conteudo = message?.button?.text || "";
                } else if (tipoMensagem === "interactive") {
                    conteudo =
                        message?.interactive?.button_reply?.title ||
                        message?.interactive?.list_reply?.title ||
                        "";
                } else {
                    conteudo = `[Mensagem do tipo ${tipoMensagem}]`;
                }

                const nomeCliente =
                    contacts?.find(
                        (contact: any) => contact?.wa_id === numeroCliente
                    )?.profile?.name || "";

                console.log("Nova mensagem recebida:", {
                    numeroCliente,
                    nomeCliente,
                    idMensagem,
                    tipoMensagem,
                    conteudo,
                });

                /*
                 * Mais adiante vamos salvar aqui no Firestore:
                 *
                 * - número do cliente
                 * - nome
                 * - mensagem
                 * - data/hora
                 * - status
                 * - conversa
                 *
                 * Também será aqui que nosso sistema poderá
                 * decidir se responde automaticamente ou
                 * encaminha para um atendente.
                 */
            }
        }

        if (statuses && statuses.length > 0) {
            for (const status of statuses) {
                console.log("Status de mensagem:", {
                    id: status?.id,
                    status: status?.status,
                    destinatario: status?.recipient_id,
                    timestamp: status?.timestamp,
                });
            }
        }

        return NextResponse.json(
            {
                ok: true,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Erro ao processar webhook do WhatsApp:", error);

        /*
         * Para webhooks é importante responder 200 sempre que possível.
         * Caso contrário a Meta pode continuar tentando reenviar o evento.
         */

        return NextResponse.json(
            {
                ok: true,
            },
            { status: 200 }
        );
    }
}