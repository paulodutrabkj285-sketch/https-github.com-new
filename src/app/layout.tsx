import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parque Mundo Novo",
  description: "Venda online de ingressos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}