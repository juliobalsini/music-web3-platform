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
  // Headers de segurança (auditoria semanal: scripts/auditoria-seguranca.mjs). CSP completa fica como proposta
  // (exige nonces por causa dos scripts inline do Next); aqui só diretivas que não quebram a página.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        ],
      },
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
