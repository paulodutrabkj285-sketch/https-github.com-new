"use client";

import Link from "next/link";

const menus = [
    {
        titulo: "Dashboard",
        descricao: "Visão geral do parque",
        link: "/admin/dashboard",
        emoji: "📊",
        cor: "from-emerald-500 to-green-700",
    },
    {
        titulo: "Pedidos",
        descricao: "Ingressos vendidos",
        link: "/admin/pedidos",
        emoji: "🎟️",
        cor: "from-blue-500 to-blue-700",
    },
    {
        titulo: "Portaria",
        descricao: "Entrada dos visitantes",
        link: "/portaria",
        emoji: "🚪",
        cor: "from-purple-500 to-purple-700",
    },
    {
        titulo: "Validação",
        descricao: "Validar ingressos",
        link: "/admin/validacao",
        emoji: "✅",
        cor: "from-green-500 to-green-700",
    },
    {
        titulo: "Cadastro Parceiros",
        descricao: "Cadastrar agências e guias",
        link: "/parceiros/cadastro",
        emoji: "🤝",
        cor: "from-orange-500 to-red-600",
    },
    {
        titulo: "Reserva Parceiros",
        descricao: "Nova excursão",
        link: "/parceiros/reservas",
        emoji: "🚌",
        cor: "from-cyan-500 to-sky-700",
    },
    {
        titulo: "Relatório Excursões",
        descricao: "Reservas das agências",
        link: "/relatorios/reservas-agencias",
        emoji: "📋",
        cor: "from-indigo-500 to-indigo-700",
    },
    {
        titulo: "Venda de Ingressos",
        descricao: "Página pública",
        link: "/ingressos",
        emoji: "🎫",
        cor: "from-teal-500 to-emerald-700",
    },
];

export default function PainelPage() {
    return (
        <main className="min-h-screen bg-slate-100 p-8">
            <div className="mx-auto max-w-7xl">

                <div className="mb-10">
                    <p className="font-bold text-emerald-700">
                        Parque Mundo Novo
                    </p>

                    <h1 className="text-4xl font-black text-slate-900 mt-2">
                        Painel Geral do Sistema
                    </h1>

                    <p className="text-slate-600 mt-3">
                        Central de acesso rápido a todos os módulos do sistema.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

                    {menus.map((menu) => (

                        <Link
                            key={menu.titulo}
                            href={menu.link}
                            className={`rounded-3xl bg-gradient-to-br ${menu.cor}
              text-white p-6 shadow-xl hover:scale-105 transition-all duration-300`}
                        >

                            <div className="text-5xl">
                                {menu.emoji}
                            </div>

                            <h2 className="mt-5 text-2xl font-black">
                                {menu.titulo}
                            </h2>

                            <p className="mt-3 opacity-90">
                                {menu.descricao}
                            </p>

                        </Link>

                    ))}

                </div>

            </div>
        </main>
    );
}