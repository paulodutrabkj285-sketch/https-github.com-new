import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Soluções WhatsApp Business | Parque Mundo Novo",
    description:
        "Plataforma de comunicação e automação para empresas utilizando WhatsApp Business.",
};

export default function SolucoesWhatsAppPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <section className="bg-emerald-950 text-white">
                <div className="mx-auto max-w-6xl px-6 py-20">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-emerald-300">
                        Soluções para empresas
                    </p>

                    <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
                        Comunicação e automação com WhatsApp Business
                    </h1>

                    <p className="mt-6 max-w-3xl text-lg leading-8 text-emerald-50">
                        Oferecemos uma plataforma para ajudar empresas a utilizar o
                        WhatsApp Business em atendimento ao cliente, notificações e
                        automações de comunicação.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-16">
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-bold">Atendimento</h2>
                        <p className="mt-3 leading-7 text-slate-600">
                            Recursos para empresas organizarem e automatizarem comunicações
                            com seus próprios clientes através do WhatsApp Business.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-bold">Notificações</h2>
                        <p className="mt-3 leading-7 text-slate-600">
                            Envio de informações relacionadas aos serviços do cliente, como
                            confirmações, atualizações e outras notificações autorizadas.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-bold">Automação</h2>
                        <p className="mt-3 leading-7 text-slate-600">
                            Integração do WhatsApp Business aos sistemas utilizados pela
                            empresa para automatizar processos de comunicação.
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-white">
                <div className="mx-auto max-w-5xl px-6 py-16">
                    <h2 className="text-3xl font-bold">
                        Como funciona
                    </h2>

                    <p className="mt-5 leading-8 text-slate-600">
                        Cada empresa conecta seus próprios ativos empresariais e sua própria
                        conta do WhatsApp Business. A plataforma utiliza os dados fornecidos
                        pela Meta somente para disponibilizar os serviços solicitados pela
                        própria empresa.
                    </p>

                    <p className="mt-4 leading-8 text-slate-600">
                        As informações de cada cliente são mantidas separadas e utilizadas
                        somente para prestar os serviços destinados àquele cliente.
                    </p>

                    <h2 className="mt-12 text-3xl font-bold">
                        Privacidade e controle de dados
                    </h2>

                    <p className="mt-5 leading-8 text-slate-600">
                        Cada empresa mantém o controle sobre seus próprios ativos e
                        informações. O tratamento de dados é limitado ao necessário para
                        fornecer os recursos contratados e as integrações autorizadas pelo
                        cliente.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link
                            href="/politica-privacidade"
                            className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
                        >
                            Política de Privacidade
                        </Link>

                        <Link
                            href="/termos-de-uso"
                            className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
                        >
                            Termos de Uso
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="border-t bg-slate-50">
                <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
                    Parque Mundo Novo — Soluções de tecnologia e comunicação para
                    empresas.
                </div>
            </footer>
        </main>
    );
}