// Instalação do app (PWA): funções puras, testáveis sem navegador (issue #206).

/**
 * Como instalar neste navegador:
 * - `interno`: navegador dentro de outro app (WhatsApp, Instagram, Facebook...): não instala; abrir no navegador.
 * - `ios`: iPhone/iPad: só pelo Compartilhar → Adicionar à Tela de Início (não há instalação por botão).
 * - `android`: Android sem o evento de instalação (ainda): passos pelo menu ⋮ do navegador.
 * - `outro`: computador sem suporte: não mostrar nada.
 */
export type Plataforma = "interno" | "ios" | "android" | "outro";

const INTERNO = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|LinkedInApp|Twitter/i;

export function plataformaDe(ua: string, toques = 0): Plataforma {
  if (INTERNO.test(ua)) return "interno";
  // iPadOS 13+ se apresenta como Mac; o toque denuncia.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && toques > 1)) return "ios";
  // WebView genérica do Android ("; wv)") também é navegador interno de algum app.
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return "interno";
  if (/Android/.test(ua)) return "android";
  return "outro";
}

/** Chaves no localStorage. */
export const CHAVE_VISITAS = "radioon_visitas";
export const CHAVE_FECHADO = "radioon_instalar_fechado";

/** O aviso some por 14 dias depois de fechado. */
export const PAUSA_AVISO_MS = 14 * 24 * 60 * 60 * 1000;

/** Aviso na Home: a partir da 2ª visita e fora da pausa de 14 dias depois de fechado. */
export function mostrarAviso({ visitas, fechadoEm, agora }: { visitas: number; fechadoEm: number | null; agora: number }): boolean {
  if (!(visitas >= 2)) return false;
  if (fechadoEm !== null && Number.isFinite(fechadoEm) && agora - fechadoEm < PAUSA_AVISO_MS) return false;
  return true;
}

/** Número guardado no localStorage (texto) → inteiro ≥ 0, ou null. */
export function lerNumero(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
