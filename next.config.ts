import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // "Minha rádio" substitui Métricas e Pontos.
  async redirects() {
    return [
      { source: "/metricas", destination: "/minha-radio", permanent: true },
      { source: "/pontos", destination: "/minha-radio", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
