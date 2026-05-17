"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { criarPedido } from "@/lib/pedidos";

export default function ParquePage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [dataVisita, setDataVisita] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [salvando, setSalvando] = useState(false);

  const valorUnitario = 60;
  const valorTotal = useMemo(() => quantidade * valorUnitario, [quantidade]);

  async function continuarParaResumo() {
    if (!nome || !cpf || !telefone || !email || !dataVisita) {
      alert("Preencha todos os campos antes de continuar.");
      return;
    }

    try {
      setSalvando(true);

      const pedidoId = await criarPedido({
        produto: "Ingresso Parque",
        tipo: "ingresso",
        nome,
        cpf,
        telefone,
        email,
        dataVisita,
        quantidade,
        valorUnitario,
        valorTotal,
        statusPagamento: "pendente",
        statusOperacional: "ativo",
        pagbankCheckoutId: "",
        pagbankReferenceId: "",
        pagbankPayUrl: "",
        pagbankStatus: "",
        codigoIngresso: "",
        qrCodeIngresso: "",
      });

      const params = new URLSearchParams({
        pedidoId,
        produto: "Ingresso Parque",
        tipo: "ingresso",
        nome,
        cpf,
        telefone,
        email,
        dataVisita,
        quantidade: String(quantidade),
        valorUnitario: String(valorUnitario),
        valorTotal: String(valorTotal),
      });

      router.push(`/checkout/resumo?${params.toString()}`);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Não foi possível salvar o pedido. Verifique o Firebase e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#edf7ed] to-white px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-3xl bg-gradient-to-br from-[#5a7a60] to-[#4f6f57] p-5 text-white shadow-xl sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <div className="flex w-full max-w-[180px] items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-3 sm:max-w-[220px]">
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                className="w-full max-w-[140px] rounded-xl"
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                Ingresso Parque
              </h1>

              <p className="mt-3 text-base leading-relaxed text-gray-100 sm:text-xl">
                Preencha os dados abaixo para simular a compra do ingresso de entrada do Parque Mundo Novo.
              </p>

              <p className="mt-3 text-sm leading-relaxed text-gray-200 sm:text-base">
                O QR Code do ingresso será gerado somente após a confirmação do pagamento.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-[#dbe5db] bg-white p-5 shadow-md sm:p-6">
            <h2 className="mb-5 text-2xl font-bold text-[#166534] sm:text-3xl">
              Dados do comprador
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Nome completo">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite seu nome"
                  className={inputClass}
                />
              </Campo>

              <Campo label="CPF">
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Digite seu CPF"
                  className={inputClass}
                />
              </Campo>

              <Campo label="Telefone / WhatsApp">
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Digite seu telefone"
                  className={inputClass}
                />
              </Campo>

              <Campo label="E-mail">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className={inputClass}
                />
              </Campo>

              <Campo label="Data da visita">
                <input
                  type="date"
                  value={dataVisita}
                  onChange={(e) => setDataVisita(e.target.value)}
                  className={inputClass}
                />
              </Campo>

              <Campo label="Quantidade de ingressos">
                <div className="flex items-center justify-between rounded-xl border border-gray-300 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                    className={contadorClass}
                  >
                    -
                  </button>

                  <span className="text-xl font-bold text-gray-900">
                    {quantidade}
                  </span>

                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => q + 1)}
                    className={contadorClass}
                  >
                    +
                  </button>
                </div>
              </Campo>
            </div>
          </div>

          <aside className="rounded-2xl border border-[#dbe5db] bg-white p-5 shadow-md sm:p-6 lg:sticky lg:top-5">
            <h2 className="mb-5 text-2xl font-bold text-[#166534]">
              Resumo
            </h2>

            <div className="grid gap-3 text-gray-700">
              <p><strong>Produto:</strong> Ingresso Parque</p>
              <p><strong>Valor unitário:</strong> R$ 60,00</p>
              <p><strong>Quantidade:</strong> {quantidade}</p>
              <p><strong>Data da visita:</strong> {dataVisita || "Não informada"}</p>
            </div>

            <hr className="my-5 border-gray-200" />

            <p className="mb-5 text-3xl font-bold text-gray-950">
              Total: R$ {valorTotal},00
            </p>

            <button
              type="button"
              onClick={continuarParaResumo}
              disabled={salvando}
              className="w-full rounded-xl bg-[#15803d] px-5 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {salvando ? "Salvando pedido..." : "Continuar para pagamento"}
            </button>

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              O ingresso só será liberado após o pagamento ser confirmado.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-semibold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-4 text-base outline-none focus:border-[#166534]";

const contadorClass =
  "h-11 w-11 rounded-xl bg-[#166534] text-2xl font-bold text-white";