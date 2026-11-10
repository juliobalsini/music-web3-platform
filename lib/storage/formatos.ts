// Formatos de áudio aceitos no envio. Celulares (WhatsApp, Arquivos) costumam entregar `type` vazio
// ou genérico (ex.: M4A como audio/x-m4a), então a validação olha a extensão E o tipo.
export const EXTENSOES_AUDIO: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  wav: "audio/wav",
  mp4: "audio/mp4",
};

/** Valor do atributo `accept`: extensões explícitas (abre Arquivos/Downloads/WhatsApp) + tipos. */
export const ACCEPT_AUDIO = [
  ...Object.keys(EXTENSOES_AUDIO).map((e) => `.${e}`),
  "audio/*",
  "video/mp4",
].join(",");

const TIPOS_CONHECIDOS: Record<string, string> = {
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/mp4": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "video/mp4": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/x-aac": "audio/aac",
  "audio/ogg": "audio/ogg",
  "application/ogg": "audio/ogg",
  "audio/flac": "audio/flac",
  "audio/x-flac": "audio/flac",
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
};

/** Content-Type canônico (aceito pelo servidor) ou null se o arquivo não for um áudio aceito. */
export function tipoDeAudio(nome: string, tipo: string): string | null {
  const ext = nome.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const porExt = ext ? EXTENSOES_AUDIO[ext] : undefined;
  const porTipo = TIPOS_CONHECIDOS[tipo.toLowerCase().split(";")[0].trim()];
  return porExt ?? porTipo ?? null;
}

/** Dimensões finais da capa: lado maior ≤ max, sem ampliar. */
export function dimensoesCapa(w: number, h: number, max = 1200): { w: number; h: number } {
  const f = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
}

export const MAX_CAPA_ORIGINAL = 15 * 1024 * 1024;
