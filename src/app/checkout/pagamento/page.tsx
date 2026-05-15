import Link from "next/link";

export default function PagamentoPage() {
  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Pagamento</h1>

      <p>
        Página de pagamento em fase de integração com PagBank.
      </p>

      <p>
        Para apresentação, o fluxo do projeto já demonstra escolha de ingresso,
        resumo da compra e confirmação.
      </p>

      <Link href="/checkout/sucesso">
        Simular pagamento aprovado
      </Link>
    </main>
  );
}