"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function IngressosPage() {
  const router = useRouter();

  const [imagemAtual, setImagemAtual] = useState(0);
  const [mostrarLocalizacao, setMostrarLocalizacao] = useState(false);

  const linkMaps =
    "https://maps.google.com/maps?vet=10CAAQoqAOahcKEwiA3azy-YeVAxUAAAAAHQAAAAAQBg..i&pvq=CgwvZy8xcHYyZl9kaGIiFwoRcGFycXVlIG11bmRvIG5vdm8QAhgD&lqi=ChlwYXJxdWUgbXVuZG8gbm92byB1cnViaWNpY2mSAQpmYWlyZ3JvdW5k&fvr=1&cs=0&um=1&ie=UTF-8&fb=1&gl=br&sa=X&ftid=0x952046a2f62d7365:0x34bd4695f0794ad2";

  const avaliacaoGoogle = "⭐ 4,7/5 no Google • 11.557 avaliações";

  const imagens = [
    { url: "/fotos/fundo-geral.jpg", posicao: "center 35%" },
    { url: "/fotos/cachoeira-alta.png", posicao: "center 18%" },
    { url: "/fotos/cachoeira-lago.png", posicao: "center 25%" },
  ];

  useEffect(() => {
    const intervalo = setInterval(() => {
      setImagemAtual((prev) => (prev + 1) % imagens.length);
    }, 7000);

    return () => clearInterval(intervalo);
  }, [imagens.length]);

  const confianca = [
    {
      icone: "🛡️",
      titulo: "Compra Segura",
      texto: "Pagamento protegido via Pix e confirmação automática no sistema.",
    },
    {
      icone: "⚡",
      titulo: "Confirmação Imediata",
      texto: "Após o pagamento, seu ingresso digital é gerado automaticamente.",
    },
    {
      icone: "🎟️",
      titulo: "QR Code Exclusivo",
      texto: "Entrada rápida e segura na portaria com validação individual.",
    },
    {
      icone: "🌄",
      titulo: "Aberto Todos os Dias",
      texto: "Funcionamento diário das 08h às 18h.",
    },
  ];

  const atracoes = [
    { icone: "💧", titulo: "Cachoeiras", texto: "Paisagens naturais para contemplar e fotografar." },
    { icone: "🏞️", titulo: "Mirantes", texto: "Vista especial da Serra Catarinense." },
    { icone: "🚠", titulo: "Elevador Panorâmico", texto: "Experiência vendida separadamente." },
    { icone: "🌤️", titulo: "Balanço do Infinito", texto: "Uma das atrações mais procuradas para fotos." },
    { icone: "🪨", titulo: "Pedra Furada", texto: "Réplica temática para visitação." },
    { icone: "🧒", titulo: "Área Kids", texto: "Espaço para tornar o passeio em família melhor." },
    { icone: "🍽️", titulo: "Restaurante", texto: "Estrutura de apoio para sua visita." },
    { icone: "⛺", titulo: "Camping", texto: "Opção com ingresso próprio." },
  ];

  const ingressos = [
    {
      titulo: "Ingresso Parque",
      descricao: "Entrada para visitar o parque, trilhas, cachoeiras e mirantes.",
      preco: "R$ 60,00",
      imagem: "/fotos/ingresso-parque.jpg",
      rota: "/ingressos/parque",
      botao: "Comprar ingresso",
      destaque: true,
    },
    {
      titulo: "Meia Entrada Idoso",
      descricao: "Valor especial para idosos mediante documento comprobatório.",
      preco: "R$ 30,00",
      imagem: "/fotos/idoso-cachoeira.jpg",
      rota: "/ingressos/idoso",
      botao: "Comprar ingresso",
    },
    {
      titulo: "Camping",
      descricao: "Hospedagem no camping com natureza, tranquilidade e estrutura.",
      preco: "A partir de R$ 100,00",
      imagem: "/fotos/camping.jpg",
      rota: "/ingressos/camping",
      botao: "Comprar ingresso",
    },
    {
      titulo: "Elevador Panorâmico",
      descricao: "Experiência vendida separadamente com vista panorâmica.",
      preco: "R$ 75,00",
      imagem: "/fotos/elevador-novo.jpg",
      rota: "/ingressos/elevador",
      botao: "Comprar ingresso",
    },
    {
      titulo: "Agências e Guias",
      descricao: "Cadastro para agências, guias e operadoras turísticas.",
      preco: "Cadastro de parceiro",
      imagem: "/fotos/fundo-geral.jpg",
      rota: "/parceiros/cadastro",
      botao: "Cadastrar parceiro",
    },
  ];

  const informacoes = [
    "Ingresso válido por 30 dias após a confirmação do pagamento.",
    "O Elevador Panorâmico é vendido separadamente.",
    "Meia entrada exige apresentação de documento na portaria.",
    "Camping possui ingresso próprio.",
    "Funcionamento todos os dias, das 08h às 18h.",
  ];

  const perguntas = [
    {
      pergunta: "Quanto tempo vale o ingresso?",
      resposta: "O ingresso é válido por 30 dias após a confirmação do pagamento.",
    },
    {
      pergunta: "O elevador está incluso?",
      resposta: "Não. O Elevador Panorâmico é vendido separadamente.",
    },
    {
      pergunta: "Camping está incluso?",
      resposta: "Não. O camping possui ingresso próprio.",
    },
    {
      pergunta: "Como funciona a meia entrada?",
      resposta: "A meia entrada para idoso exige documento comprobatório.",
    },
    {
      pergunta: "Recebo QR Code?",
      resposta: "Sim. Após o pagamento, o sistema gera um QR Code exclusivo.",
    },
    {
      pergunta: "Posso apresentar pelo celular?",
      resposta: "Sim. Você pode apresentar o QR Code diretamente pelo celular.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06150f] text-white">
      <section className="relative min-h-screen overflow-hidden px-4 py-8">
        {imagens.map((img, index) => (
          <div
            key={img.url}
            className={`absolute inset-0 bg-no-repeat transition-opacity duration-[2000ms] ${imagemAtual === index ? "opacity-100" : "opacity-0"
              }`}
            style={{
              backgroundImage: `url('${img.url}')`,
              backgroundSize: "cover",
              backgroundPosition: img.posicao,
            }}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-[#06150f]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                className="h-16 w-16 rounded-2xl bg-white/90 object-contain p-2 shadow-2xl"
              />

              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-200">
                  Site Oficial
                </p>
                <p className="text-lg font-black">Parque Mundo Novo</p>
              </div>
            </div>

            <a
              href={linkMaps}
              target="_blank"
              className="hidden rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold backdrop-blur-md transition hover:bg-white/20 md:inline-block"
            >
              Como chegar
            </a>
          </header>

          <div className="flex flex-1 items-center py-16">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full border border-yellow-300/30 bg-yellow-500/15 px-4 py-2 text-sm font-bold text-yellow-100 shadow-xl backdrop-blur-md">
                {avaliacaoGoogle}
              </span>

              <h1 className="mt-6 text-5xl font-black leading-tight drop-shadow-2xl md:text-7xl">
                Parque Mundo Novo
              </h1>

              <p className="mt-6 max-w-3xl text-xl font-medium leading-relaxed text-white/90 drop-shadow-md md:text-2xl">
                Natureza, cachoeiras, mirantes, camping e experiências inesquecíveis em Urubici/SC.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#comprar-ingressos"
                  className="rounded-full bg-emerald-500 px-8 py-4 text-center font-black text-emerald-950 shadow-2xl transition hover:-translate-y-1 hover:bg-emerald-400"
                >
                  Comprar Ingressos
                </a>

                <button
                  type="button"
                  onClick={() => setMostrarLocalizacao((valor) => !valor)}
                  className="rounded-full border border-white/30 bg-white/10 px-8 py-4 text-center font-black backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/20"
                >
                  📍 {mostrarLocalizacao ? "Ocultar localização" : "Como chegar"}
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold shadow backdrop-blur-md">
                  🕒 Todos os dias das 08h às 18h
                </span>

                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold shadow backdrop-blur-md">
                  🎟️ Ingresso digital com QR Code
                </span>
              </div>

              {mostrarLocalizacao && (
                <div className="mt-6 max-w-xl rounded-3xl border border-white/20 bg-black/35 p-5 shadow-2xl backdrop-blur-md">
                  <p className="font-black">Parque Mundo Novo</p>

                  <p className="mt-1 text-sm text-white/85">
                    SC-110 KM 34 - Urubici/SC
                  </p>

                  <p className="mt-2 text-sm text-white/85">
                    Clique no botão abaixo para abrir a rota no Google Maps.
                  </p>

                  <a
                    href={linkMaps}
                    target="_blank"
                    className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-500"
                  >
                    📍 Abrir no Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-20 px-4">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-[2rem] border border-emerald-300/20 bg-emerald-950/75 p-4 shadow-2xl backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          {confianca.map((item) => (
            <div
              key={item.titulo}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-5 shadow-xl transition hover:-translate-y-1 hover:bg-white/[0.12]"
            >
              <div className="text-4xl">{item.icone}</div>
              <h3 className="mt-4 text-lg font-black">{item.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50/80">
                {item.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Conheça o Parque
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Um destino completo em meio à natureza.
            </h2>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-lg leading-relaxed text-emerald-50/85 shadow-2xl">
            O Parque Mundo Novo reúne paisagens naturais, cachoeiras, mirantes,
            restaurante, camping e atrações para visitantes que desejam aproveitar
            o melhor da Serra Catarinense.
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Atrações
          </p>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            O que você encontra no parque
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {atracoes.map((item) => (
              <div
                key={item.titulo}
                className="rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.1] to-white/[0.04] p-6 shadow-xl transition hover:-translate-y-1 hover:border-emerald-300/40"
              >
                <div className="text-4xl">{item.icone}</div>
                <h3 className="mt-5 text-xl font-black">{item.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-emerald-50/75">
                  {item.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="comprar-ingressos"
        className="bg-gradient-to-b from-[#06150f] via-[#0b2619] to-[#06150f] px-4 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Ingressos Online
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Escolha sua experiência
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-emerald-50/75">
              Compre pelo site oficial, receba seu QR Code e apresente na portaria pelo celular.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {ingressos.map((item) => (
              <div
                key={item.titulo}
                className={`group relative min-h-[440px] overflow-hidden rounded-3xl border shadow-2xl ${item.destaque ? "border-emerald-300/60" : "border-white/20"
                  }`}
              >
                <img
                  src={item.imagem}
                  alt={item.titulo}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />

                {item.destaque && (
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-emerald-400 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-emerald-950 shadow-lg">
                    Mais procurado
                  </div>
                )}

                <div className="relative z-10 flex h-full min-h-[440px] flex-col justify-end p-6">
                  <h2 className="text-2xl font-black leading-tight drop-shadow-lg">
                    {item.titulo}
                  </h2>

                  <p className="mt-4 text-sm leading-relaxed text-white/90">
                    {item.descricao}
                  </p>

                  <p className="mt-6 text-2xl font-black">{item.preco}</p>

                  <button
                    onClick={() => router.push(item.rota)}
                    className="mt-6 rounded-xl bg-emerald-600 px-5 py-4 font-black text-white shadow-lg transition hover:bg-emerald-500 active:scale-95"
                  >
                    {item.botao}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Antes da visita
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Informações importantes
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {informacoes.map((info) => (
              <div
                key={info}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 text-sm font-semibold leading-relaxed text-emerald-50/85 shadow-xl"
              >
                ✓ {info}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              FAQ
            </p>

            <h2 className="mt-4 text-4xl font-black">Dúvidas frequentes</h2>
          </div>

          <div className="space-y-4">
            {perguntas.map((item) => (
              <details
                key={item.pergunta}
                className="group rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl"
              >
                <summary className="cursor-pointer list-none text-lg font-black">
                  <span className="flex items-center justify-between gap-4">
                    {item.pergunta}
                    <span className="text-emerald-300 transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>

                <p className="mt-4 leading-relaxed text-emerald-50/75">
                  {item.resposta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/30 px-4 py-12">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                className="h-14 w-14 rounded-2xl bg-white object-contain p-2"
              />

              <div>
                <h3 className="text-xl font-black">Parque Mundo Novo</h3>
                <p className="text-sm text-emerald-50/60">
                  Site oficial de ingressos
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-emerald-50/70">
              Parque ecológico localizado em Urubici, na Serra Catarinense.
            </p>

            <p className="mt-3 text-sm font-bold text-yellow-100">
              {avaliacaoGoogle}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-black">Contato</h3>

            <p className="text-sm text-emerald-50/75">
              📍 SC-110 KM 34 - Urubici/SC
            </p>

            <p className="mt-2 text-sm text-emerald-50/75">
              📧 contato@parquemundonovooficial.com.br
            </p>

            <p className="mt-2 text-sm text-emerald-50/75">
              🕒 Todos os dias das 08h às 18h
            </p>

            <a
              href={linkMaps}
              target="_blank"
              className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-500"
            >
              📍 Como chegar
            </a>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-black">Links</h3>

            <a
              href="https://www.instagram.com/parquemundonovo"
              target="_blank"
              className="block text-sm text-emerald-50/75 hover:text-emerald-300"
            >
              📸 Instagram
            </a>

            <a
              href="https://www.facebook.com"
              target="_blank"
              className="mt-2 block text-sm text-emerald-50/75 hover:text-emerald-300"
            >
              📘 Facebook
            </a>

            <a
              href="/politica-privacidade"
              className="mt-2 block text-sm text-emerald-50/75 hover:text-emerald-300"
            >
              Política de Privacidade
            </a>

            <a
              href="/termos-de-uso"
              className="mt-2 block text-sm text-emerald-50/75 hover:text-emerald-300"
            >
              Termos de Uso
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-center text-xs text-emerald-50/45">
          © 2026 Parque Mundo Novo - Todos os direitos reservados
        </div>
      </footer>
    </main>
  );
}