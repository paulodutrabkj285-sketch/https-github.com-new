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
    "Parque Mundo Novo Urubici",
    "Urubici",
    "Ingressos Parque Mundo Novo",
    "Parque em Urubici",
    "O que fazer em Urubici",
    "Cachoeiras em Urubici",
    "Camping em Urubici",
    "Elevador Panorâmico",
    "Rota das Cachoeiras",
    "Turismo em Urubici",
    "Serra Catarinense",
  ],

  authors: [
    {
      name: "Parque Mundo Novo",
      url: "https://www.parquemundonovooficial.com.br",
    },
  ],

  creator: "Parque Mundo Novo",
  publisher: "Parque Mundo Novo",

  alternates: {
    canonical: "https://www.parquemundonovooficial.com.br",
  },

  icons: {
    icon: [
      {
        url: "/logo-final.png",
        type: "image/png",
      },
    ],
    shortcut: "/logo-final.png",
    apple: "/logo-final.png",
  },

  openGraph: {
    title: "Parque Mundo Novo | Urubici - SC",
    description:
      "Conheça o Parque Mundo Novo em Urubici. Cachoeiras, mirantes, camping, natureza e Elevador Panorâmico.",
    url: "https://www.parquemundonovooficial.com.br",
    siteName: "Parque Mundo Novo",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/logo-final.png",
        width: 1200,
        height: 1200,
        alt: "Logo oficial do Parque Mundo Novo em Urubici",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Parque Mundo Novo | Urubici - SC",
    description:
      "Ingressos online para o Parque Mundo Novo em Urubici.",
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
  "@type": ["TouristAttraction", "LocalBusiness"],
  name: "Parque Mundo Novo",
  alternateName: "Parque Mundo Novo Rota das Cachoeiras",

  url: "https://www.parquemundonovooficial.com.br",

  logo: "https://www.parquemundonovooficial.com.br/logo-final.png",

  image: [
    "https://www.parquemundonovooficial.com.br/logo-final.png",
  ],

  description:
    "Parque turístico localizado em Urubici, Santa Catarina, com cachoeiras, camping, mirantes, Elevador Panorâmico e atrações em meio à natureza.",

  telephone: "+55 49 99129-9991",

  address: {
    "@type": "PostalAddress",
    streetAddress: "SC-110, KM 34",
    addressLocality: "Urubici",
    addressRegion: "SC",
    addressCountry: "BR",
  },

  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "08:00",
      closes: "17:30",
    },
  ],

  sameAs: [
    "https://www.instagram.com/parquemundonovo/",
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
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];

            function gtag() {
              window.dataLayer.push(arguments);
            }

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