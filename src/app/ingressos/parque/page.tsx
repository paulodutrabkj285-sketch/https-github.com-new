"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ParquePage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  const valorUnitario = 60;
  const valorTotal = valorUnitario * quantidade;

  function irPagamento() {
    const cpfLimpo = cpf.replace(/\D/g, "");

    const params = new URLSearchParams({
      pedidoId: `PMN-${Date.now()}`,
      produto: "Ingresso Parque",
      nome,
      cpf: cpfLimpo,
      telefone,
      email,
      quantidade: String(quantidade),
      valorTotal: String(valorTotal),
    });

    router.push(`/checkout/pagamento?${params.toString()}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Ingresso Parque Mundo Novo</h1>
      <p>Valor: R$ {valorUnitario},00</p>

      <input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
      <input placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} style={campo} />
      <input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={campo} />
      <input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={campo} />
      <input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} style={campo} />

      <h2>Total: R$ {valorTotal.toFixed(2)}</h2>

      <button onClick={irPagamento} style={botao}>
        Pagamento via PIX
      </button>
    </main>
  );
}

const campo = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const botao = {
  marginTop: 20,
  padding: "14px 22px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};