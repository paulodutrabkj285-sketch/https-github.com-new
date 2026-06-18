"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { criarPedido } from "@/lib/pedidos";

export default function CampingPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [diarias, setDiarias] = useState(1);
  const [quantidadePessoas, setQuantidadePessoas] = useState(1);
  const [tipoCamping, setTipoCamping] = useState("Barraca");
  const [salvando, setSalvando] = useState(false);

  const valorPrimeiraDiaria = 1,00;
  const valorDemaisDiarias = 1,00;

  const valorPorPessoa = useMemo(() => {
    if (diarias <= 1) return valorPrimeiraDiaria;
    return valorPrimeiraDiaria + (diarias - 1) * valorDemaisDiarias;
  }, [diarias]);

  const valorTotal = useMemo(() => {
    return valorPorPessoa * quantidadePessoas;
  }, [valorPorPessoa, quantidadePessoas]);

  function limparCpf(valor: string) {
    return valor.replace(/\D/g, "");
  }

  async function continuarParaResumo() {
    const cpfLimpo = limparCpf(cpf);

    if (!nome || !cpfLimpo || !telefone || !email || !dataEntrada) {
      alert("Preencha todos os campos antes de continuar.");
      return;
    }

    if (cpfLimpo.length !== 11) {
      alert("CPF inválido. Digite os 11 números do CPF.");
      return;
    }

    try {
      setSalvando(true);

      const pedidoId = await criarPedido({
        produto: "Camping",
        tipo: "camping",
        nome,
        cpf: cpfLimpo,
        telefone,
        email,
        dataEntrada,
        noites: diarias,
        quantidadePessoas,
        quantidade: 1,
        valorUnitario: valorPorPessoa,
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
        produto: "Camping",
        tipo: "camping",
        nome,
        cpf: cpfLimpo,
        telefone,
        email,
        dataEntrada,
        diarias: String(diarias),
        noites: String(diarias),
        quantidadePessoas: String(quantidadePessoas),
        tipoCamping,
        quantidade: "1",
        valorUnitario: String(valorPorPessoa),
        valorTotal: String(valorTotal),
      });

      router.push(`/checkout/resumo?${params.toString()}`);
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Não foi possível salvar o pedido.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 text-white"
      style={{
        backgroundImage: "url('/fotos/camping.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <section className="rounded-3xl border border-white/20 bg-emerald-950/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <div className="flex w-full max-w-[180px] items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-4">
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                className="w-full max-w-[140px] rounded-xl"
              />
            </div>

            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg sm:text-5xl">
                Camping
              </h1>

              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/90 sm:text-xl">
                Reserve sua experiência de camping no Parque Mundo Novo.
              </p>

              <p className="mt-3 text-sm text-white/80">
                O QR Code da reserva será liberado após confirmação do pagamento.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl backdrop-blur-md">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Dados da reserva
            </h2>

            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-100 p-4 text-sm leading-relaxed text-gray-700">
              Incluso: ingresso 24h por pessoa, banheiro com chuveiro quente,
              área de churrasqueira, acesso às áreas inclusas do parque e
              carregador para carro elétrico.
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

              <Campo label="Data de entrada">
                <input
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                  className={inputClass}
                />
              </Campo>

              <Campo label="Tipo de camping">
                <select
                  value={tipoCamping}
                  onChange={(e) => setTipoCamping(e.target.value)}
                  className={inputClass}
                >
                  <option>Barraca</option>
                  <option>Motorhome</option>
                </select>
              </Campo>

              <Campo label="Quantidade de pessoas">
                <div className="flex items-center justify-between rounded-2xl border border-gray-300 bg-white px-3 py-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantidadePessoas((q) => Math.max(1, q - 1))
                    }
                    className={contadorClass}
                  >
                    -
                  </button>

                  <span className="text-2xl font-bold text-gray-900">
                    {quantidadePessoas}
                  </span>

                  <button
                    type="button"
                    onClick={() => setQuantidadePessoas((q) => q + 1)}
                    className={contadorClass}
                  >
                    +
                  </button>
                </div>
              </Campo>

              <Campo label="Quantidade de diárias">
                <div className="flex items-center justify-between rounded-2xl border border-gray-300 bg-white px-3 py-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setDiarias((q) => Math.max(1, q - 1))}
                    className={contadorClass}
                  >
                    -
                  </button>

                  <span className="text-2xl font-bold text-gray-900">
                    {diarias}
                  </span>

                  <button
                    type="button"
                    onClick={() => setDiarias((q) => q + 1)}
                    className={contadorClass}
                  >
                    +
                  </button>
                </div>
              </Campo>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl backdrop-blur-md lg:sticky lg:top-5">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Resumo
            </h2>

            <div className="space-y-3 text-base">
              <p>
                <strong>Produto:</strong> Camping
              </p>

              <p>
                <strong>Tipo:</strong> {tipoCamping}
              </p>

              <p>
                <strong>Entrada:</strong> {dataEntrada || "Não informada"}
              </p>

              <p>
                <strong>Pessoas:</strong> {quantidadePessoas}
              </p>

              <p>
                <strong>Diárias:</strong> {diarias}
              </p>

              <p>
                <strong>Valor por pessoa:</strong> R$ {valorPorPessoa},00
              </p>

              <p className="text-sm text-gray-500">
                1ª diária R$ 100,00 + demais R$ 80,00 por pessoa.
              </p>
            </div>

            <hr className="my-6 border-gray-300" />

            <p className="mb-6 text-4xl font-bold text-[#166534]">
              R$ {valorTotal},00
            </p>

            <button
              type="button"
              onClick={continuarParaResumo}
              disabled={salvando}
              className="w-full rounded-2xl bg-green-600 px-5 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {salvando
                ? "Salvando pedido..."
                : "Continuar para pagamento"}
            </button>

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              A reserva será liberada somente após confirmação automática do pagamento.
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
  "w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 text-base outline-none transition focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20";

const contadorClass =
  "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#166534] text-2xl font-bold text-white transition hover:bg-[#14532d]";