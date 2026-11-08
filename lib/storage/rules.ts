// Regras puras de upload (sem dependência de servidor; testáveis).
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const UPLOAD_TTL_SECONDS = 10 * 60;
export const PLAYBACK_TTL_SECONDS = 60 * 60;

export type UploadInput = {
  title: string;
  contentType: string;
  size: number;
  rightsConfirmed: boolean;
  durationSec: number | null;
};

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
  return {
    ok: true,
    value: {
      title,
      contentType: b.contentType,
      size: b.size,
      rightsConfirmed: true,
      durationSec,
    },
  };
}

export function trackKey(artistId: string, uuid: string): string {
  return `tracks/${artistId}/${uuid}`;
}
