/**
 * Base pública do proxy de áudio (Cloudflare Worker `radioon-audio`, workers.dev).
 * É uma URL pública, então vive no código; `NEXT_PUBLIC_AUDIO_BASE_URL` só sobrescreve (ex.: outro Worker).
 * Vazio cai no padrão; o valor "off" desliga o proxy (volta às URLs assinadas do B2).
 */
export const AUDIO_BASE_URL_PADRAO = "https://radioon-audio.radioon.workers.dev";

/**
 * Proxy LIGADO por padrão desde 2026-11-14: o Worker respondeu 200/206 (KV HIT) após o redeploy (DECISIONS 93).
 * Emergência: trocar para false (ou `NEXT_PUBLIC_AUDIO_BASE_URL=off`) volta às URLs assinadas do B2.
 */
export const PROXY_LIGADO_POR_PADRAO = true;

export function resolverAudioBaseUrl(env: string | undefined): string | undefined {
  const v = env?.trim();
  if (v === "off") return undefined;
  if (v) return v.replace(/\/+$/, "");
  return PROXY_LIGADO_POR_PADRAO ? AUDIO_BASE_URL_PADRAO : undefined;
}
