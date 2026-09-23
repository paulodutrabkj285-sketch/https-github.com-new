import type { Metadata } from "next";

export const metadata: Metadata = {
    title: {
        absolute: "Ingressos Parque Mundo Novo Urubici | Site Oficial",
    },

    description:
        "Compre ingressos oficiais do Parque Mundo Novo em Urubici, SC. Ingressos para o parque, Elevador Panorâmico e camping com compra online.",

    applicationName: "Parque Mundo Novo",

    alternates: {
        canonical: "/ingressos",
    },

    openGraph: {
        title: "Ingressos Parque Mundo Novo Urubici | Site Oficial",
        description:
            "Compre ingressos oficiais do Parque Mundo Novo em Urubici, SC. Parque, Elevador Panorâmico e camping com compra online.",
        url: "/ingressos",
        siteName: "Parque Mundo Novo",
        locale: "pt_BR",
        type: "website",
        images: [
            {
                url: "/fotos/fundo-geral.jpg",
                width: 1200,
                height: 630,
                alt: "Parque Mundo Novo em Urubici, Santa Catarina - ingressos oficiais",
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title: "Ingressos Parque Mundo Novo Urubici | Site Oficial",
        description:
            "Compre ingressos oficiais do Parque Mundo Novo em Urubici, SC. Parque, Elevador Panorâmico e camping.",
        images: ["/fotos/fundo-geral.jpg"],
    },

    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function IngressosLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return children;
}