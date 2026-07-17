"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function IngressosPage() {
  const router = useRouter();

  const [imagemAtual, setImagemAtual] = useState(0);
  const [mostrarLocalizacao, setMostrarLocalizacao] = useState(false);

  // Estados para o Modal de Reenvio de Ingresso
  const [modalReenviarAberto, setModalReenviarAberto] = useState(false);
  const [pedidoId, setPedidoId] = useState("");
  const [carregandoReenvio, setCarregandoReenvio] = useState(false);
  const [mensagemReenvio, setMensagemReenvio] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

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
      selo: "Mais procurado",
      tipoSelo: "verde",
    },
    {
      titulo: "Elevador Panorâmico",
      descricao:
        "O primeiro Elevador Panorâmico da América Latina com 100 metros de altura. Vista privilegiada da Cascata do Avencal. Ingresso vendido separadamente.",
      preco: "R$ 75,00",
      imagem: "/fotos/elevador-novo.png",
      rota: "/ingressos/elevador",
      botao: "Comprar ingresso",
      selo: "⭐ Experiência única",
      tipoSelo: "dourado",
    },
    {
      titulo: "Meia Entrada Idoso",
      descricao: "Valor especial para idosos mediante documento comprobatório.",
      preco: "R$ 30,00",
      imagem: "/fotos/idoso-cachoeira.png",
      rota: "/ingressos/idoso",
      botao: "Comprar ingresso",
      selo: "",
      tipoSelo: "",
    },
    {
      titulo: "Camping",
      descricao: "1ª diária R$ 100 por pessoa. A partir da 2ª diária R$ 80.",
      preco: "A partir de R$ 100,00",
      imagem: "/fotos/camping.png",
      rota: "/ingressos/camping",
      botao: "Comprar camping",
      selo: "",
      tipoSelo: "",
    },
    {
      titulo: "Agências e Guias",
      descricao: "Cadastro para agências, guias e operadoras turísticas.",
      preco: "Cadastro de parceiro",
      imagem: "/fotos/fundo-geral.jpg",
      rota: "/parceiros/cadastro",
      botao: "Cadastrar parceiro",
      selo: "",
      tipoSelo: "",
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
        "Ele é o primeiro Elevador Panorâmico da América Latina com 100 metros de altura e proporciona uma vista privilegiada da Cascata do Avencal e da paisagem da Serra Catarinense de um ponto de vista inesquecível.",
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

  // Função para chamar a API de reenvio
  async function lidarComReenvio(e: React.FormEvent) {
    e.preventDefault();
    setCarregandoReenvio(true);
    setMensagemReenvio(null);

    if (!pedidoId.trim()) {
      setMensagemReenvio({ tipo: "erro", texto: "Por favor, informe o ID do pedido." });
      setCarregandoReenvio(false);
      return;
    }

    try {
      const resposta = await fetch(`/api/ingresso/${pedidoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });

      const dados = await resposta.json();

      if (resposta.ok && dados.ok) {
        setMensagemReenvio({ tipo: "sucesso", texto: "Sucesso! O ingresso foi reenviado para o e-mail cadastrado." });
        setPedidoId("");
      } else {
        setMensagemReenvio({
          tipo: "erro",
          texto: dados.error || "Ocorreu um erro ao reenviar. Confirme o ID do pedido.",
        });
      }
    } catch (err) {
      setMensagemReenvio({
        tipo: "erro",
        texto: "Erro de conexão. Verifique sua internet e tente novamente.",
      });
    } finally {
      setCarregandoReenvio(false);
    }
  }

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

                {/* Agora esse botão abre o Modal de Reenvio localmente */}
                <button
                  type="button"
                  onClick={() => setModalReenviarAberto(true)}
                  className="rounded-full bg-yellow-500 px-8 py-4 text-center font-black text-yellow-950 shadow-2xl transition hover:-translate-y-1 hover:bg-yellow-400"
                >
                  🔍 Reenviar Ingresso
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

      {/* MODAL DE REENVIAR INGRESSO */}
      {modalReenviarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-emerald-950 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-black">Reenviar meu Ingresso</h3>
              <button
                type="button"
                onClick={() => {
                  setModalReenviarAberto(false);
                  setMensagemReenvio(null);
                  setPedidoId("");
                }}
                className="rounded-lg bg-white/10 p-2 text-sm font-bold hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <form onSubmit={lidarComReenvio} className="mt-6 space-y-4">
              <div>
                <label htmlFor="pedidoId" className="block text-sm font-bold text-emerald-200">
                  Código ou ID do Pedido
                </label>
                <input
                  type="text"
                  id="pedidoId"
                  value={pedidoId}
                  onChange={(e) => setPedidoId(e.target.value)}
                  placeholder="Ex: 67394abc..."
                  className="mt-2 w-full rounded-xl bg-white/10 p-4 font-semibold text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {mensagemReenvio && (
                <div
                  className={`rounded-xl p-4 text-sm font-bold ${mensagemReenvio.tipo === "sucesso"
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500"
                    : "bg-red-500/25 text-red-200 border border-red-500"
                    }`}
                >
                  {mensagemReenvio.texto}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalReenviarAberto(false);
                    setMensagemReenvio(null);
                    setPedidoId("");
                  }}
                  className="w-1/2 rounded-xl bg-white/10 py-4 font-bold transition hover:bg-white/15"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregandoReenvio}
                  className="w-1/2 rounded-xl bg-emerald-500 py-4 font-black text-emerald-950 shadow-lg transition hover:bg-emerald-400 disabled:opacity-55"
                >
                  {carregandoReenvio ? "Enviando..." : "Enviar por E-mail"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                ⭐ Experiência única
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
              Cascata do Avencal e as paisagens da Serra Catarinense de um point
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

              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

              <div className="relative z-10 hidden min-h-[620px] items-center p-10 md:flex">
                <div className="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-black/55 p-7 shadow-2xl backdrop-blur-md">
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                    Elevador Panorâmico
                  </p>

                  <h3 className="mt-3 text-4xl font-black leading-tight">
                    Uma experiência impressionante em Urubici
                  </h3>

                  <div className="mt-5 space-y-2 text-sm font-bold text-white/90">
                    <p>📏 100 metros de altura</p>
                    <p>🌄 Vista panorâmica</p>
                    <p>💧 Cascata do Avencal</p>
                    <p>📸 Cenário inesquecível</p>
                  </div>

                  <div className="mt-5 rounded-xl border border-orange-300/30 bg-orange-500/15 p-3 text-sm font-semibold leading-relaxed text-orange-50">
                    ⚠️ O ingresso do Elevador Panorâmico é vendido
                    separadamente do ingresso de entrada do Parque Mundo Novo.
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/ingressos/elevador")}
                      className="rounded-full bg-cyan-400 px-6 py-3 text-center font-black text-cyan-950 shadow-xl transition hover:-translate-y-1 hover:bg-cyan-300 active:scale-95"
                    >
                      🎟️ Comprar ingresso do Elevador
                    </button>

                    <p className="whitespace-nowrap text-2xl font-black">
                      R$ 75,00
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-cyan-200/20 bg-gradient-to-b from-[#07150f] to-[#0d2018] p-5 md:hidden">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                  Elevador Panorâmico
                </p>

                <h3 className="mt-3 text-3xl font-black leading-tight text-white">
                  Uma experiência impressionante em Urubici
                </h3>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold text-white/90">
                  <div className="rounded-xl bg-white/10 p-3">
                    📏 100 metros
                  </div>

                  <div className="rounded-xl bg-white/10 p-3">
                    🌄 Vista panorâmica
                  </div>

                  <div className="rounded-xl bg-white/10 p-3">
                    💧 Cascata do Avencal
                  </div>

                  <div className="rounded-xl bg-white/10 p-3">
                    📸 Cenário inesquecível
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-orange-300/30 bg-orange-500/15 p-4 text-sm font-semibold leading-relaxed text-orange-50">
                  ⚠️ O ingresso do Elevador Panorâmico é vendido separadamente
                  do ingresso de entrada do Parque Mundo Novo.
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/ingressos/elevador")}
                  className="mt-5 w-full rounded-full bg-cyan-400 px-6 py-4 text-center font-black text-cyan-950 shadow-xl transition active:scale-95"
                >
                  🎟️ Comprar ingresso do Elevador
                </button>

                <p className="mt-4 text-center text-3xl font-black text-white">
                  R$ 75,00
                </p>
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

              <h3 className="mt-4 text-xl font-black">
                Paisagem privilegiada
              </h3>

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
                className={`group relative min-h-[440px] overflow-hidden rounded-3xl border shadow-2xl ${item.tipoSelo === "verde"
                  ? "border-emerald-300/60"
                  : item.tipoSelo === "dourado"
                    ? "border-yellow-300/70"
                    : "border-white/20"
                  }`}
              >
                <img
                  src={item.imagem}
                  alt={item.titulo}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />

                {item.selo && (
                  <div
                    className={`absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.15em] shadow-lg ${item.tipoSelo === "dourado"
                      ? "bg-yellow-400 text-yellow-950"
                      : "bg-emerald-400 text-emerald-950"
                      }`}
                  >
                    {item.selo}
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
                    className={`mt-6 rounded-xl px-5 py-4 font-black shadow-lg transition hover:-translate-y-1 hover:bg-emerald-400`}
                  >
                    {item.botao}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planeje-sua-visita" className="px-4 py-20 text-zinc-800">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-600">
            Planeje sua Visita
          </p>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            Informações Úteis
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {planejamento.map((item) => (
              <div
                key={item.titulo}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl"
              >
                <div className="text-4xl">{item.icone}</div>

                <h3 className="mt-4 text-xl font-black text-zinc-900">
                  {item.titulo}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {item.texto}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-[2rem] bg-emerald-50 p-5 font-semibold text-emerald-950">
            <p>
              Passados os 7 dias ou após a utilização do ingresso, não é
              possível solicitar reembolso.
            </p>
            <p className="mt-2">
              Entre em contato pelo{" "}
              <a
                href="https://wa.me/5549991299991?text=Olá!%20Gostaria%20de%20solicitar%20o%20reembolso%20de%20um%20ingresso."
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-800 hover:underline font-bold transition"
              >
                WhatsApp (49) 99129-9991
              </a>{" "}
              informando o número do pedido. O reembolso é feito pelo mesmo meio de
              pagamento utilizado na compra e pode levar alguns dias úteis,
              conforme prazo do banco ou operadora.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 text-zinc-800">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-600">
            Dúvidas Frequentes
          </p>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">FAQ</h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {perguntas.map((item) => (
              <div
                key={item.pergunta}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl"
              >
                <h3 className="text-lg font-black text-zinc-900">
                  {item.pergunta}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {item.resposta}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-emerald-950/15 bg-zinc-50 px-4 py-16 text-zinc-600">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow"
              />

              <div>
                <p className="text-base font-black text-zinc-900">
                  Parque Mundo Novo
                </p>

                <p className="text-xs text-zinc-500">Site oficial de ingressos</p>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-zinc-500">
              Parque ecológico localizado em Urubici, na Serra Catarinense.
            </p>

            <p className="mt-4 text-xs font-bold text-yellow-600">
              {avaliacaoGoogle}
            </p>
          </div>

          <div>
            <p className="text-lg font-black text-zinc-900">Contato</p>

            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center gap-2">
                📍 SC-110 KM 34 - Urubici/SC
              </p>

              {/* RODAPÉ DO WHATSAPP CORRIGIDO E CLICÁVEL AQUI */}
              <p className="flex items-center gap-2">
                <a
                  href="https://wa.me/5549991299991?text=Olá!%20Gostaria%20de%20tirar%20uma%20dúvida%20sobre%20o%20Parque%20Mundo%20Novo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-zinc-600 hover:text-emerald-600 transition font-semibold"
                >
                  💬 (49) 99129-9991 (WhatsApp)
                </a>
              </p>

              <p className="flex items-center gap-2">
                📧 ingressosparquemundonovo@gmail.com
              </p>

              <p className="flex items-center gap-2">
                🕒 Todos os dias das 08h às 17h30
              </p>
            </div>
          </div>

          <div>
            <p className="text-lg font-black text-zinc-900">Links</p>

            <div className="mt-4 space-y-3 text-sm">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition hover:text-zinc-900"
              >
                📸 Instagram
              </a>

              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block transition hover:text-zinc-900"
              >
                📘 Facebook
              </a>

              <a href="/privacidade" className="block transition hover:text-zinc-900">
                Política de Privacidade
              </a>

              <a href="/termos" className="block transition hover:text-zinc-900">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-zinc-200 pt-8 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Parque Mundo Novo - Todos os direitos reservados
        </div>
      </footer>
    </main>
  );
}