"use client";



import { buscarPedidoPorIdAdmin, cancelarIngressoAdministrativo, pedidoReembolsado, pedidoPermiteRegistroReembolso, registrarReembolsoAdministrativo, Pedido } from "@/lib/pedidos";
import { getAuth } from "firebase/auth";
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
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");



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



  async function reenviarIngresso() {

    if (!pedido) return;



    try {

      setReenviando(true);



      const resposta = await fetch("/api/reenviar-ingresso", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          pedidoId: pedido.id,

        }),

      });



      const dados = await resposta.json();



      if (!resposta.ok || !dados.ok) {

        alert(dados.error || "Não foi possível reenviar o ingresso.");

        return;

      }



      alert("Ingresso reenviado com sucesso.");

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

  const pedidoAny = pedido as

    | (Pedido & {

      validadoPor?: string;

      validadoEm?: string;

      utilizadoEm?: string;

      pagoEm?: string;

      dataPagamento?: string;

      pdfIngressoUrl?: string;

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

  const statusUtilizado = pedido.statusOperacional === "utilizado";

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

                  pedidoAny?.pagoEm || pedidoAny?.dataPagamento

                )}

              />

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

                    disabled={reenviando}

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

                      pedidoAny?.pagoEm || pedidoAny?.dataPagamento

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
