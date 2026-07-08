import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.parquemundonovooficial.com.br"),

  title: {
    default: "Parque Mundo Novo | Urubici - SC | Ingressos Online",
    template: "%s | Parque Mundo Novo",
  },

  description:
    "Compre ingressos online para o Parque Mundo Novo em Urubici - SC. Conheça cachoeiras, camping, elevador panorâmico, mirantes, natureza e aventura com compra rápida e segura.",

  keywords: [
    "Parque Mundo Novo",
    "Urubici",
    "Parque em Urubici",
    "Turismo em Urubici",
    "Camping Urubici",
    "Cachoeiras Urubici",
    "Elevador Panorâmico",
    "Ingressos Parque Mundo Novo",
    "Passeios em Urubici",
    "Natureza",
    "Santa Catarina",
    "Ecoturismo",
    "Aventura",
    "Parque Turístico",
  ],

  authors: [{ name: "Parque Mundo Novo" }],
  creator: "Parque Mundo Novo",
  publisher: "Parque Mundo Novo",

  alternates: {
    canonical: "https://www.parquemundonovooficial.com.br",
  },

  openGraph: {
    title: "Parque Mundo Novo | Urubici - SC",
    description:
      "Compre seu ingresso online e conheça um dos lugares mais bonitos de Urubici.",
    url: "https://www.parquemundonovooficial.com.br",
    siteName: "Parque Mundo Novo",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/logo-final.png",
        width: 1200,
        height: 630,
        alt: "Parque Mundo Novo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Parque Mundo Novo",
    description: "Ingressos online para o Parque Mundo Novo em Urubici.",
    images: ["/logo-final.png"],
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
  touristType: ["Famílias", "Turistas", "Aventureiros", "Campistas"],
  amenityFeature: [
    {
      "@type": "LocationFeatureSpecification",
      name: "Cachoeiras",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Camping",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Elevador Panorâmico",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Mirantes",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Pet Friendly",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Restaurante",
      value: true,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
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