import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Ingressos Oficiais",

    description:
        "Compre ingressos oficiais para o Parque Mundo Novo, Elevador Panorâmico e camping em Urubici, Santa Catarina.",

    alternates: {
        canonical: "/ingressos",
    },

    openGraph: {
        title: "Ingressos Oficiais | Parque Mundo Novo",
        description:
            "Compre ingressos oficiais para o Parque Mundo Novo, Elevador Panorâmico e camping em Urubici, Santa Catarina.",
        url: "/ingressos",
        siteName: "Parque Mundo Novo",
        locale: "pt_BR",
        type: "website",
        images: [
            {
                url: "/fotos/fundo-geral.jpg",
                width: 1200,
                height: 630,
                alt: "Ingressos oficiais do Parque Mundo Novo em Urubici",
            },
        ],
    },

    twitter: {
        card: "summary_large_image",
        title: "Ingressos Oficiais | Parque Mundo Novo",
        description:
            "Compre ingressos oficiais para o Parque Mundo Novo, Elevador Panorâmico e camping em Urubici.",
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