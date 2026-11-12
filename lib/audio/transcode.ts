// Regras puras da entrega de áudio (sem dependência de servidor; testáveis).

export const LIMITE_BITRATE_KBPS = 256;
export const ALVO_LUFS = -14;
export const GANHO_MAX_DB = 6;
export const TENTATIVAS_MAX = 3;
export const PREFIXO_STREAM = "audio/stream/";

const SEM_PERDA = new Set(["wav", "pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le", "flac", "alac", "aiff", "pcm_s16be", "pcm_s24be"]);
const COM_PERDA = new Set(["mp3", "aac", "vorbis", "opus"]);

export type Sonda = { codec: string; bitrateKbps: number | null; sampleRate: number };
export type Plano =
  | { acao: "aac192"; sampleRate: number }
  | { acao: "original"; remuxM4a: boolean };

/**
 * Decide o que fazer com o original. Sem filtro de áudio em nenhum caso.
 * - sem perda ou lossy ≥ 256 kbps → AAC-LC 192 kbps (taxa original, no máx. 48 kHz);
 * - lossy < 256 kbps → NÃO recodifica (remux para .m4a só se já for AAC);
 * - codec desconhecido ou bitrate ilegível → mantém o original (opção segura).
 */
export function planejar(s: Sonda): Plano {
  const codec = s.codec.toLowerCase();
  if (SEM_PERDA.has(codec) || codec.startsWith("pcm_")) return { acao: "aac192", sampleRate: Math.min(s.sampleRate || 44100, 48000) };
  if (COM_PERDA.has(codec) && s.bitrateKbps != null) {
    if (s.bitrateKbps >= LIMITE_BITRATE_KBPS) return { acao: "aac192", sampleRate: Math.min(s.sampleRate || 44100, 48000) };
    return { acao: "original", remuxM4a: codec === "aac" };
  }
  return { acao: "original", remuxM4a: false };
}

export function chaveStream(trackId: string): string {
  return `${PREFIXO_STREAM}${trackId}.m4a`;
}

/** Ganho (dB) para levar a faixa a ALVO_LUFS, limitado a +GANHO_MAX_DB; sem medição, 0. */
export function ganhoDb(lufs: number | null | undefined): number {
  if (lufs == null || !Number.isFinite(lufs)) return 0;
  return Math.min(GANHO_MAX_DB, ALVO_LUFS - lufs);
}

export const dbParaLinear = (db: number) => 10 ** (db / 20);

/** Extrai a loudness integrada (I:) do resumo do filtro ebur128 do ffmpeg. */
export function lerLufs(saida: string): number | null {
  const i = saida.lastIndexOf("Integrated loudness");
  const trecho = i >= 0 ? saida.slice(i) : saida;
  const m = /\bI:\s+(-?\d+(?:\.\d+)?)\s+LUFS/.exec(trecho);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v > -70 ? v : null;
}

/** Faixas pendentes: NULL (backfill implícito) ou 'pending'. Usa a URL do PostgREST. */
export const FILTRO_PENDENTES = "or=(transcode_status.is.null,transcode_status.eq.pending)";

/** Escolhe o objeto a tocar: stream só com transcode concluído. */
export function chaveDeReproducao(t: { r2_key: string; stream_path?: string | null; transcode_status?: string | null }): string {
  return t.transcode_status === "done" && t.stream_path ? t.stream_path : t.r2_key;
}
