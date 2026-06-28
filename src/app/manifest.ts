import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Portaria Parque Mundo Novo",
        short_name: "Portaria PMN",
        description: "Sistema de validação de ingressos do Parque Mundo Novo",
        start_url: "/portaria",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#064e3b",
        theme_color: "#064e3b",
        icons: [
            {
                src: "/logo-final.png",
                sizes: "512x512",
                type: "image/png",
            },
            {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}