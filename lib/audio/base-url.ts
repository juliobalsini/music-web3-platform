/**
 * Base pública do proxy de áudio (Cloudflare Worker `radioon-audio`, workers.dev).
 * É uma URL pública, então vive no código; `NEXT_PUBLIC_AUDIO_BASE_URL` só sobrescreve (ex.: outro Worker).
 * Vazio cai no padrão; o valor "off" desliga o proxy (volta às URLs assinadas do B2).
 */
export const AUDIO_BASE_URL_PADRAO = "https://radioon-audio.radioon.workers.dev";

/**
 * Proxy DESLIGADO por padrão enquanto o Worker não estiver saudável (2026-11-12: respondia 503 sem as chaves B2).
 * Religar: trocar para true após `curl <worker>/a/<chave>` responder 200/206.
 */
export const PROXY_LIGADO_POR_PADRAO = false;

export function resolverAudioBaseUrl(env: string | undefined): string | undefined {
  const v = env?.trim();
  if (v === "off") return undefined;
  if (v) return v.replace(/\/+$/, "");
  return PROXY_LIGADO_POR_PADRAO ? AUDIO_BASE_URL_PADRAO : undefined;
}
