/**
 * Base pública do proxy de áudio (Cloudflare Worker `radioon-audio`, workers.dev).
 * É uma URL pública, então vive no código; `NEXT_PUBLIC_AUDIO_BASE_URL` só sobrescreve (ex.: outro Worker).
 * Vazio cai no padrão; o valor "off" desliga o proxy (volta às URLs assinadas do B2).
 */
export const AUDIO_BASE_URL_PADRAO = "https://radioon-audio.radioon.workers.dev";

export function resolverAudioBaseUrl(env: string | undefined): string | undefined {
  const v = env?.trim();
  if (v === "off") return undefined;
  return (v || AUDIO_BASE_URL_PADRAO).replace(/\/+$/, "");
}
