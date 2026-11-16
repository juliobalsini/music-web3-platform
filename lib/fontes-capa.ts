import { Bebas_Neue, Fraunces } from "next/font/google";

// Fontes extras do mini editor de capa (self-hosted pelo next/font, sem serviço externo em produção).
// Só o editor importa este módulo; `preload: false` evita baixar as fontes nas outras páginas.
export const fonteSerifa = Fraunces({ subsets: ["latin"], weight: ["600"], display: "swap", preload: false });
export const fonteCartaz = Bebas_Neue({ subsets: ["latin"], weight: ["400"], display: "swap", preload: false });
