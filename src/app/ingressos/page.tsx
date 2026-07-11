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
      texto: "Funcionamento diário das 08h às 17h30.",
    },
  ];

  const atracoes = [
    {
      icone: "💧",
      titulo: "Cachoeira Mundo Novo",
      texto: "A principal do parque. Queda impressionante e paisagens únicas.",
      imagem: "/fotos/cachoeira-mundo-novo.png",
    },
    {
      icone: "💧",
      titulo: "Cascata do Avencal",
      texto: "Queda imponente de aproximadamente 100 metros de altura.",
      imagem: "/fotos/cascata-avencal.png",
    },
    {
      icone: "🚠",
      titulo: "Elevador Panorâmico",
      texto:
        "O primeiro Elevador Panorâmico da América Latina com 100 metros de altura.",
      imagem: "/fotos/elevador-novo.png",
    },
    {
      icone: "🌤️",
      titulo: "Balanço do Infinito",
      texto: "Uma das atrações mais procuradas para fotos.",
      imagem: "/fotos/balanco-infinito.png",
    },
    {
      icone: "🪨",
      titulo: "Réplica da Pedra Furada",
      texto: "Réplica temática para visitação e fotos.",
      imagem: "/fotos/pedra-furada.png",
    },
    {
      icone: "🍽️",
      titulo: "Restaurante",
      texto: "Buffet variado com comida caseira e sabor da serra.",
      imagem: "/fotos/restaurante.png",
    },
    {
      icone: "⛺",
      titulo: "Camping",
      texto: "Estrutura completa para sua conexão com a natureza.",
      imagem: "/fotos/camping.png",
    },
    {
      icone: "🚐",
      titulo: "Camping para Motorhome",
      texto: "O camping aceita motorhomes com estrutura adequada.",
      imagem: "/fotos/motorhome.png",
    },
    {
      icone: "🐶",
      titulo: "Pet Friendly",
      texto: "Seu pet é bem-vindo para aproveitar o parque com você.",
      imagem: "/fotos/pet-friendly.png",
    },
    {
      icone: "🧒",
      titulo: "Área Kids",
      texto: "Espaço seguro e divertido para as crianças.",
      imagem: "/fotos/area-kids.png",
    },
  ];

  const ingressos = [
    {
      titulo: "Ingresso Parque",
      descricao: "Entrada para visitar o parque, trilhas, cachoeiras e mirantes.",
      preco: "R$ 60,00",
      imagem: "/fotos/ingresso-parque.png",
      rota: "/ingressos/parque",
      botao: "Comprar ingresso",
      destaque: true,
    },
    {
      titulo: "Meia Entrada Idoso",
      descricao: "Valor especial para idosos mediante documento comprobatório.",
      preco: "R$ 30,00",
      imagem: "/fotos/idoso-cachoeira.png",
      rota: "/ingressos/idoso",
      botao: "Comprar ingresso",
    },
    {
      titulo: "Camping",
      descricao: "1ª diária R$ 100 por pessoa. A partir da 2ª diária R$ 80.",
      preco: "A partir de R$ 100,00",
      imagem: "/fotos/camping.png",
      rota: "/ingressos/camping",
      botao: "Comprar camping",
    },
    {
      titulo: "Elevador Panorâmico",
      descricao:
        "O primeiro Elevador Panorâmico da América Latina com 100 metros de altura. Ingresso vendido separadamente.",
      preco: "R$ 75,00",
      imagem: "/fotos/elevador-novo.png",
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
    "Funcionamento todos os dias, das 08h às 17h30.",
    "Ingresso válido por 6 meses a partir da data da compra.",
    "O ingresso pode ser apresentado impresso ou pelo celular.",
    "O Elevador Panorâmico possui ingresso próprio e é vendido separadamente.",
    "Meia entrada exige apresentação de documento na portaria.",
    "Camping possui ingresso próprio e voucher de check-in.",
  ];

  const planejamento = [
    {
      icone: "🕒",
      titulo: "Horário de Funcionamento",
      texto:
        "O Parque Mundo Novo está aberto todos os dias, das 08h00 às 17h30. Recomendamos chegar com antecedência para aproveitar melhor sua visita.",
    },
    {
      icone: "🎫",
      titulo: "Como funciona seu ingresso",
      texto:
        "Após a confirmação do pagamento, você recebe seu ingresso digital por e-mail. Basta apresentar o QR Code impresso ou pelo celular na entrada.",
    },
    {
      icone: "🏕️",
      titulo: "Camping",
      texto:
        "A 1ª diária custa R$ 100,00 por pessoa. A partir da 2ª diária, o valor passa para R$ 80,00 por pessoa/noite. Crianças até 10 anos completos não pagam. Após a compra, será emitido um voucher de check-in com data, dados da reserva e QR Code.",
    },
    {
      icone: "🚗",
      titulo: "Estacionamento próprio",
      texto:
        "O parque possui estacionamento próprio. Recomendamos manter o veículo trancado, conferir portas e vidros e não deixar objetos de valor aparentes. O Parque Mundo Novo não se responsabiliza por objetos esquecidos, perdidos, furtados ou danificados no interior dos veículos ou nas áreas de estacionamento.",
    },
    {
      icone: "🎢",
      titulo: "Serviços terceirizados",
      texto:
        "Tirolesa, tirolesa infantil, salto de pêndulo, restaurante, bistrô e Café El Torrador são serviços operados por empresas parceiras, com administração própria. O Parque Mundo Novo disponibiliza apenas o espaço físico e não se responsabiliza por operação, horários, valores, manutenção, cancelamentos ou indisponibilidade desses serviços.",
    },
    {
      icone: "🌧️",
      titulo: "Condições climáticas",
      texto:
        "Por segurança, atrações terceirizadas podem ser suspensas em caso de chuva, vento forte, neblina intensa ou outras condições climáticas adversas. A contratação dessas atividades é feita diretamente no local com os operadores responsáveis.",
    },
    {
      icone: "🍽️",
      titulo: "Estrutura disponível",
      texto:
        "Dentro do parque você encontra restaurante, bistrô, Café El Torrador, camping, área para motorhome, área kids, mirantes, cachoeiras, elevador panorâmico, estacionamento e espaço pet friendly.",
    },
    {
      icone: "📞",
      titulo: "Atendimento",
      texto:
        "Para dúvidas sobre ingressos, fale pelo WhatsApp (49) 99129-9991 ou pelo e-mail ingressosparquemundonovo@gmail.com.",
    },
  ];

  const perguntas = [
    {
      pergunta: "Quanto tempo vale o ingresso?",
      resposta:
        "Seu ingresso é válido por 6 meses a partir da data da compra. Dentro desse período, você escolhe o melhor dia para sua visita.",
    },
    {
      pergunta: "Como recebo meu ingresso?",
      resposta:
        "Após a confirmação do pagamento, você recebe seu ingresso digital por e-mail, com QR Code para apresentar na entrada.",
    },
    {
      pergunta: "O Elevador Panorâmico está incluso?",
      resposta:
        "Não. O Elevador Panorâmico possui ingresso próprio e é vendido separadamente do ingresso de entrada do parque.",
    },
    {
      pergunta: "O que torna o Elevador Panorâmico especial?",
      resposta:
        "Ele é o primeiro Elevador Panorâmico da América Latina com 100 metros de altura e proporciona uma vista privilegiada da Cascata do Avencal e da paisagem da Serra Catarinense.",
    },
    {
      pergunta: "Camping está incluso?",
      resposta:
        "Não. O camping possui ingresso próprio. A 1ª diária custa R$ 100,00 por pessoa e a partir da 2ª diária R$ 80,00 por pessoa/noite.",
    },
    {
      pergunta: "Crianças pagam camping?",
      resposta:
        "Crianças até 10 anos completos não pagam, desde que acompanhadas por responsável.",
    },
    {
      pergunta: "Como funciona a meia entrada?",
      resposta:
        "A meia entrada para idoso exige documento comprobatório no mesmo nome informado na compra e sua apresentação na portaria.",
    },
    {
      pergunta: "Posso cancelar a compra?",
      resposta:
        "Sim. Você pode solicitar o cancelamento em até 7 dias corridos após o pagamento, desde que o ingresso ainda não tenha sido utilizado.",
    },
    {
      pergunta: "Como solicito o cancelamento?",
      resposta:
        "Entre em contato pelo WhatsApp do parque, (49) 99129-9991, informando o número do pedido. O reembolso é feito pelo mesmo meio de pagamento e pode levar alguns dias úteis.",
    },
    {
      pergunta: "Posso apresentar pelo celular?",
      resposta:
        "Sim. Você pode apresentar o QR Code diretamente pelo celular na entrada do parque.",
    },
    {
      pergunta: "As atrações terceirizadas são vendidas pelo site?",
      resposta:
        "Não. Tirolesa, tirolesa infantil, salto de pêndulo, restaurante, bistrô e cafeteria são serviços terceirizados e devem ser contratados diretamente no local.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#06150f] via-[#0b2418] to-[#f3f7ef] text-white">
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
              rel="noopener noreferrer"
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
                Natureza, cachoeiras, mirantes, camping e experiências
                inesquecíveis em Urubici/SC.
              </p>

              <div className="mt-6 inline-flex max-w-3xl rounded-2xl border border-cyan-200/30 bg-cyan-500/15 px-5 py-4 shadow-2xl backdrop-blur-md">
                <p className="font-black leading-relaxed text-cyan-50">
                  🏆 Conheça o primeiro Elevador Panorâmico da América Latina
                  com 100 metros de altura.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <a
                  href="#comprar-ingressos"
                  className="rounded-full bg-emerald-500 px-8 py-4 text-center font-black text-emerald-950 shadow-2xl transition hover:-translate-y-1 hover:bg-emerald-400"
                >
                  Comprar Ingressos
                </a>

                <a
                  href="#elevador-panoramico"
                  className="rounded-full bg-cyan-500 px-8 py-4 text-center font-black text-cyan-950 shadow-2xl transition hover:-translate-y-1 hover:bg-cyan-400"
                >
                  Conhecer o Elevador
                </a>

                <a
                  href="/conheca-o-parque"
                  className="rounded-full border border-white/30 bg-white/10 px-8 py-4 text-center font-black backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/20"
                >
                  Conheça o Parque
                </a>

                <a
                  href="#planeje-sua-visita"
                  className="rounded-full border border-white/30 bg-white/10 px-8 py-4 text-center font-black backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/20"
                >
                  Planeje sua Visita
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
                  🕒 Todos os dias das 08h às 17h30
                </span>

                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold shadow backdrop-blur-md">
                  🎟️ Ingresso digital com QR Code
                </span>

                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold shadow backdrop-blur-md">
                  🐶 Pet Friendly
                </span>

                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold shadow backdrop-blur-md">
                  🚐 Camping aceita motorhome
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
                    rel="noopener noreferrer"
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

      <section
        id="elevador-panoramico"
        className="relative overflow-hidden px-4 py-24"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#06150f] via-[#082519] to-[#0b2418]" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full border border-yellow-300/30 bg-yellow-400/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-100">
                🏆 Atração exclusiva
              </span>

              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                100 metros de altura
              </span>
            </div>

            <h2 className="mx-auto mt-6 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              O primeiro Elevador Panorâmico da América Latina com 100 metros
              de altura
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-emerald-50/80 md:text-xl">
              Viva uma experiência única no Parque Mundo Novo e contemple a
              Cascata do Avencal e as paisagens da Serra Catarinense de um ponto
              de vista inesquecível.
            </p>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-cyan-200/20 bg-black shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
            <div className="relative min-h-[360px] md:min-h-[620px]">
              <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/fotos/elevador-novo.png"
              >
                <source src="/videos/elevador-home.mp4" type="video/mp4" />
              </video>

              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              <div className="relative z-10 flex min-h-[360px] items-end p-6 md:min-h-[620px] md:items-center md:p-12">
                <div className="max-w-2xl rounded-[2rem] border border-white/15 bg-black/45 p-6 shadow-2xl backdrop-blur-md md:p-9">
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                    Elevador Panorâmico
                  </p>

                  <h3 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
                    Uma experiência impressionante em Urubici
                  </h3>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="font-black">📏 100 metros de altura</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="font-black">🌄 Vista panorâmica</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="font-black">💧 Cascata do Avencal</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <p className="font-black">📸 Cenário inesquecível</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-orange-300/30 bg-orange-500/15 p-4 text-sm font-semibold leading-relaxed text-orange-50">
                    ⚠️ O ingresso do Elevador Panorâmico é vendido
                    separadamente do ingresso de entrada do Parque Mundo Novo.
                  </div>

                  <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => router.push("/ingressos/elevador")}
                      className="rounded-full bg-cyan-400 px-8 py-4 text-center font-black text-cyan-950 shadow-2xl transition hover:-translate-y-1 hover:bg-cyan-300 active:scale-95"
                    >
                      🎟️ Comprar ingresso do Elevador
                    </button>

                    <p className="text-center text-2xl font-black sm:text-left">
                      R$ 75,00
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl">
              <p className="text-4xl">🏆</p>

              <h3 className="mt-4 text-xl font-black">
                Marco na América Latina
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-emerald-50/75">
                O primeiro Elevador Panorâmico da América Latina com 100 metros
                de altura.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl">
              <p className="text-4xl">🌄</p>

              <h3 className="mt-4 text-xl font-black">Paisagem privilegiada</h3>

              <p className="mt-3 text-sm leading-relaxed text-emerald-50/75">
                Uma nova perspectiva da Cascata do Avencal e das montanhas da
                Serra Catarinense.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl">
              <p className="text-4xl">🎟️</p>

              <h3 className="mt-4 text-xl font-black">Ingresso exclusivo</h3>

              <p className="mt-3 text-sm leading-relaxed text-emerald-50/75">
                A atração possui ingresso próprio, disponível para compra no
                site oficial.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="conheca-parque" className="px-4 py-20">
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
            restaurante, camping e atrações para visitantes que desejam
            aproveitar o melhor da Serra Catarinense. O parque também é Pet
            Friendly e o camping aceita motorhomes.
          </div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Atrações
          </p>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            O que você encontra no parque
          </h2>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-emerald-50/75">
            Natureza, aventura, estrutura para famílias e experiências para
            aproveitar em um dos destinos mais bonitos da Serra Catarinense.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {atracoes.map((item) => (
              <div
                key={item.titulo}
                className="group relative min-h-[360px] overflow-hidden rounded-[1.75rem] border border-emerald-300/20 bg-black/40 shadow-xl transition hover:-translate-y-1 hover:border-emerald-300/50"
              >
                <img
                  src={item.imagem}
                  alt={item.titulo}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

                <div className="relative z-10 flex h-full min-h-[360px] flex-col justify-end p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/80 text-2xl shadow-lg">
                    {item.icone}
                  </div>

                  <h3 className="text-xl font-black text-white">
                    {item.titulo}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-white/85">
                    {item.texto}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="comprar-ingressos"
        className="bg-gradient-to-b from-[#0b2619] to-[#f3f7ef] px-4 py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Ingressos Online
            </p>

            <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">
              Escolha sua experiência
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-emerald-50/80">
              Compre pelo site oficial, receba seu QR Code e apresente na
              portaria pelo celular.
            </p>

            <div className="mt-6 rounded-2xl border border-yellow-200/30 bg-yellow-400/15 p-4 text-left text-sm font-semibold leading-relaxed text-yellow-50">
              ℹ️ Antes de finalizar sua compra, leia as informações sobre
              validade do ingresso, política de cancelamento, camping,
              estacionamento e serviços terceirizados.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {ingressos.map((item) => (
              <div
                key={item.titulo}
                className={`group relative min-h-[440px] overflow-hidden rounded-3xl border shadow-2xl ${item.destaque
                    ? "border-emerald-300/60"
                    : "border-white/20"
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
                    type="button"
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

      <section
        id="planeje-sua-visita"
        className="bg-[#f3f7ef] px-4 py-20 text-slate-900"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-700">
              Planeje sua Visita
            </p>

            <h2 className="mt-4 text-4xl font-black md:text-5xl">
              Informações importantes antes de vir
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Confira horários, regras do camping, validade dos ingressos,
              serviços terceirizados, estacionamento e canais de atendimento.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {planejamento.map((item) => (
              <div
                key={item.titulo}
                className="rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-xl"
              >
                <div className="text-4xl">{item.icone}</div>

                <h3 className="mt-4 text-xl font-black text-slate-900">
                  {item.titulo}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {item.texto}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-xl">
            <h3 className="text-2xl font-black text-amber-900">
              ⚠️ Atenção aos pertences
            </h3>

            <p className="mt-3 leading-relaxed text-amber-900/85">
              Por ser um local de circulação de visitantes de diversos lugares,
              recomendamos atenção especial aos seus pertences. Antes de iniciar
              sua visita, certifique-se de que o veículo esteja trancado e que
              objetos de valor não estejam visíveis.
            </p>

            <p className="mt-3 font-bold text-amber-950">
              O Parque Mundo Novo não se responsabiliza por objetos esquecidos,
              perdidos, furtados ou danificados no interior de veículos, no
              estacionamento ou nas áreas de circulação do parque.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f3f7ef] px-4 py-20 text-slate-900">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-emerald-100 bg-white p-6 shadow-2xl md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-700">
                Compra e cancelamento
              </p>

              <h2 className="mt-4 text-4xl font-black">
                Política do ingresso
              </h2>

              <p className="mt-4 text-slate-600">
                Informações claras para o visitante comprar com segurança e
                entender seus direitos antes da visita.
              </p>
            </div>

            <div className="space-y-5 text-sm leading-relaxed text-slate-700 md:text-base">
              <div>
                <h3 className="font-black text-slate-900">
                  Como funciona seu ingresso
                </h3>

                <p className="mt-2">
                  Após a confirmação do pagamento, você recebe o ingresso
                  digital por e-mail. Basta apresentar o ingresso impresso ou no
                  celular na entrada do Parque Mundo Novo.
                </p>
              </div>

              <div>
                <h3 className="font-black text-slate-900">Validade</h3>

                <p className="mt-2">
                  Seu ingresso é válido por 6 meses a partir da data da compra.
                  Dentro desse período, você escolhe o melhor dia para sua
                  visita, respeitando o horário de funcionamento do parque.
                </p>
              </div>

              <div>
                <h3 className="font-black text-slate-900">
                  Arrependimento e cancelamento
                </h3>

                <p className="mt-2">
                  Você pode cancelar sua compra em até 7 dias corridos após a
                  data do pagamento, conforme o Código de Defesa do Consumidor,
                  desde que o ingresso ainda não tenha sido utilizado. Nesse
                  caso, o valor pago será devolvido integralmente.
                </p>
              </div>

              <div>
                <h3 className="font-black text-slate-900">
                  Como solicitar o cancelamento
                </h3>

                <p className="mt-2">
                  Entre em contato pelo WhatsApp (49) 99129-9991 informando o
                  número do pedido. O reembolso é feito pelo mesmo meio de
                  pagamento utilizado na compra e pode levar alguns dias úteis,
                  conforme prazo do banco ou operadora.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-5 font-semibold text-emerald-950">
                Passados os 7 dias ou após a utilização do ingresso, não é
                possível solicitar reembolso.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0b2418] px-4 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2.5rem] border border-emerald-300/20 bg-emerald-950/70 p-8 shadow-2xl md:p-12">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                  Turismo Responsável
                </p>

                <h2 className="mt-4 text-4xl font-black md:text-5xl">
                  Preserve a natureza
                </h2>

                <p className="mt-5 text-lg leading-relaxed text-emerald-50/80">
                  A natureza é o maior patrimônio do Parque Mundo Novo. Cada
                  visitante tem um papel importante na conservação deste lugar.
                </p>
              </div>

              <div className="space-y-3 text-emerald-50/85">
                <p>🌱 Respeite a fauna e a flora.</p>
                <p>🚯 Utilize as lixeiras ou leve seu lixo até um local adequado.</p>
                <p>🚶 Permaneça nas trilhas e áreas sinalizadas.</p>
                <p>💧 Preserve rios, cachoeiras e nascentes.</p>
                <p>🐦 Não alimente nem capture animais silvestres.</p>
                <p>🔥 Não faça fogo em locais não autorizados.</p>
              </div>
            </div>

            <div className="mt-10 rounded-[2rem] bg-white/10 p-6 text-center shadow-xl">
              <p className="text-2xl font-black leading-relaxed text-emerald-50 md:text-3xl">
                “Da natureza, leve apenas fotografias, lembranças e momentos
                inesquecíveis. Deixe apenas suas pegadas e o respeito por este
                lugar tão especial.”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f3f7ef] px-4 py-20 text-slate-900">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-700">
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
                className="rounded-[1.5rem] border border-emerald-100 bg-white p-5 text-sm font-semibold leading-relaxed text-slate-700 shadow-xl"
              >
                ✓ {info}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3f7ef] px-4 pb-20 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-700">
              FAQ
            </p>

            <h2 className="mt-4 text-4xl font-black">Dúvidas frequentes</h2>
          </div>

          <div className="space-y-4">
            {perguntas.map((item) => (
              <details
                key={item.pergunta}
                className="group rounded-[1.5rem] border border-emerald-100 bg-white p-5 shadow-xl"
              >
                <summary className="cursor-pointer list-none text-lg font-black">
                  <span className="flex items-center justify-between gap-4">
                    {item.pergunta}

                    <span className="text-emerald-600 transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>

                <p className="mt-4 leading-relaxed text-slate-600">
                  {item.resposta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-emerald-100 bg-white px-4 py-12 text-slate-900">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                className="h-14 w-14 rounded-2xl bg-white object-contain p-2 shadow"
              />

              <div>
                <h3 className="text-xl font-black">Parque Mundo Novo</h3>

                <p className="text-sm text-slate-500">
                  Site oficial de ingressos
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600">
              Parque ecológico localizado em Urubici, na Serra Catarinense.
            </p>

            <p className="mt-3 text-sm font-bold text-amber-600">
              {avaliacaoGoogle}
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-black">Contato</h3>

            <p className="text-sm text-slate-600">
              📍 SC-110 KM 34 - Urubici/SC
            </p>

            <p className="mt-2 text-sm text-slate-600">
              📱 (49) 99129-9991
            </p>

            <p className="mt-2 break-words text-sm text-slate-600">
              📧 ingressosparquemundonovo@gmail.com
            </p>

            <p className="mt-2 text-sm text-slate-600">
              🕒 Todos os dias das 08h às 17h30
            </p>

            <a
              href={linkMaps}
              target="_blank"
              rel="noopener noreferrer"
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
              rel="noopener noreferrer"
              className="block text-sm text-slate-600 hover:text-emerald-700"
            >
              📸 Instagram
            </a>

            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-sm text-slate-600 hover:text-emerald-700"
            >
              📘 Facebook
            </a>

            <a
              href="/politica-privacidade"
              className="mt-2 block text-sm text-slate-600 hover:text-emerald-700"
            >
              Política de Privacidade
            </a>

            <a
              href="/termos-de-uso"
              className="mt-2 block text-sm text-slate-600 hover:text-emerald-700"
            >
              Termos de Uso
            </a>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-emerald-100 pt-6 text-center text-xs text-slate-400">
          © 2026 Parque Mundo Novo - Todos os direitos reservados
        </div>
      </footer>
    </main>
  );
}