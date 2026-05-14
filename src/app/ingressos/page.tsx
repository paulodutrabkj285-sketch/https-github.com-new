"use client";

import Link from "next/link";

type IngressoCard = {
  titulo: string;
  descricao: string;
  precoPrincipal: string;
  precoSecundario?: string;
  href: string;
};

const ingressos: IngressoCard[] = [
  {
    titulo: "Ingresso Parque",
    descricao: "Entrada para visitar o parque na data escolhida.",
    precoPrincipal: "R$ 60,00",
    href: "/ingressos/parque",
  },
  {
    titulo: "Meia Entrada Idoso",
    descricao: "Ingresso com valor reduzido para idosos, com comprovação na entrada.",
    precoPrincipal: "R$ 30,00",
    href: "/ingressos/idoso",
  },
  {
    titulo: "Camping",
    descricao:
      "Hospedagem no camping do parque. 1ª diária por pessoa com valor integral e, a partir da 2ª diária, valor promocional.",
    precoPrincipal: "1ª diária: R$ 100,00 por pessoa",
    precoSecundario: "A partir da 2ª diária: R$ 80,00 por pessoa",
    href: "/ingressos/camping",
  },
  {
    titulo: "Elevador Panorâmico",
    descricao:
      "Experiência vendida separadamente, com possibilidade de remarcação ou crédito.",
    precoPrincipal: "R$ 75,00",
    href: "/ingressos/elevador",
  },
];

export default function IngressosPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #edf7ed, #ffffff)",
        padding: "28px 20px 50px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #5a7a60, #4f6f57)",
            borderRadius: "30px",
            padding: "36px",
            marginBottom: "34px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: "32px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: "24px",
                padding: "12px",
                minHeight: "170px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <img
                src="/logo-final.png"
                alt="Logo Parque Mundo Novo"
                style={{
                  width: "100%",
                  maxWidth: "145px",
                  height: "auto",
                  display: "block",
                  borderRadius: "14px",
                }}
              />
            </div>

            <div>
              <h1
                style={{
                  fontSize: "clamp(36px, 5vw, 62px)",
                  lineHeight: 1.05,
                  fontWeight: "bold",
                  color: "#ffffff",
                  margin: "0 0 18px 0",
                }}
              >
                Parque Mundo Novo
              </h1>

              <p
                style={{
                  fontSize: "clamp(19px, 2vw, 24px)",
                  color: "#f3f4f6",
                  lineHeight: 1.5,
                  margin: "0 0 10px 0",
                }}
              >
                Compre seu ingresso online com praticidade e organize sua visita com antecedência.
              </p>

              <p
                style={{
                  fontSize: "15px",
                  color: "#d1d5db",
                  margin: 0,
                }}
              >
                Tirolesa continua com venda no local.
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "24px",
          }}
        >
          {ingressos.map((item) => (
            <article
              key={item.titulo}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                padding: "28px",
                boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                border: "1px solid #dbe5db",
                display: "flex",
                flexDirection: "column",
                minHeight: "380px",
              }}
            >
              <h2
                style={{
                  fontSize: "clamp(28px, 2.2vw, 34px)",
                  fontWeight: "bold",
                  color: "#166534",
                  margin: "0 0 18px 0",
                  lineHeight: 1.2,
                }}
              >
                {item.titulo}
              </h2>

              <p
                style={{
                  color: "#374151",
                  fontSize: "18px",
                  lineHeight: 1.65,
                  margin: "0 0 24px 0",
                  flexGrow: 1,
                }}
              >
                {item.descricao}
              </p>

              <div style={{ marginBottom: "26px" }}>
                <p
                  style={{
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: "#111827",
                    margin: "0 0 10px 0",
                    lineHeight: 1.4,
                  }}
                >
                  {item.precoPrincipal}
                </p>

                {item.precoSecundario && (
                  <p
                    style={{
                      fontSize: "22px",
                      fontWeight: "bold",
                      color: "#111827",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.precoSecundario}
                  </p>
                )}
              </div>

              <Link
                href={item.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "fit-content",
                  padding: "16px 26px",
                  borderRadius: "16px",
                  backgroundColor: "#15803d",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                Comprar
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}