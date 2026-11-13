// Regras puras de upload (sem dependência de servidor; testáveis).
import { lerClima, lerGenero, type ClimaId, type GeneroId } from "../radio/generos.ts";

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/wav",
] as const;
export const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_COVER_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_TTL_SECONDS = 10 * 60;
export const PLAYBACK_TTL_SECONDS = 60 * 60;

export type UploadInput = {
  title: string;
  contentType: string;
  size: number;
  rightsConfirmed: boolean;
  durationSec: number | null;
  /** Capa opcional (imagem no bucket); sem capa a arte é gerada a partir do título. */
  cover: { contentType: string; size: number } | null;
  /** Ficha técnica opcional. */
  credits: { composer: string | null; performers: string | null; album: string | null; label: string | null };
  /** Gênero (lista fixa) e clima (seis valores), opcionais. */
  genre: GeneroId | null;
  mood: ClimaId | null;
  /** Chave de idempotência do envio (gerada no cliente, por tentativa de envio). */
  uploadKey: string | null;
};

export const UPLOAD_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
export function lerUploadKey(v: unknown): string | null | undefined {
  if (v == null || v === "") return null;
  return typeof v === "string" && UPLOAD_KEY_RE.test(v) ? v : undefined;
}
/** Minutos sem publicar para uma faixa "processing" ser considerada travada (a URL de upload vale 10 min). */
export const TRAVADA_APOS_MIN = 15;

const LIMITES_FICHA = { composer: 120, performers: 200, album: 120, label: 120 } as const;

export function parseUploadInput(
  raw: unknown,
): { ok: true; value: UploadInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "corpo inválido" };
  const b = raw as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (title.length < 1 || title.length > 200) return { ok: false, error: "título inválido" };
  if (
    typeof b.contentType !== "string" ||
    !(ALLOWED_AUDIO_TYPES as readonly string[]).includes(b.contentType)
  ) {
    return { ok: false, error: "formato de áudio não aceito" };
  }
  if (
    typeof b.size !== "number" ||
    !Number.isInteger(b.size) ||
    b.size <= 0 ||
    b.size > MAX_UPLOAD_BYTES
  ) {
    return { ok: false, error: "arquivo vazio ou maior que 25 MB" };
  }
  if (b.rightsConfirmed !== true) {
    return { ok: false, error: "confirme que você detém os direitos da faixa" };
  }
  let durationSec: number | null = null;
  if (b.durationSec != null) {
    if (
      typeof b.durationSec !== "number" ||
      !Number.isInteger(b.durationSec) ||
      b.durationSec <= 0 ||
      b.durationSec > 24 * 3600
    ) {
      return { ok: false, error: "duração inválida" };
    }
    durationSec = b.durationSec;
  }
  let cover: UploadInput["cover"] = null;
  if (b.cover != null) {
    const c = b.cover as Record<string, unknown>;
    if (
      typeof c !== "object" ||
      typeof c.contentType !== "string" ||
      !(ALLOWED_COVER_TYPES as readonly string[]).includes(c.contentType)
    ) {
      return { ok: false, error: "formato de capa não aceito" };
    }
    if (typeof c.size !== "number" || !Number.isInteger(c.size) || c.size <= 0 || c.size > MAX_COVER_BYTES) {
      return { ok: false, error: "capa vazia ou maior que 2 MB" };
    }
    cover = { contentType: c.contentType, size: c.size };
  }
  const entrada = (typeof b.credits === "object" && b.credits !== null ? b.credits : {}) as Record<string, unknown>;
  const credits = { composer: null, performers: null, album: null, label: null } as UploadInput["credits"];
  for (const campo of Object.keys(LIMITES_FICHA) as (keyof typeof LIMITES_FICHA)[]) {
    const v = entrada[campo];
    if (v == null || v === "") continue;
    if (typeof v !== "string") return { ok: false, error: "ficha técnica inválida" };
    const t = v.trim();
    if (t.length > LIMITES_FICHA[campo]) return { ok: false, error: "ficha técnica inválida" };
    credits[campo] = t || null;
  }
  const genre = lerGenero(b.genre);
  if (genre === undefined) return { ok: false, error: "gênero inválido" };
  const mood = lerClima(b.mood);
  if (mood === undefined) return { ok: false, error: "clima inválido" };
  const uploadKey = lerUploadKey(b.uploadKey);
  if (uploadKey === undefined) return { ok: false, error: "chave de envio inválida" };
  return {
    ok: true,
    value: {
      uploadKey,
      title,
      contentType: b.contentType,
      size: b.size,
      rightsConfirmed: true,
      durationSec,
      cover,
      credits,
      genre,
      mood,
    },
  };
}

export function trackKey(artistId: string, uuid: string): string {
  return `tracks/${artistId}/${uuid}`;
}

export function coverKey(artistId: string, uuid: string): string {
  return `covers/${artistId}/${uuid}`;
}

/**
 * URL do proxy de áudio (Cloudflare Worker) para uma chave do bucket; `undefined` sem a variável
 * (fallback: URL assinada do B2). O Worker só serve audio/stream/, covers/ e stories/; originais em tracks/ só por URL assinada.
 */
export function urlDoProxy(key: string, base: string | undefined): string | undefined {
  const b = base?.trim().replace(/\/+$/, "");
  if (!b || !/^https:\/\//.test(b)) return undefined;
  if (!/^(audio\/stream|covers|stories)\//.test(key)) return undefined;
  return `${b}/a/${key.split("/").map(encodeURIComponent).join("/")}`;
}
