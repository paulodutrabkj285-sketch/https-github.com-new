import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Parque Mundo Novo</h1>
      <p>Sistema de venda online de ingressos.</p>

      <Link href="/ingressos">
        Comprar ingressos
      </Link>
    </main>
  );
}