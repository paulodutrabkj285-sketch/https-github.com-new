import { NextResponse } from "next/server";
import { listarPedidos } from "@/lib/pedidos";

export const runtime = "nodejs";

function limpar(valor: any) {
    const texto = String(valor ?? "").replace(/[\r\n]+/g, " ").trim();

    if (
        texto.startsWith("=") ||
        texto.startsWith("+") ||
        texto.startsWith("-") ||
        texto.startsWith("@")
    ) {
        return `'${texto}`;
    }

    return texto;
}

function linhaCSV(campos: any[]) {
    return campos
        .map((campo) => `"${limpar(campo).replace(/"/g, '""')}"`)
        .join(";");
}

export async function GET() {
    const pedidos: any[] = await listarPedidos();

    const cabecalho = [
        "ID",
        "Cliente",
        "CPF",
        "Telefone",
        "Email",
        "Produto",
        "Quantidade",
        "Valor Unitário",
        "Valor Total",
        "Status Pagamento",
        "Status Operacional",
        "Código Ingresso",
        "Data da Visita",
        "Criado em",
        "Pago em",
        "Utilizado em",
        "Validado por",
    ];

    const linhas = pedidos.map((p) =>
        linhaCSV([
            p.id,
            p.nome,
            p.cpf,
            p.telefone,
            p.email,
            p.produto,
            p.quantidade,
            p.valorUnitario,
            p.valorTotal,
            p.statusPagamento,
            p.statusOperacional,
            p.codigoIngresso,
            p.dataVisita,
            p.createdAt,
            p.pagoEm || p.pixHorario || "",
            p.utilizadoEm || p.validadoEm || "",
            p.validadoPor || "",
        ])
    );

    const csv = [
        "sep=;",
        linhaCSV(cabecalho),
        ...linhas,
    ].join("\n");

    return new NextResponse("\uFEFF" + csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="pedidos-parque-mundo-novo.csv"`,
        },
    });
}