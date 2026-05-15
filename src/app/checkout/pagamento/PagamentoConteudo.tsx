import { Suspense } from "react";
import PagamentoConteudo from "./PagamentoConteudo";

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PagamentoConteudo />
    </Suspense>
  );
}