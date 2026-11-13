import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { prepararPedido } from "@/lib/preparar-pedido";
import { PROMOCAO_PARQUE_ELEVADOR } from "@/lib/preco-elevador";
import {
  assinarPedidoCombo, COOKIE_COMBO, DURACAO_COMBO_SEGUNDOS,
  iniciarAutorizacaoCombo, lerAutorizacaoCombo, pedidoComboValidoNoServidor,
} from "@/lib/combo-parque-elevador-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const opcoesCookie = {
  httpOnly: true, sameSite: "lax" as const, path: "/api/ingressos/combo",
  secure: process.env.NODE_ENV === "production", maxAge: DURACAO_COMBO_SEGUNDOS,
};

// Este é o destino do CTA. O parâmetro da página só seleciona a interface;
// não concede desconto nem autoriza criar um pedido promocional.
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get("verificar") === "1") {
      const autorizado = Boolean(lerAutorizacaoCombo(req.cookies.get(COOKIE_COMBO)?.value));
      return NextResponse.json({ ok: autorizado }, {
        status: autorizado ? 200 : 403, headers: { "Cache-Control": "no-store" },
      });
    }
    const resposta = NextResponse.redirect(new URL("/ingressos/parque?combo=parque-elevador", req.url));
    resposta.headers.set("Cache-Control", "no-store");
    resposta.cookies.set(COOKIE_COMBO, iniciarAutorizacaoCombo(), opcoesCookie);
    return resposta;
  } catch {
    return NextResponse.json({ ok: false, erro: "Combo temporariamente indisponível." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== req.nextUrl.origin) {
      return NextResponse.json({ ok: false, erro: "Origem inválida." }, { status: 403 });
    }
    const autorizacao = lerAutorizacaoCombo(req.cookies.get(COOKIE_COMBO)?.value);
    if (!autorizacao) {
      return NextResponse.json({ ok: false, erro: "Inicie novamente pelo botão Comprar combo agora." }, { status: 403 });
    }
    const body = await req.json();
    const texto = (valor: unknown) => typeof valor === "string" ? valor.trim() : "";
    const nome = texto(body.nome);
    const telefone = texto(body.telefone);
    const email = texto(body.email).toLowerCase();
    const dataVisita = texto(body.dataVisita);
    const quantidade = body.quantidade;
    const tipoDocumento = body.tipoDocumento;
    const cpf = texto(body.cpf).replace(/\D/g, "");
    const documento = tipoDocumento === "cpf" ? cpf : texto(body.documento);
    const paisDocumento = tipoDocumento === "cpf" ? "Brasil" : texto(body.paisDocumento);
    const tipoDocumentoEstrangeiro = tipoDocumento === "cpf" ? "" : texto(body.tipoDocumentoEstrangeiro);
    const hoje = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    if (!nome || nome.length > 200 || !telefone || telefone.length > 60 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dataVisita) || !Number.isFinite(Date.parse(dataVisita)) ||
        new Date(dataVisita).toISOString().slice(0, 10) !== dataVisita || dataVisita < hoje ||
        !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 1000 ||
        body.quantidadeParque !== quantidade || body.quantidadeElevador !== quantidade ||
        !["cpf", "estrangeiro"].includes(tipoDocumento) ||
        (tipoDocumento === "cpf" ? cpf.length !== 11 :
          documento.length < 3 || documento.length > 60 || !paisDocumento || paisDocumento.length > 60 ||
          !["identidade_nacional", "passaporte", "outro"].includes(tipoDocumentoEstrangeiro)) ||
        body.aceiteNaturalExtremo !== true) {
      return NextResponse.json({ ok: false, erro: "Confira os dados e selecione a mesma quantidade de Parque e Elevador." }, { status: 400 });
    }

    const ref = doc(db, "pedidos", autorizacao.pedidoId);
    await runTransaction(db, async tx => {
      const existente = await tx.get(ref);
      // Uma autorização gera um único pedido, inclusive em reenvios de rede.
      if (existente.exists()) {
        if (!pedidoComboValidoNoServidor(ref.id, existente.data())) throw new Error("Pedido divergente.");
        return;
      }
      const codigoParque = `PMN-${randomInt(10000, 100000)}`;
      let codigoElevador: string;
      do { codigoElevador = `PMN-${randomInt(10000, 100000)}`; } while (codigoElevador === codigoParque);

      // Lista permitida: preço, origem, cortesia, status e códigos do navegador
      // são ignorados. A fórmula do novo produto só existe no servidor.
      const dadosPedido = {
        produto: "Ingresso Parque", tipo: "ingresso", origem: "site" as const,
        nome, telefone, email, tipoDocumento, cpf: tipoDocumento === "cpf" ? cpf : "",
        documento, paisDocumento, tipoDocumentoEstrangeiro, dataVisita,
        quantidade, quantidadeParque: quantidade, quantidadeElevador: quantidade,
        valorUnitario: 60, valorParque: quantidade * 60, valorElevador: quantidade * 60,
        valorTotal: quantidade * 120, statusPagamento: "pendente", statusOperacional: "ativo",
        codigoIngresso: codigoParque, codigoIngressoParque: codigoParque, codigoIngressoElevador: codigoElevador,
        aceiteNaturalExtremo: true, aceiteNaturalExtremoEm: new Date().toISOString(),
        aceiteNaturalExtremoVersao: "2026-09-28",
        aceiteNaturalExtremoTexto: "Li e estou ciente de que algumas experiências operadas pela Natural Extremo podem incluir o acesso ao Parque Mundo Novo e de que devo confirmar as condições da atividade escolhida antes de comprar o ingresso do parque separadamente.",
      };
      const preparado = prepararPedido(dadosPedido);
      const pedido = {
        ...preparado, promocao: PROMOCAO_PARQUE_ELEVADOR, valorUnitarioElevador: 60,
        itensCarrinho: [
          { tipo: "parque" as const, produto: "Ingresso Parque", quantidade, valorUnitario: 60, valorTotal: quantidade * 60 },
          { tipo: "elevador" as const, produto: "Elevador Panorâmico", quantidade, valorUnitario: 60, valorTotal: quantidade * 60 },
        ],
      };
      tx.set(ref, { ...pedido, comboAssinatura: assinarPedidoCombo(ref.id, pedido) });
    });
    return NextResponse.json({ ok: true, pedidoId: ref.id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, erro: "Não foi possível criar o combo. Tente novamente." }, { status: 500 });
  }
}
