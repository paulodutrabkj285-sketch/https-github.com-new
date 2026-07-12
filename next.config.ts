import type { NextConfig } from "next";

const VENDAS_SUSPENSAS = true;

const nextConfig: NextConfig = {
  async redirects() {
    if (!VENDAS_SUSPENSAS) {
      return [];
    }

    return [
      {
        source: "/ingressos/parque",
        destination: "/vendas-temporariamente-suspensas",
        permanent: false,
      },
      {
        source: "/ingressos/idoso",
        destination: "/vendas-temporariamente-suspensas",
        permanent: false,
      },
      {
        source: "/ingressos/camping",
        destination: "/vendas-temporariamente-suspensas",
        permanent: false,
      },
      {
        source: "/ingressos/elevador",
        destination: "/vendas-temporariamente-suspensas",
        permanent: false,
      },
      {
        source: "/checkout/resumo",
        destination: "/vendas-temporariamente-suspensas",
        permanent: false,
      },
      {
        source: "/checkout/pagamento",
        destination: "/vendas-temporariamente-suspensas",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;