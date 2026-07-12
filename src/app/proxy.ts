import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/*
  true  = vendas bloqueadas
  false = vendas liberadas

  Depois do treinamento, basta trocar para false e publicar novamente.
*/
const VENDAS_SUSPENSAS = true;

const PAGINA_SUSPENSA = "/vendas-temporariamente-suspensas";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!VENDAS_SUSPENSAS) {
        return NextResponse.next();
    }

    // Evita redirecionamento infinito.
    if (pathname === PAGINA_SUSPENSA) {
        return NextResponse.next();
    }

    const rotasBloqueadas = [
        "/ingressos/parque",
        "/ingressos/idoso",
        "/ingressos/camping",
        "/ingressos/elevador",

        "/checkout/resumo",
        "/checkout/pagamento",

        // Impede também a criação direta de novas cobranças.
        "/api/sicredi",
        "/api/pagbank",
    ];

    const rotaDeVendaBloqueada = rotasBloqueadas.some(
        (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
    );

    if (rotaDeVendaBloqueada) {
        // Para APIs, devolve erro em vez de uma página HTML.
        if (pathname.startsWith("/api/")) {
            return NextResponse.json(
                {
                    erro: "Vendas online temporariamente suspensas.",
                    vendasSuspensas: true,
                },
                { status: 503 }
            );
        }

        const url = request.nextUrl.clone();
        url.pathname = PAGINA_SUSPENSA;
        url.search = "";

        return NextResponse.redirect(url);
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

        "/api/sicredi/:path*",
        "/api/pagbank/:path*",
    ],
};