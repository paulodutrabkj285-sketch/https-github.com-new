import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-VHM3PVNY8B";

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
    description: "Compre seu ingresso online para o Parque Mundo Novo.",
    url: "https://www.parquemundonovooficial.com.br",
    siteName: "Parque Mundo Novo",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/logo-final.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parque Mundo Novo",
    description: "Ingressos online para o Parque Mundo Novo.",
    images: ["/logo-final.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const schemaOrg = {
  "@context": "https://schema.org",
  "@type": "TouristAttraction",
  name: "Parque Mundo Novo",
  image: "https://www.parquemundonovooficial.com.br/logo-final.png",
  description:
    "Parque turístico localizado em Urubici - SC com cachoeiras, camping, elevador panorâmico, mirantes e atrações em meio à natureza.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "SC-110 KM 34",
    addressLocality: "Urubici",
    addressRegion: "SC",
    addressCountry: "BR",
  },
  url: "https://www.parquemundonovooficial.com.br",
  telephone: "+55 49 99129-9991",
  openingHours: "Mo-Su 08:00-17:30",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>

        <Script
          id="schema-org-parque-mundo-novo"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaOrg),
          }}
        />

        {children}
      </body>
    </html>
  );
}