import Link from "next/link";

export default function ExclusaoDeDadosPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <section className="bg-emerald-950 text-white">
                <div className="mx-auto max-w-4xl px-6 py-16">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-300">
                        Parque Mundo Novo
                    </p>

                    <h1 className="text-4xl font-bold">
                        Exclusão de Dados
                    </h1>

                    <p className="mt-5 max-w-2xl text-lg text-emerald-50">
                        Informações sobre como solicitar a exclusão de dados relacionados
                        aos nossos serviços e integrações.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-4xl px-6 py-12">
                <div className="space-y-8 rounded-2xl bg-white p-8 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-bold">
                            Como solicitar a exclusão dos seus dados
                        </h2>

                        <p className="mt-4 leading-7 text-slate-600">
                            Se você utilizou um serviço oferecido pelo Parque Mundo Novo ou
                            por uma solução de comunicação administrada por nossa plataforma,
                            poderá solicitar a exclusão dos dados pessoais associados ao
                            serviço.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold">
                            Solicitação de exclusão
                        </h2>

                        <p className="mt-3 leading-7 text-slate-600">
                            Para solicitar a exclusão, entre em contato conosco informando
                            que deseja excluir seus dados. Poderemos solicitar informações
                            mínimas necessárias para localizar o cadastro e confirmar a
                            legitimidade da solicitação.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold">
                            O que acontece após a solicitação?
                        </h2>

                        <p className="mt-3 leading-7 text-slate-600">
                            Após a confirmação da solicitação, os dados elegíveis serão
                            excluídos ou anonimizados dos sistemas sob nossa responsabilidade,
                            respeitando os prazos aplicáveis e eventuais obrigações legais ou
                            regulatórias de retenção.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold">
                            Dados provenientes da Meta
                        </h2>

                        <p className="mt-3 leading-7 text-slate-600">
                            Quando nossos serviços utilizarem dados disponibilizados pelas
                            plataformas da Meta, esses dados serão utilizados somente para
                            fornecer as funcionalidades autorizadas e solicitadas pelo
                            cliente. Solicitações de exclusão relacionadas a esses dados
                            também poderão ser encaminhadas por meio dos nossos canais de
                            atendimento.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold">
                            Contato
                        </h2>

                        <p className="mt-3 leading-7 text-slate-600">
                            Para solicitar a exclusão de dados, utilize os canais oficiais de
                            atendimento do Parque Mundo Novo.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4">
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

            <footer className="border-t bg-white">
                <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-slate-500">
                    Parque Mundo Novo
                </div>
            </footer>
        </main>
    );
}