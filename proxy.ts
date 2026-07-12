import { NextRequest, NextResponse } from "next/server";

const VENDAS_SUSPENSAS =
    process.env.NEXT_PUBLIC_VENDAS_SUSPENSAS === "true";

export function proxy(request: NextRequest) {
    if (!VENDAS_SUSPENSAS) {
        return NextResponse.next();
    }

    const pathname = request.nextUrl.pathname;

    const rotasBloqueadas = [
        "/ingressos/parque",
        "/ingressos/idoso",
        "/ingressos/camping",
        "/ingressos/elevador",
        "/checkout/resumo",
        "/checkout/pagamento",
    ];

    const deveBloquear = rotasBloqueadas.some(
        (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
    );

    if (deveBloquear) {
        return NextResponse.redirect(
            new URL("/vendas-temporariamente-suspensas", request.url)
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/ingressos/parque/:path*",
        "/ingressos/idoso/:path*",
        "/ingressos/camping/:path*",
        "/ingressos/elevador/:path*",
        "/checkout/resumo/:path*",
        "/checkout/pagamento/:path*",
    ],
};