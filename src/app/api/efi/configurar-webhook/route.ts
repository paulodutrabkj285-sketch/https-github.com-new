import { NextRequest, NextResponse } from "next/server";
import { cadastrarWebhookEfi } from "@/lib/efi-pix";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const adminSecret = process.env.CRON_SECRET;
    if (!adminSecret || adminSecret.includes("[SENSITIVE]")) {
        return NextResponse.json({ ok: false, error: "CRON_SECRET não configurado." }, { status: 500 });
    }
    if (req.headers.get("authorization") !== `Bearer ${adminSecret}`) {
        return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    if (!process.env.EFI_WEBHOOK_HMAC?.trim()) {
        return NextResponse.json({ ok: false, error: "EFI_WEBHOOK_HMAC não configurado." }, { status: 500 });
    }

    try {
        await cadastrarWebhookEfi();
        return NextResponse.json({ ok: true, skipMtlsChecking: true });
    } catch {
        // A URL cadastrada pode aparecer no erro retornado pela API Efí.
        return NextResponse.json({ ok: false, error: "Não foi possível cadastrar o webhook Efí." }, { status: 502 });
    }
}
