// Fase 2: validação e moderação básica de comentários de story (puro; testável).

export const MAX_COMENTARIO = 140;
export const LIMITE_POR_MINUTO = 5;

export const REACOES = ["🔥", "😍", "👏", "🎶", "🎧", "😮"] as const;
export const FIGURINHAS = ["No repeat", "Que solo", "Hino", "Arrepiou"] as const;

export type TipoComentario = "texto" | "reacao" | "figurinha";

// Lista curta e deliberadamente básica (pt-BR); compara sem acento, em minúsculas, por palavra inteira ou radical.
const OFENSIVAS = ["porra", "caralho", "merda", "puta", "viado", "otario", "idiota", "imbecil", "babaca", "fdp", "arrombado", "vagabund", "desgraca", "retardado", "nazi"];

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Verdadeiro se o texto tem palavra ofensiva (inclui variações com símbolos no meio, ex.: "m3rda"). */
export function temOfensa(texto: string): boolean {
  const limpo = semAcento(texto).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/@/g, "a");
  const palavras = limpo.split(/[^a-z]+/).filter(Boolean);
  const junto = palavras.join("");
  return OFENSIVAS.some((o) => palavras.some((p) => p === o || (o.length >= 7 && p.startsWith(o))) || (o.length >= 5 && junto.includes(o)));
}

export function parseComentario(raw: unknown): { ok: true; kind: TipoComentario; body: string } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "corpo inválido" };
  const b = raw as Record<string, unknown>;
  const kind = b.kind ?? "texto";
  if (typeof b.body !== "string") return { ok: false, error: "comentário vazio" };
  const body = b.body.trim().replace(/\s+/g, " ");
  if (!body) return { ok: false, error: "comentário vazio" };
  if (kind === "reacao") return (REACOES as readonly string[]).includes(body) ? { ok: true, kind, body } : { ok: false, error: "reação inválida" };
  if (kind === "figurinha") return (FIGURINHAS as readonly string[]).includes(body) ? { ok: true, kind, body } : { ok: false, error: "figurinha inválida" };
  if (kind !== "texto") return { ok: false, error: "tipo inválido" };
  if (body.length > MAX_COMENTARIO) return { ok: false, error: `até ${MAX_COMENTARIO} caracteres` };
  if (temOfensa(body)) return { ok: false, error: "linguagem ofensiva não é permitida" };
  return { ok: true, kind: "texto", body };
}

export const excedeFrequencia = (recentes: number) => recentes >= LIMITE_POR_MINUTO;
/** Denúncias distintas para ocultar um comentário. */
export const LIMITE_DENUNCIAS_COMENTARIO = 3;
