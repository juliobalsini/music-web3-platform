import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "radioOn",
    short_name: "radioOn",
    description: "Música para os melhores ouvintes.",
    start_url: "/",
    display: "standalone",
    background_color: "#00112a",
    theme_color: "#00112a",
    lang: "pt-BR",
    id: "/",
    scope: "/",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icons/icon-any-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-any-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Web Share Target: "Compartilhar" áudio do WhatsApp/Arquivos → radioOn → envio de faixa.
    share_target: {
      action: "/compartilhar",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "titulo",
        files: [
          {
            name: "arquivo",
            accept: ["audio/*", "video/mp4", ".mp3", ".m4a", ".aac", ".ogg", ".flac", ".wav", ".mp4"],
          },
        ],
      },
    },
  };
}
