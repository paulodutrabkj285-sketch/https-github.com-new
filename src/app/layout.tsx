import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.parquemundonovooficial.com.br"),

  title: {
    default: "Parque Mundo Novo | Urubici - SC",
    template: "%s | Parque Mundo Novo",
  },

  description:
    "Compre ingressos online para o Parque Mundo Novo em Urubici. Cachoeiras, camping, mirantes, elevador panorâmico, natureza e aventura na Serra Catarinense.",

  keywords: [
    "Parque Mundo Novo",
    "Urubici",
    "Ingressos",
    "Camping",
    "Elevador Panorâmico",
    "Cachoeira",
    "Turismo",
    "Serra Catarinense",
    "Parque",
  ],

  openGraph: {
    title: "Parque Mundo Novo",
    description:
      "Compre seu ingresso online para o Parque Mundo Novo.",
    url: "https://www.parquemundonovooficial.com.br",
    siteName: "Parque Mundo Novo",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/logo-final.png",
        width: 1200,
        height: 630,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Parque Mundo Novo",
    description:
      "Ingressos online para o Parque Mundo Novo.",
    images: ["/logo-final.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}