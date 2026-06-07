"use client";

import { useEffect, useState } from "react";

export default function PagamentoPage() {
  const [dados, setDados] = useState<any>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [pix, setPix] = useState("");
  const [txid, setTxid] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const dadosCheckout = {
      pedidoId: params.get("pedidoId") || "",
      produto: params.get("produto") || "Ingresso",
      nome: params.get("nome") || "",
      cpf: params.get("cpf") || "",
      telefone: params.get("telefone") || "",
      email: params.get("email") || "",
      quantidade: params.get("quantidade") || "1",
      valorTotal: params.get("valorTotal") || "0",
    };

    console.log("DADOS CHECKOUT PAGAMENTO:", dadosCheckout);
    setDados(dadosCheckout);
  }, []);

  async function gerarPix() {
    setCarregando(true);
    setErro("");
    setPix("");
    setTxid("");

    try {
      const cpfLimpo = String(dados.cpf || "").replace(/\D/g, "");

      const payload = {
        pedidoId: dados.pedidoId,
        produto: dados.produto,
        nome: dados.nome,
        cpf: cpfLimpo,
        telefone: dados.telefone,
        email: dados.email,
        quantidade: dados.quantidade,
        valorTotal: dados.valorTotal,
      };

      console.log("ENVIANDO PARA API SICREDI:", payload);

      const response = await fetch("/api/sicredi/criar-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("RESPOSTA API SICREDI:", data);

      if (!response.ok) {
        setErro(JSON.stringify(data, null, 2));
        return;
      }

      setPix(data.pixCopiaECola || data.qrcode || "");
      setTxid(data.txid || "");
    } catch (error: any) {
      setErro(error?.message || "Erro ao gerar Pix.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Pagamento via PIX</h1>

      <div style={{ marginTop: 20, lineHeight: 1.8 }}>
        <p><strong>Produto:</strong> {dados.produto}</p>
        <p><strong>Nome:</strong> {dados.nome}</p>
        <p><strong>CPF:</strong> {dados.cpf}</p>
        <p><strong>Quantidade:</strong> {dados.quantidade}</p>
        <p><strong>Total:</strong> R$ {dados.valorTotal}</p>
      </div>

      <button
        onClick={gerarPix}
        disabled={carregando}
        style={{
          marginTop: 20,
          padding: "14px 22px",
          borderRadius: 10,
          border: "none",
          background: "#16a34a",
          color: "white",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {carregando ? "Gerando PIX..." : "Gerar PIX Sicredi"}
      </button>

      {txid && (
        <p style={{ marginTop: 20 }}>
          <strong>TXID:</strong> {txid}
        </p>
      )}

      {pix && (
        <div style={{ marginTop: 20 }}>
          <h2>Pix Copia e Cola</h2>

          <textarea
            value={pix}
            readOnly
            style={{
              width: "100%",
              height: 160,
              padding: 12,
              borderRadius: 8,
            }}
          />

          <button
            onClick={() => navigator.clipboard.writeText(pix)}
            style={{
              marginTop: 10,
              padding: "12px 18px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Copiar código PIX
          </button>
        </div>
      )}

      {erro && (
        <pre
          style={{
            marginTop: 20,
            padding: 15,
            background: "#fee2e2",
            color: "#991b1b",
            whiteSpace: "pre-wrap",
            borderRadius: 8,
          }}
        >
          {erro}
        </pre>
      )}
    </main>
  );
}