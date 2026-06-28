import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portaria Parque Mundo Novo",
  description: "Sistema de validação de ingressos do Parque Mundo Novo",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo-final.png",
    shortcut: "/logo-final.png",
    apple: "/logo-final.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#064e3b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="application-name" content="Portaria PMN" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Portaria PMN" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>

      <body>{children}</body>
    </html>
  );
}