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
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
