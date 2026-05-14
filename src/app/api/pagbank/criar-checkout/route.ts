import { NextRequest, NextResponse } from "next/server";
import { atualizarPedido } from "@/lib/pedidos";

function somenteDigitos(valor: string) {
  return (valor || "").replace(/\D/g, "");
}

function quebrarTelefone(telefone: string) {
  const numero = somenteDigitos(telefone);

  if (numero.length >= 11) {
    return {
      country: "55",
      area: numero.slice(0, 2),
      number: numero.slice(2),
    };
  }

  return {
    country: "55",
    area: "48",
    number: "999999999",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      pedidoId,
      nome,
      email,
      cpf,
      telefone,
      produto,
      valorTotal,
      quantidade,
    } = body;

    if (!pedidoId || !nome || !email || !cpf || !produto || !valorTotal) {
      return NextResponse.json(
        { ok: false, error: "Dados obrigatórios não enviados." },
        { status: 400 }
      );
    }

    const token = process.env.PAGBANK_TOKEN;
    const baseUrl = process.env.PAGBANK_BASE_URL;
    const returnUrl = process.env.PAGBANK_RETURN_URL;
    const redirectUrl = process.env.PAGBANK_REDIRECT_URL;
    const webhookUrl = process.env.PAGBANK_WEBHOOK_URL;

    if (!token || !baseUrl || !returnUrl || !redirectUrl || !webhookUrl) {
      return NextResponse.json(
        { ok: false, error: "Variáveis do PagBank não configuradas no .env.local." },
        { status: 500 }
      );
    }

    const unitAmount = Math.round(
      (Number(valorTotal) * 100) / Math.max(Number(quantidade || 1), 1)
    );

    const payload = {
      reference_id: pedidoId,
      customer: {
        name: nome,
        email,
        tax_id: somenteDigitos(cpf),
        phone: quebrarTelefone(telefone || ""),
      },
      customer_modifiable: false,
      items: [
        {
          name: produto,
          quantity: Number(quantidade || 1),
          unit_amount: unitAmount,
        },
      ],
      redirect_url: redirectUrl,
      return_url: `${returnUrl}?pedidoId=${pedidoId}`,
      notification_urls: [webhookUrl],
      payment_notification_urls: [webhookUrl],
    };

    const resposta = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro PagBank:", data);
      return NextResponse.json(
        { ok: false, error: "Erro ao criar checkout no PagBank.", details: data },
        { status: resposta.status }
      );
    }

    const payUrl =
      Array.isArray(data?.links)
        ? data.links.find((link: { rel?: string }) => link.rel === "PAY")?.href || ""
        : "";

    await atualizarPedido(pedidoId, {
      pagbankCheckoutId: data?.id || "",
      pagbankReferenceId: pedidoId,
      pagbankPayUrl: payUrl,
      pagbankStatus: data?.status || "ACTIVE",
      statusPagamento: "pendente",
    });

    return NextResponse.json({
      ok: true,
      checkoutId: data?.id || "",
      payUrl,
      pagbankStatus: data?.status || "",
      raw: data,
    });
  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao processar requisição" },
      { status: 500 }
    );
  }
}