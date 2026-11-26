"use client";



import { corrigirEmailPedidoAdmin, buscarPedidoPorIdAdmin, cancelarIngressoAdministrativo, pedidoReembolsado, pedidoPermiteRegistroReembolso, registrarPagamentoComprovadoAdministrativo, registrarReembolsoAdministrativo, registrarUtilizacaoAdministrativa, Pedido } from "@/lib/pedidos";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { QRCodeSVG } from "qrcode.react";

import { useParams, useRouter } from "next/navigation";

import { useEffect, useState } from "react";



export default function PedidoDetalhePage() {

  const params = useParams();

  const router = useRouter();



  const pedidoId = String(params.id || "");



  const [pedido, setPedido] = useState<Pedido | null>(null);

  const [carregando, setCarregando] = useState(true);

  const [reenviando, setReenviando] = useState(false);
  const [sessaoAtiva, setSessaoAtiva] = useState(false);
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [mensagemEmail, setMensagemEmail] = useState("");
  const [erroEmail, setErroEmail] = useState("");

  useEffect(() => onAuthStateChanged(getAuth(), (usuario) => {
    setSessaoAtiva(Boolean(usuario));
    if (!usuario) setEditandoEmail(false);
  }), []);
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);
  const [referenciaPagamento, setReferenciaPagamento] = useState("");
  const [ultimosDigitosPagamento, setUltimosDigitosPagamento] = useState("");
  const [dataHoraPagamento, setDataHoraPagamento] = useState("");
  const [observacaoPagamento, setObservacaoPagamento] = useState("");
  const [registrandoVisita, setRegistrandoVisita] = useState(false);
  const [dataHoraVisita, setDataHoraVisita] = useState("");
  const [observacaoVisita, setObservacaoVisita] = useState("");



  useEffect(() => {

    async function carregarPedido() {

      try {

        if (!pedidoId) return;



        const dados = await buscarPedidoPorIdAdmin(pedidoId);

        setPedido(dados);

      } catch (error) {

        console.error("Erro ao buscar pedido:", error);

      } finally {

        setCarregando(false);

      }

    }



    carregarPedido();

  }, [pedidoId]);



  function formatarMoeda(valor?: number) {

    return Number(valor || 0).toLocaleString("pt-BR", {

      style: "currency",

      currency: "BRL",

    });

  }



  function formatarDataHora(valor?: string) {

    if (!valor) return "-";



    return new Date(valor).toLocaleString("pt-BR", {

      day: "2-digit",

      month: "2-digit",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit",

    });

  }



  function formatarData(valor?: string) {

    if (!valor) return "-";



    const partes = valor.split("-");

    if (partes.length === 3) {

      return `${partes[2]}/${partes[1]}/${partes[0]}`;

    }



    return valor;

  }



  async function salvarEmail() {
    if (!pedido || salvandoEmail || reenviando || !sessaoAtiva) return;
    setErroEmail("");
    setMensagemEmail("");
    const email = novoEmail.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[<>;,]/.test(email)) {
      setErroEmail("Informe um endereço de e-mail válido.");
      return;
    }
    if (!window.confirm(`Salvar o novo e-mail do cliente?\n\n${email}\n\nConfira o endereço com o cliente antes de confirmar.`)) return;
    setSalvandoEmail(true);
    try {
      const dados = await corrigirEmailPedidoAdmin(pedido.id, pedido.email || "", email);
      setPedido((atual) => atual?.id === pedido.id ? { ...atual, ...dados } : atual);
      setEditandoEmail(false);
      setMensagemEmail("E-mail atualizado. Use Reenviar Ingresso para enviar ao novo endereço.");
    } catch (erro) {
      setErroEmail(erro instanceof Error ? erro.message : "Não foi possível salvar o e-mail.");
    } finally {
      setSalvandoEmail(false);
    }
  }

  async function reenviarIngresso() {

    if (!pedido || editandoEmail || salvandoEmail || reenviando) return;
    if (!pedido.email?.trim()) { alert("Cadastre um e-mail antes de reenviar."); return; }
    if (!window.confirm(`Reenviar o ingresso para:\n\n${pedido.email}?`)) return;



    try {

      setReenviando(true);



      const resposta = await fetch("/api/reenviar-ingresso", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          pedidoId: pedido.id,
          emailEsperado: pedido.email,

        }),

      });



      const dados = await resposta.json();



      if (!resposta.ok || !dados.ok) {

        alert(dados.error || "Não foi possível reenviar o ingresso.");

        return;

      }



      alert(`Ingresso reenviado com sucesso para ${pedido.email}.`);

    } catch (error) {

      console.error("Erro ao reenviar ingresso:", error);

      alert("Não foi possível reenviar o ingresso.");

    } finally {

      setReenviando(false);

    }

  }



  async function cancelarIngresso() {
    if (!pedido || cancelando) return;
    const motivo = motivoCancelamento.trim();
    if (motivo.length < 5) { alert("Informe o motivo do cancelamento (mínimo 5 caracteres)."); return; }
    if (!window.confirm(`Cancelar e bloquear definitivamente o ingresso ${pedido.codigoIngresso || pedido.id}? Esta ação NÃO realiza reembolso.`)) return;
    setCancelando(true);
    try {
      const usuario = getAuth().currentUser;
      if (!usuario) throw new Error("Faça login no painel administrativo novamente.");
      await cancelarIngressoAdministrativo(pedido.id, motivo, usuario.email || usuario.uid);
      const atualizado = await buscarPedidoPorIdAdmin(pedido.id);
      setPedido(atualizado);
      alert("Ingresso cancelado e bloqueado no Firebase. Confira a sincronização dos aparelhos da portaria.");
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao cancelar ingresso.");
    } finally { setCancelando(false); }
  }

  async function registrarReembolso() {
    if (!pedido || cancelando) return;
    const motivo = motivoCancelamento.trim();
    if (!window.confirm("Confirma que o reembolso já foi concluído? O registro bloqueia todos os acessos deste pedido.")) return;

    setCancelando(true);
    try {
      const usuario = getAuth().currentUser;
      if (!usuario) throw new Error("Faça login no painel administrativo novamente.");
      const bloqueio = await registrarReembolsoAdministrativo(pedido.id, motivo, usuario.email || usuario.uid);
      setPedido((atual) => atual?.id === pedido.id ? { ...atual, ...bloqueio } : atual);
      setMotivoCancelamento("");
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao registrar reembolso.");
    } finally {
      setCancelando(false);
    }
  }

  async function confirmarPagamentoComprovado() {
    if (!pedido || confirmandoPagamento) return;

    const referencia = referenciaPagamento.trim();
    const finalCartao = ultimosDigitosPagamento.replace(/\D/g, "");
    const observacao = observacaoPagamento.trim();

    if (referencia.length < 6) { alert("Informe a referência bancária da venda."); return; }
    if (!/^\d{4}$/.test(finalCartao)) { alert("Informe os 4 últimos dígitos do cartão."); return; }
    if (!dataHoraPagamento) { alert("Informe a data e hora exibidas no comprovante."); return; }
    if (observacao.length < 5) { alert("Informe uma observação com pelo menos 5 caracteres."); return; }

    const dataLocal = new Date(dataHoraPagamento);
    if (!Number.isFinite(dataLocal.getTime())) { alert("Data/hora do comprovante inválida."); return; }

    if (!window.confirm(
      `Confirmar manualmente o pagamento de ${formatarMoeda(pedido.valorTotal)} do pedido ${pedido.id}?\n\n` +
      `Cartão final ${finalCartao}\nReferência: ${referencia}\nData: ${dataLocal.toLocaleString("pt-BR")}\n\n` +
      "Use somente quando o pagamento estiver comprovado no banco do parque."
    )) return;

    setConfirmandoPagamento(true);
    try {
      const usuario = getAuth().currentUser;
      if (!usuario) throw new Error("Faça login no painel administrativo novamente.");

      await registrarPagamentoComprovadoAdministrativo({
        pedidoId: pedido.id,
        responsavel: usuario.email || usuario.uid,
        referenciaBancaria: referencia,
        comprovadoEm: dataLocal.toISOString(),
        ultimosDigitosCartao: finalCartao,
        observacao,
      });

      const atualizado = await buscarPedidoPorIdAdmin(pedido.id);
      setPedido(atualizado);

      const resposta = await fetch("/api/reenviar-ingresso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: pedido.id }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (resposta.ok && dados.ok) {
        alert("Pagamento confirmado. Pedido ativado e ingresso enviado por e-mail.");
      } else {
        alert(
          "Pagamento confirmado e pedido ativado, mas o e-mail não foi enviado. Use o botão Reenviar Ingresso."
        );
      }
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao confirmar o pagamento.");
    } finally {
      setConfirmandoPagamento(false);
    }
  }

  async function registrarVisitaJaRealizada() {
    if (!pedido || registrandoVisita) return;
    const observacao = observacaoVisita.trim();
    if (!dataHoraVisita) { alert("Informe a data e hora em que o cliente esteve no parque."); return; }
    if (observacao.length < 5) { alert("Informe uma observação com pelo menos 5 caracteres."); return; }

    const dataLocal = new Date(dataHoraVisita);
    if (!Number.isFinite(dataLocal.getTime())) { alert("Data/hora inválida."); return; }

    if (!window.confirm(
      `Registrar o pedido ${pedido.codigoIngresso || pedido.id} como UTILIZADO em ${dataLocal.toLocaleString("pt-BR")}?\n\n` +
      "Use esta opção somente quando o cliente realmente já esteve no parque."
    )) return;

    setRegistrandoVisita(true);
    try {
      const usuario = getAuth().currentUser;
      if (!usuario) throw new Error("Faça login no painel administrativo novamente.");

      const atualizacao = await registrarUtilizacaoAdministrativa({
        pedidoId: pedido.id,
        responsavel: usuario.email || usuario.uid,
        utilizadoEm: dataLocal.toISOString(),
        motivo: observacao,
      });

      setPedido((atual) => atual?.id === pedido.id ? { ...atual, ...atualizacao } as Pedido : atual);
      setDataHoraVisita("");
      setObservacaoVisita("");
      alert("Visita registrada. O ingresso agora consta como utilizado.");
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Erro ao registrar a visita.");
    } finally {
      setRegistrandoVisita(false);
    }
  }

  const pedidoAny = pedido as

    | (Pedido & {

      validadoPor?: string;

      validadoEm?: string;

      utilizadoEm?: string;

      pagoEm?: string;

      dataPagamento?: string;

      pdfIngressoUrl?: string;
      pagamentoConfirmadoManualmente?: boolean;
      pagamentoConfirmadoManualmenteEm?: string;
      pagamentoConfirmadoManualmentePor?: string;
      pagamentoConfirmadoManualmenteMotivo?: string;
      cartaoReferenciaBancaria?: string;
      cartaoUltimosDigitos?: string;
      pagamentoConfirmadoEm?: string;
      validacaoAdministrativa?: boolean;
      validacaoAdministrativaEm?: string;
      validacaoAdministrativaPor?: string;
      validacaoAdministrativaMotivo?: string;

    })

    | null;



  if (carregando) {

    return (

      <main className="min-h-screen bg-[#eef3ed] px-4 py-8">

        <div className="mx-auto max-w-5xl">

          <p>Carregando pedido...</p>

        </div>

      </main>

    );

  }



  if (!pedido) {

    return (

      <main className="min-h-screen bg-[#eef3ed] px-4 py-8">

        <div className="mx-auto max-w-5xl">

          <button

            onClick={() => router.push("/admin/pedidos")}

            className="mb-6 rounded-xl bg-green-700 px-5 py-3 font-bold text-white"

          >

            Voltar

          </button>



          <div className="rounded-2xl bg-white p-6 shadow">

            <h1 className="text-2xl font-bold text-red-700">

              Pedido não encontrado

            </h1>

          </div>

        </div>

      </main>

    );

  }



  const reembolsado = pedidoReembolsado(pedido);
  const statusOperacional = reembolsado ? "bloqueado" : pedido.statusOperacional || "ativo";
  const podeRegistrarReembolso = pedidoPermiteRegistroReembolso(pedido) &&
    (!reembolsado || pedido.statusOperacional !== "bloqueado");
  const podeCancelar = !["cancelado", "bloqueado"].includes(statusOperacional.toLowerCase());

  const statusPagamentoExibido = reembolsado ? "Reembolsado" : pedido.statusPagamento;
  const statusOperacionalExibido = statusOperacional === "bloqueado" ? "Bloqueado" : statusOperacional;
  const statusPagamentoPago = pedido.statusPagamento === "pago";
  const statusPagamentoAtual = String(pedido.statusPagamento || "pendente").toLowerCase();
  const podeConfirmarPagamentoComprovado =
    ["pendente", "expirado"].includes(statusPagamentoAtual) &&
    !reembolsado &&
    !["cancelado", "bloqueado", "utilizado"].includes(String(statusOperacional).toLowerCase()) &&
    pedido.origem !== "parceiro" && !pedido.reservaAgenciaId && !pedido.agenciaId && pedido.cortesia !== true;

  const statusUtilizado = pedido.statusOperacional === "utilizado";
  const podeRegistrarVisitaJaRealizada =
    pedido.statusPagamento === "pago" &&
    !reembolsado &&
    !statusUtilizado &&
    !pedido.utilizadoEm &&
    !pedido.validadoEm &&
    !["cancelado", "bloqueado"].includes(String(statusOperacional).toLowerCase());

  const temElevador = Boolean(
    pedido.codigoIngressoElevador || pedido.qrCodeIngressoElevador ||
    pedido.quantidadeElevador || pedido.qtdElevador || pedido.elevador ||
    pedido.tipo === "elevador" ||
    pedido.itensCarrinho?.some((item) => item.tipo === "elevador")
  );
  const temParque = pedido.tipo !== "elevador" || Boolean(
    pedido.codigoIngressoParque || pedido.quantidadeParque ||
    pedido.itensCarrinho?.some((item) => item.tipo === "parque")
  );
  // O código legado pertence somente ao Parque; nunca substitui o do Elevador.
  const codigoParque = pedido.codigoIngressoParque || pedido.codigoIngresso;
  const qrParque = pedido.qrCodeIngressoParque || pedido.qrCodeIngresso || codigoParque;
  const qrElevador = pedido.qrCodeIngressoElevador || pedido.codigoIngressoElevador;




  return (

    <main className="min-h-screen bg-[#eef3ed] px-4 py-8">

      <div className="mx-auto max-w-6xl">

        <button

          onClick={() => router.push("/admin/pedidos")}

          className="mb-6 rounded-xl bg-green-700 px-5 py-3 font-bold text-white"

        >

          ← Voltar para pedidos

        </button>



        <section className="rounded-3xl bg-white p-6 shadow-xl">

          <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">

            <div>

              <h1 className="text-3xl font-black text-[#166534]">

                Detalhe do Pedido

              </h1>



              <p className="text-sm text-gray-500">ID: {pedido.id}</p>

            </div>



            <div className="flex flex-wrap gap-2">

              <span

                className={`rounded-full px-4 py-2 text-sm font-black ${statusPagamentoPago

                  ? "bg-green-100 text-green-800"

                  : reembolsado ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"

                  }`}

              >

                Pagamento: {statusPagamentoExibido || "pendente"}

              </span>



              <span

                className={`rounded-full px-4 py-2 text-sm font-black ${(statusUtilizado || statusOperacional === "bloqueado")

                  ? "bg-red-100 text-red-800"

                  : "bg-blue-100 text-blue-800"

                  }`}

              >

                Operacional: {statusOperacionalExibido}

              </span>

            </div>

          </div>



          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            <Bloco titulo="Dados do Cliente">

              <Linha label="Nome" valor={pedido.nome} />

              <Linha label="CPF" valor={pedido.cpf} />

              <Linha label="Telefone" valor={pedido.telefone} />

              <Linha label="E-mail" valor={pedido.email} />
              {sessaoAtiva && !editandoEmail && (
                <button type="button" disabled={reenviando || salvandoEmail}
                  className="mt-3 rounded-lg border border-green-700 px-4 py-2 text-sm font-bold text-green-700 disabled:opacity-50"
                  onClick={() => { setNovoEmail(pedido.email || ""); setErroEmail(""); setMensagemEmail(""); setEditandoEmail(true); }}>
                  ✎ Editar e-mail
                </button>
              )}
              {sessaoAtiva && editandoEmail && (
                <div className="mt-3 space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Novo e-mail do cliente
                    <input type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false}
                      maxLength={254} disabled={salvandoEmail}
                      className="mt-1 w-full min-w-0 rounded-xl border border-gray-300 p-3 text-gray-900"
                      value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={salvandoEmail} onClick={salvarEmail}
                      className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-50">
                      {salvandoEmail ? "Salvando..." : "Salvar e-mail"}
                    </button>
                    <button type="button" disabled={salvandoEmail}
                      onClick={() => { setEditandoEmail(false); setErroEmail(""); }}
                      className="rounded-lg border px-4 py-2 text-gray-700">Cancelar</button>
                  </div>
                </div>
              )}
              {erroEmail && <p role="alert" className="mt-2 text-sm text-red-700">{erroEmail}</p>}
              {mensagemEmail && <p role="status" className="mt-2 text-sm text-green-700">{mensagemEmail}</p>}

            </Bloco>



            <Bloco titulo="Dados da Compra">

              <Linha label="Produto" valor={pedido.produto} />

              <Linha label="Tipo" valor={pedido.tipo} />

              <Linha label="Quantidade" valor={pedido.quantidade} />

              <Linha

                label="Valor unitário"

                valor={formatarMoeda(pedido.valorUnitario)}

              />

              <Linha

                label="Valor total"

                valor={formatarMoeda(pedido.valorTotal)}

              />

              <Linha

                label="Data da visita"

                valor={formatarData(pedido.dataVisita)}

              />

            </Bloco>



            <Bloco titulo="Pagamento">

              <Linha label="Status" valor={statusPagamentoExibido || "-"} />

              <Linha

                label="Valor pago"

                valor={formatarMoeda(pedido.valorPago)}

              />

              <Linha label="TXID Sicredi" valor={pedido.sicrediTxid || "-"} />

              <Linha

                label="Status Sicredi"

                valor={pedido.sicrediStatus || "-"}

              />

              <Linha

                label="Data do pagamento"

                valor={formatarDataHora(

                  pedidoAny?.pagamentoConfirmadoEm || pedidoAny?.pagoEm || pedidoAny?.dataPagamento

                )}

              />

              {pedidoAny?.pagamentoConfirmadoManualmente && (
                <>
                  <Linha label="Confirmação" valor="Manual — comprovada no banco" />
                  <Linha label="Referência bancária" valor={pedidoAny?.cartaoReferenciaBancaria || "-"} />
                  <Linha label="Cartão final" valor={pedidoAny?.cartaoUltimosDigitos || "-"} />
                  <Linha label="Confirmado por" valor={pedidoAny?.pagamentoConfirmadoManualmentePor || "-"} />
                  <Linha label="Registro administrativo" valor={formatarDataHora(pedidoAny?.pagamentoConfirmadoManualmenteEm)} />
                  <Linha label="Observação" valor={pedidoAny?.pagamentoConfirmadoManualmenteMotivo || "-"} />
                </>
              )}

            </Bloco>



            <Bloco titulo="Portaria">

              <Linha

                label="Status"

                valor={statusOperacionalExibido}

              />

              <Linha

                label="Funcionário"

                valor={pedidoAny?.validadoPor || "-"}

              />

              <Linha

                label="Validado em"

                valor={formatarDataHora(pedidoAny?.validadoEm)}

              />

              <Linha

                label="Utilizado em"

                valor={formatarDataHora(pedidoAny?.utilizadoEm)}

              />

            </Bloco>

          </div>



          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            {temParque && (
              <Bloco titulo="PARQUE">
                <Linha label="Código Parque" valor={codigoParque} />
                <Linha label="Quantidade Parque" valor={pedido.quantidadeParque ?? pedido.quantidade} />
                <Linha label="Status do Parque" valor={statusOperacionalExibido} />
                <Linha label="Validação do Parque" valor={
                  pedido.validadoEm || pedido.utilizadoEm || statusUtilizado
                    ? "Validado" : "Ainda não validado"
                } />
                <Linha label="Funcionário" valor={pedido.validadoPor} />
                <Linha label="Validado em" valor={formatarDataHora(pedido.validadoEm)} />
                <Linha label="Utilizado em" valor={formatarDataHora(pedido.utilizadoEm)} />
                <QrIngresso titulo="QR Code do Parque" conteudo={qrParque} />
              </Bloco>
            )}

            {temElevador && (
              <Bloco titulo="ELEVADOR">
                <Linha label="Código Elevador" valor={pedido.codigoIngressoElevador} />
                <Linha label="Quantidade Elevador" valor={pedido.quantidadeElevador ?? pedido.qtdElevador} />
                {reembolsado && <Linha label="Status do Elevador" valor="Bloqueado" />}
                <Linha label="Validado (elevadorValidado)" valor={
                  pedido.elevadorValidado === undefined ? "Não informado" :
                    pedido.elevadorValidado ? "Sim" : "Não"
                } />
                <Linha label="Quantidade validada" valor={pedido.elevadorQuantidadeValidada} />
                {pedido.elevadorValidadoPor && (
                  <Linha label="Funcionário" valor={pedido.elevadorValidadoPor} />
                )}
                {pedido.elevadorValidadoEm && (
                  <Linha label="Validado em" valor={formatarDataHora(pedido.elevadorValidadoEm)} />
                )}
                <QrIngresso titulo="QR Code do Elevador" conteudo={qrElevador} />
              </Bloco>
            )}

            <Bloco titulo="PDF / Ingresso">

              <div className="space-y-4">

                <p className="text-gray-600">

                  O PDF do ingresso é enviado automaticamente por e-mail após o

                  pagamento confirmado.

                </p>



                <div className="flex flex-wrap gap-3">

                  <button

                    onClick={reenviarIngresso}

                    disabled={reenviando || editandoEmail || salvandoEmail}

                    className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"

                  >

                    {reenviando ? "Reenviando..." : "📧 Reenviar Ingresso"}

                  </button>



                  {pedidoAny?.pdfIngressoUrl && (

                    <a

                      href={pedidoAny.pdfIngressoUrl}

                      target="_blank"

                      className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white"

                    >

                      📄 Baixar PDF

                    </a>

                  )}

                </div>



                {pedidoAny?.pdfIngressoUrl ? (

                  <a

                    href={pedidoAny.pdfIngressoUrl}

                    target="_blank"

                    className="inline-block rounded-xl bg-green-700 px-5 py-3 font-bold text-white"

                  >

                    Abrir PDF do ingresso

                  </a>

                ) : (

                  <div className="rounded-xl bg-yellow-50 p-4 text-yellow-800">

                    Nenhum link de PDF salvo no pedido até o momento.

                  </div>

                )}

              </div>

            </Bloco>

          </div>



          {podeConfirmarPagamentoComprovado && (
            <Bloco titulo="Confirmar pagamento comprovado" extraClass="mt-6">
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  Use somente quando a venda estiver comprovada no banco do parque. O valor será o valor original do pedido:
                  <strong> {formatarMoeda(pedido.valorTotal)}</strong>.
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold text-gray-700">
                    Referência bancária
                    <input
                      className="mt-1 w-full rounded-xl border p-3 font-normal text-gray-900"
                      value={referenciaPagamento}
                      onChange={(e) => setReferenciaPagamento(e.target.value)}
                      placeholder="Código/referência exibido no Sicredi"
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    4 últimos dígitos do cartão
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      className="mt-1 w-full rounded-xl border p-3 font-normal text-gray-900"
                      value={ultimosDigitosPagamento}
                      onChange={(e) => setUltimosDigitosPagamento(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="0000"
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700">
                    Data e hora do comprovante
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border p-3 font-normal text-gray-900"
                      value={dataHoraPagamento}
                      onChange={(e) => setDataHoraPagamento(e.target.value)}
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700 md:col-span-2">
                    Observação
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-xl border p-3 font-normal text-gray-900"
                      value={observacaoPagamento}
                      onChange={(e) => setObservacaoPagamento(e.target.value)}
                      placeholder="Ex.: pagamento confirmado no extrato Sicredi do parque"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={confirmarPagamentoComprovado}
                  disabled={confirmandoPagamento}
                  className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {confirmandoPagamento ? "Confirmando..." : "✓ Confirmar pagamento e enviar ingresso"}
                </button>
              </div>
            </Bloco>
          )}

          {podeRegistrarVisitaJaRealizada && (
            <Bloco titulo="Registrar visita já realizada" extraClass="mt-6">
              <div className="space-y-4">
                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                  Use somente quando o cliente realmente já esteve no parque e a entrada não foi registrada no sistema.
                  Esta ação não altera o pagamento e não libera uma nova entrada.
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold text-gray-700">
                    Data e hora da visita
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border p-3 font-normal text-gray-900"
                      value={dataHoraVisita}
                      onChange={(e) => setDataHoraVisita(e.target.value)}
                    />
                  </label>

                  <label className="text-sm font-bold text-gray-700 md:col-span-2">
                    Observação
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-xl border p-3 font-normal text-gray-900"
                      value={observacaoVisita}
                      onChange={(e) => setObservacaoVisita(e.target.value)}
                      placeholder="Ex.: cliente já esteve no parque e a entrada não foi registrada na portaria"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={registrarVisitaJaRealizada}
                  disabled={registrandoVisita}
                  className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {registrandoVisita ? "Registrando..." : "✓ Registrar como utilizado"}
                </button>
              </div>
            </Bloco>
          )}

          <Bloco titulo="Cancelamento / bloqueio" extraClass="mt-6">
            {!podeCancelar && (
              <div className="rounded-xl bg-red-50 p-4 text-red-800">
                <strong>{reembolsado ? "REEMBOLSADO · INGRESSO BLOQUEADO" : "INGRESSO BLOQUEADO"}</strong>
                <p>Motivo: {String((pedido as Pedido & { motivoCancelamento?: string }).motivoCancelamento || "Não informado")}</p>
                <p>{reembolsado ? "Bloqueio registrado em" : "Cancelado em"}: {formatarDataHora((pedido as Pedido & { canceladoEm?: string }).canceladoEm)}</p>
              </div>
            )}
            {(podeCancelar || podeRegistrarReembolso) && (
              <div className="space-y-3">
                {podeCancelar && (
                  <p className="text-sm text-gray-700">Cancela o acesso pelo QR Code, sem efetuar reembolso ou apagar o pagamento.</p>
                )}
                <textarea className="w-full rounded-xl border p-3 text-gray-900" rows={3}
                  aria-label="Motivo do bloqueio"
                  placeholder="Motivo obrigatório"
                  value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} />
                <div className="flex flex-wrap gap-3">
                  {podeCancelar && (
                    <button type="button" onClick={cancelarIngresso}
                      disabled={cancelando || motivoCancelamento.trim().length < 5}
                      className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-50">
                      {cancelando ? "Registrando..." : "Cancelar / Bloquear ingresso"}
                    </button>
                  )}
                  {podeRegistrarReembolso && (
                    <button type="button" onClick={registrarReembolso}
                      disabled={cancelando || motivoCancelamento.trim().length < 5}
                      className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-50">
                      {cancelando ? "Registrando..." : "Registrar reembolso concluído"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </Bloco>

          <Bloco titulo="Histórico" extraClass="mt-6">

            <div className="grid gap-3">

              <HistoricoItem

                titulo="Pedido criado"

                valor={formatarDataHora(pedido.createdAt)}

              />

              <HistoricoItem

                titulo="Última atualização"

                valor={formatarDataHora(pedido.updatedAt)}

              />

              <HistoricoItem

                titulo="Pagamento"

                valor={

                  statusPagamentoPago

                    ? `Confirmado ${formatarDataHora(

                      pedidoAny?.pagamentoConfirmadoEm || pedidoAny?.pagoEm || pedidoAny?.dataPagamento

                    )}`

                    : "Pendente"

                }

              />

              <HistoricoItem

                titulo="Entrada"

                valor={

                  statusUtilizado

                    ? `Utilizado em ${formatarDataHora(

                      pedidoAny?.utilizadoEm

                    )}`

                    : "Ainda não utilizado"

                }

              />

              {pedidoAny?.validacaoAdministrativa && (
                <HistoricoItem
                  titulo="Registro administrativo"
                  valor={`${pedidoAny.validacaoAdministrativaPor || "Administrador"} · ${pedidoAny.validacaoAdministrativaMotivo || "Visita registrada manualmente"}`}
                />
              )}

            </div>

          </Bloco>

        </section>

      </div>

    </main>

  );

}



function Bloco({

  titulo,

  children,

  extraClass = "",

}: {

  titulo: string;

  children: React.ReactNode;

  extraClass?: string;

}) {

  return (

    <section

      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${extraClass}`}

    >

      <h2 className="mb-4 text-xl font-black text-[#166534]">{titulo}</h2>

      {children}

    </section>

  );

}



function Linha({

  label,

  valor,

}: {

  label: string;

  valor: string | number | undefined | null;

}) {

  return (

    <div className="border-b border-gray-100 py-2">

      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>

      <p className="break-words text-base font-semibold text-gray-900">

        {valor ?? "-"}

      </p>

    </div>

  );

}



function HistoricoItem({ titulo, valor }: { titulo: string; valor: string }) {

  return (

    <div className="rounded-xl bg-gray-50 p-4">

      <p className="text-sm font-bold text-gray-500">{titulo}</p>

      <p className="mt-1 font-semibold text-gray-900">{valor}</p>

    </div>

  );

}

function QrIngresso({ titulo, conteudo }: { titulo: string; conteudo?: string }) {
  return (
    <div className="mt-4 rounded-2xl bg-gray-50 p-4">
      <h3 className="mb-3 font-bold text-gray-700">{titulo}</h3>
      {conteudo ? (
        <>
          {conteudo.startsWith("data:image/") || /^https?:\/\//.test(conteudo) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conteudo} alt={titulo} className="h-48 w-48 object-contain" />
          ) : (
            <QRCodeSVG value={conteudo} size={192} marginSize={2} title={titulo} />
          )}
          <details className="mt-3 text-sm text-gray-600">
            <summary>Conteúdo do QR Code</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all">{conteudo}</pre>
          </details>
        </>
      ) : (
        <p className="text-gray-500">QR Code não disponível no pedido.</p>
      )}
    </div>
  );
}
