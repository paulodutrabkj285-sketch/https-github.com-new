"use client";

import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { criarPedido } from "@/lib/pedidos";

type TipoDocumento = "cpf" | "estrangeiro";

type TipoDocumentoEstrangeiro =
  | "identidade_nacional"
  | "passaporte"
  | "outro";

export default function IdosoPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");

  const [tipoDocumento, setTipoDocumento] =
    useState<TipoDocumento>("cpf");

  const [cpf, setCpf] = useState("");

  const [paisDocumento, setPaisDocumento] =
    useState("");

  const [
    tipoDocumentoEstrangeiro,
    setTipoDocumentoEstrangeiro,
  ] =
    useState<TipoDocumentoEstrangeiro>(
      "identidade_nacional"
    );

  const [
    documentoEstrangeiro,
    setDocumentoEstrangeiro,
  ] = useState("");

  const [telefone, setTelefone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [dataVisita, setDataVisita] =
    useState("");

  const [quantidade, setQuantidade] =
    useState(1);

  const [salvando, setSalvando] =
    useState(false);

  const valorUnitario = 30;

  const valorTotal = useMemo(() => {
    return quantidade * valorUnitario;
  }, [quantidade]);

  const valorTotalFormatado =
    valorTotal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const valorUnitarioFormatado =
    valorUnitario.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  function limparCpf(valor: string) {
    return valor.replace(/\D/g, "");
  }

  function normalizarDocumentoEstrangeiro(
    valor: string
  ) {
    return String(valor || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function normalizarPais(valor: string) {
    return String(valor || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function normalizarEmail(valor: string) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function emailTemFormatoValido(
    valor: string
  ) {
    const emailNormalizado =
      normalizarEmail(valor);

    const regexEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    return regexEmail.test(
      emailNormalizado
    );
  }

  function sugerirCorrecaoEmail(
    valor: string
  ) {
    const emailNormalizado =
      normalizarEmail(valor);

    const partes =
      emailNormalizado.split("@");

    if (partes.length !== 2) {
      return null;
    }

    const usuario = partes[0];
    const dominio = partes[1];

    const correcoes: Record<
      string,
      string
    > = {
      // Gmail
      "gmai.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gamil.com": "gmail.com",
      "gmail.con": "gmail.com",
      "gmail.co": "gmail.com",
      "gmail.cm": "gmail.com",
      "gmail.om": "gmail.com",
      "gmail.cim": "gmail.com",
      "gmail.comm": "gmail.com",
      "gmail.com.br": "gmail.com",

      // Hotmail
      "hotmai.com": "hotmail.com",
      "hotmal.com": "hotmail.com",
      "hotamil.com": "hotmail.com",
      "hotmail.con": "hotmail.com",
      "hotmail.co": "hotmail.com",
      "hotmail.cm": "hotmail.com",
      "hotmail.om": "hotmail.com",

      // Outlook
      "outlok.com": "outlook.com",
      "outloo.com": "outlook.com",
      "outlook.con": "outlook.com",
      "outlook.co": "outlook.com",
      "outlook.cm": "outlook.com",

      // Yahoo
      "yaho.com": "yahoo.com",
      "yahho.com": "yahoo.com",
      "yahoo.con": "yahoo.com",
      "yahoo.co": "yahoo.com",
      "yahoo.cm": "yahoo.com",

      // iCloud
      "iclod.com": "icloud.com",
      "icoud.com": "icloud.com",
      "icloud.con": "icloud.com",
      "icloud.co": "icloud.com",
      "icloud.cm": "icloud.com",
    };

    const dominioCorreto =
      correcoes[dominio];

    if (!dominioCorreto) {
      return null;
    }

    return `${usuario}@${dominioCorreto}`;
  }

  function nomeTipoDocumentoEstrangeiro() {
    if (
      tipoDocumentoEstrangeiro ===
      "passaporte"
    ) {
      return "Passaporte";
    }

    if (
      tipoDocumentoEstrangeiro ===
      "outro"
    ) {
      return "Outro documento oficial";
    }

    return "Documento nacional de identidade";
  }

  async function continuarParaResumo() {
    const nomeFinal =
      nome.trim();

    const cpfLimpo =
      limparCpf(cpf);

    const emailNormalizado =
      normalizarEmail(email);

    const paisFinal =
      normalizarPais(
        paisDocumento
      );

    const documentoFinal =
      tipoDocumento === "cpf"
        ? cpfLimpo
        : normalizarDocumentoEstrangeiro(
          documentoEstrangeiro
        );

    /*
     * CAMPOS GERAIS
     */
    if (
      !nomeFinal ||
      !telefone.trim() ||
      !emailNormalizado ||
      !dataVisita
    ) {
      alert(
        "Preencha todos os campos antes de continuar."
      );

      return;
    }

    /*
     * BRASILEIRO
     */
    if (
      tipoDocumento === "cpf"
    ) {
      if (!cpfLimpo) {
        alert(
          "Informe o CPF do comprador."
        );

        return;
      }

      if (
        cpfLimpo.length !== 11
      ) {
        alert(
          "CPF inválido. Digite os 11 números do CPF."
        );

        return;
      }
    }

    /*
     * ESTRANGEIRO
     */
    if (
      tipoDocumento ===
      "estrangeiro"
    ) {
      if (!paisFinal) {
        alert(
          "Informe o país de origem."
        );

        return;
      }

      if (!documentoFinal) {
        alert(
          "Informe o número do documento de identificação."
        );

        return;
      }

      if (
        documentoFinal.length < 3
      ) {
        alert(
          "Documento inválido. Confira o número informado."
        );

        return;
      }
    }

    /*
     * E-MAIL
     */
    if (
      !emailTemFormatoValido(
        emailNormalizado
      )
    ) {
      alert(
        "E-mail inválido.\n\nConfira o endereço informado antes de continuar."
      );

      return;
    }

    const emailSugerido =
      sugerirCorrecaoEmail(
        emailNormalizado
      );

    if (emailSugerido) {
      alert(
        `Confira seu e-mail antes de continuar.\n\n` +
        `Você informou:\n${emailNormalizado}\n\n` +
        `Você quis dizer:\n${emailSugerido}\n\n` +
        `Corrija o e-mail para continuar.`
      );

      setEmail(
        emailSugerido
      );

      return;
    }

    if (
      email !==
      emailNormalizado
    ) {
      setEmail(
        emailNormalizado
      );
    }

    try {
      setSalvando(true);

      const dadosPedido = {
        produto:
          "Meia Entrada Idoso",

        tipo:
          "idoso",

        nome:
          nomeFinal,

        /*
         * CPF somente para brasileiro.
         *
         * Para estrangeiro fica vazio.
         */
        cpf:
          tipoDocumento === "cpf"
            ? cpfLimpo
            : "",

        /*
         * Campo usado pelo sistema para
         * identificar brasileiro/estrangeiro.
         */
        tipoDocumento,

        /*
         * Documento principal do comprador.
         *
         * Brasileiro = CPF
         * Estrangeiro = documento informado
         */
        documento:
          documentoFinal,

        paisDocumento:
          tipoDocumento === "cpf"
            ? "Brasil"
            : paisFinal,

        /*
         * Informação complementar para
         * estrangeiros.
         */
        tipoDocumentoEstrangeiro:
          tipoDocumento ===
            "estrangeiro"
            ? tipoDocumentoEstrangeiro
            : "",

        telefone:
          telefone.trim(),

        email:
          emailNormalizado,

        dataVisita,

        quantidade,

        valorUnitario,

        valorTotal,

        statusPagamento:
          "pendente",

        statusOperacional:
          "ativo",

        pagbankCheckoutId:
          "",

        pagbankReferenceId:
          "",

        pagbankPayUrl:
          "",

        pagbankStatus:
          "",

        codigoIngresso:
          "",

        qrCodeIngresso:
          "",
      };

      const pedidoId =
        await criarPedido(
          dadosPedido
        );

      const params =
        new URLSearchParams({
          pedidoId,

          produto:
            "Meia Entrada Idoso",

          tipo:
            "idoso",

          nome:
            nomeFinal,

          cpf:
            tipoDocumento ===
              "cpf"
              ? cpfLimpo
              : "",

          tipoDocumento,

          documento:
            documentoFinal,

          paisDocumento:
            tipoDocumento ===
              "cpf"
              ? "Brasil"
              : paisFinal,

          tipoDocumentoEstrangeiro:
            tipoDocumento ===
              "estrangeiro"
              ? tipoDocumentoEstrangeiro
              : "",

          telefone:
            telefone.trim(),

          email:
            emailNormalizado,

          dataVisita,

          quantidade:
            String(
              quantidade
            ),

          valorUnitario:
            String(
              valorUnitario
            ),

          valorTotal:
            String(
              valorTotal
            ),
        });

      router.push(
        `/checkout/resumo?${params.toString()}`
      );
    } catch (error) {
      console.error(
        "Erro ao salvar pedido:",
        error
      );

      alert(
        "Não foi possível salvar o pedido."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 text-white"
      style={{
        backgroundImage:
          "url('/fotos/idoso-cachoeira.png')",
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
                Meia Entrada Idoso
              </h1>

              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/90 sm:text-xl">
                Preencha os dados abaixo para
                adquirir a meia entrada para
                idosos.
              </p>

              <p className="mt-3 text-sm text-white/80">
                O QR Code do ingresso será
                liberado após confirmação do
                pagamento.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-300/30 bg-white/10 p-4 text-sm font-semibold text-emerald-50">
                  🔒 Compra segura via Pix ou
                  cartão, com confirmação
                  automática.
                </div>

                <div className="rounded-2xl border border-emerald-300/30 bg-white/10 p-4 text-sm font-semibold text-emerald-50">
                  🌎 Visitantes estrangeiros
                  também podem comprar sem CPF
                  brasileiro.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl backdrop-blur-md">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Dados da compra
            </h2>

            <div className="mb-6 rounded-2xl border border-yellow-300 bg-yellow-100 p-4 text-sm leading-relaxed text-yellow-950">
              <p className="mb-2 font-black">
                📌 Informações importantes
              </p>

              <ul className="list-disc space-y-2 pl-5">
                <li>
                  A meia entrada é pessoal e
                  intransferível.
                </li>

                <li>
                  O documento utilizado para
                  comprovar o direito ao benefício
                  deverá estar no mesmo nome
                  informado na compra.
                </li>

                <li>
                  É obrigatória a apresentação de
                  documento oficial que permita
                  comprovar a idade do visitante
                  na entrada do parque.
                </li>

                <li>
                  Para visitante estrangeiro, o
                  documento pode ser nacional de
                  identidade, passaporte ou outro
                  documento oficial adequado para
                  identificação e comprovação da
                  idade.
                </li>

                <li>
                  Caso o benefício não possa ser
                  comprovado, será necessário
                  complementar o valor do ingresso
                  conforme a política vigente do
                  parque.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Campo label="Nome completo">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) =>
                    setNome(
                      e.target.value
                    )
                  }
                  placeholder="Digite seu nome"
                  autoComplete="name"
                  className={inputClass}
                />
              </Campo>

              <Campo label="Nacionalidade / documento">
                <select
                  value={
                    tipoDocumento
                  }
                  onChange={(e) => {
                    const novoTipo =
                      e.target
                        .value as TipoDocumento;

                    setTipoDocumento(
                      novoTipo
                    );

                    setCpf("");

                    setPaisDocumento("");

                    setDocumentoEstrangeiro(
                      ""
                    );

                    setTipoDocumentoEstrangeiro(
                      "identidade_nacional"
                    );
                  }}
                  className={
                    inputClass
                  }
                >
                  <option value="cpf">
                    Brasileiro — CPF
                  </option>

                  <option value="estrangeiro">
                    Estrangeiro — Documento de identificação
                  </option>
                </select>
              </Campo>

              {tipoDocumento ===
                "cpf" ? (
                <Campo label="CPF">
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) =>
                      setCpf(
                        e.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            11
                          )
                      )
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Digite os 11 números do CPF"
                    className={
                      inputClass
                    }
                  />
                </Campo>
              ) : (
                <>
                  <Campo label="País de origem">
                    <input
                      type="text"
                      value={
                        paisDocumento
                      }
                      onChange={(e) =>
                        setPaisDocumento(
                          e.target.value.slice(
                            0,
                            60
                          )
                        )
                      }
                      placeholder="Ex.: Argentina, Uruguai, Chile"
                      autoComplete="country-name"
                      className={
                        inputClass
                      }
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      Informe o país do documento
                      apresentado.
                    </p>
                  </Campo>

                  <Campo label="Tipo de documento">
                    <select
                      value={
                        tipoDocumentoEstrangeiro
                      }
                      onChange={(e) =>
                        setTipoDocumentoEstrangeiro(
                          e.target
                            .value as TipoDocumentoEstrangeiro
                        )
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="identidade_nacional">
                        Documento nacional de identidade
                      </option>

                      <option value="passaporte">
                        Passaporte
                      </option>

                      <option value="outro">
                        Outro documento oficial
                      </option>
                    </select>
                  </Campo>

                  <Campo label="Número do documento">
                    <input
                      type="text"
                      value={
                        documentoEstrangeiro
                      }
                      onChange={(e) =>
                        setDocumentoEstrangeiro(
                          e.target.value.slice(
                            0,
                            60
                          )
                        )
                      }
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="off"
                      placeholder="Digite o número do documento"
                      className={
                        inputClass
                      }
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      Digite exatamente como
                      aparece no documento. Letras,
                      números e hífens são aceitos.
                    </p>
                  </Campo>
                </>
              )}

              <Campo label="Telefone / WhatsApp">
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) =>
                    setTelefone(
                      e.target.value
                    )
                  }
                  placeholder={
                    tipoDocumento ===
                      "estrangeiro"
                      ? "Ex.: +54 9 11 1234-5678"
                      : "Digite seu telefone"
                  }
                  autoComplete="tel"
                  className={inputClass}
                />

                {tipoDocumento ===
                  "estrangeiro" && (
                    <p className="mt-2 text-xs text-gray-500">
                      Pode informar telefone
                      internacional com o código do
                      país.
                    </p>
                  )}
              </Campo>

              <Campo label="E-mail">
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value.toLowerCase()
                    )
                  }
                  onBlur={() =>
                    setEmail(
                      normalizarEmail(
                        email
                      )
                    )
                  }
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  className={inputClass}
                />

                <p className="mt-2 text-xs text-gray-500">
                  Confira o e-mail. O ingresso
                  também será enviado para este
                  endereço.
                </p>
              </Campo>

              <Campo label="Data da visita">
                <input
                  type="date"
                  value={dataVisita}
                  onChange={(e) =>
                    setDataVisita(
                      e.target.value
                    )
                  }
                  className={inputClass}
                />
              </Campo>

              <Campo label="Quantidade de ingressos">
                <div className="flex items-center justify-between rounded-2xl border border-gray-300 bg-white px-3 py-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantidade(
                        (q) =>
                          Math.max(
                            1,
                            q - 1
                          )
                      )
                    }
                    className={
                      contadorClass
                    }
                  >
                    -
                  </button>

                  <span className="text-2xl font-bold text-gray-900">
                    {quantidade}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantidade(
                        (q) =>
                          q + 1
                      )
                    }
                    className={
                      contadorClass
                    }
                  >
                    +
                  </button>
                </div>
              </Campo>
            </div>

            {tipoDocumento ===
              "estrangeiro" && (
                <div className="mt-6 rounded-2xl border border-cyan-300 bg-cyan-50 p-4 text-sm leading-relaxed text-cyan-950">
                  <p className="font-black">
                    🌎 Visitante estrangeiro
                  </p>

                  <p className="mt-2">
                    Não é necessário possuir CPF
                    brasileiro para realizar a
                    compra.
                  </p>

                  <p className="mt-2">
                    Informe um documento oficial que
                    permita sua identificação e a
                    comprovação da idade para o uso
                    da meia entrada.
                  </p>
                </div>
              )}
          </div>

          <aside className="rounded-3xl border border-white/20 bg-white/95 p-6 text-gray-900 shadow-2xl backdrop-blur-md lg:sticky lg:top-5">
            <h2 className="mb-6 text-3xl font-bold text-[#166534]">
              Resumo
            </h2>

            <div className="space-y-3 text-base">
              <p>
                <strong>
                  Produto:
                </strong>{" "}
                Meia Entrada Idoso
              </p>

              <p>
                <strong>
                  Valor unitário:
                </strong>{" "}
                {valorUnitarioFormatado}
              </p>

              <p>
                <strong>
                  Quantidade:
                </strong>{" "}
                {quantidade}
              </p>

              <p>
                <strong>
                  Data da visita:
                </strong>{" "}
                {dataVisita ||
                  "Não informada"}
              </p>

              <p>
                <strong>
                  Identificação:
                </strong>{" "}
                {tipoDocumento ===
                  "cpf"
                  ? "CPF brasileiro"
                  : nomeTipoDocumentoEstrangeiro()}
              </p>

              {tipoDocumento ===
                "estrangeiro" &&
                paisDocumento && (
                  <p>
                    <strong>
                      País:
                    </strong>{" "}
                    {paisDocumento}
                  </p>
                )}
            </div>

            <hr className="my-6 border-gray-300" />

            <p className="mb-6 text-4xl font-bold text-[#166534]">
              {valorTotalFormatado}
            </p>

            <button
              type="button"
              onClick={
                continuarParaResumo
              }
              disabled={salvando}
              className="w-full rounded-2xl bg-green-600 px-5 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {salvando
                ? "Salvando pedido..."
                : "Continuar para pagamento"}
            </button>

            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              O ingresso será liberado somente
              após confirmação automática do
              pagamento.
            </p>

            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Ao prosseguir com a compra, você
              declara estar ciente das regras de
              utilização, da política de
              cancelamento e das informações
              específicas do ingresso selecionado.
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
  children: ReactNode;
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