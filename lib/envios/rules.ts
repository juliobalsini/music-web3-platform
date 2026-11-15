// Regras puras da exclusão lógica (Meus envios). Testáveis, sem servidor.

export const TIPOS_ENVIO = ["faixa", "album", "playlist", "story"] as const;
export type TipoEnvio = (typeof TIPOS_ENVIO)[number];

/** Prazo para desfazer um "Apagar" (dias). Depois disso o item só sai do banco/bucket na limpeza pós-beta. */
export const DIAS_DESFAZER = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

export function isTipoEnvio(v: unknown): v is TipoEnvio {
  return typeof v === "string" && (TIPOS_ENVIO as readonly string[]).includes(v);
}

/** Tabela e coluna do dono de cada tipo (o servidor sempre filtra pelo dono antes de escrever). */
export const TABELA: Record<TipoEnvio, { tabela: "tracks" | "albums" | "playlists" | "stories"; dono: string }> = {
  faixa: { tabela: "tracks", dono: "artist_id" },
  album: { tabela: "albums", dono: "artist_id" },
  playlist: { tabela: "playlists", dono: "curator_id" },
  story: { tabela: "stories", dono: "author_id" },
};

/** Ainda dá para desfazer? `deletedAt` vem do banco (ISO). Data inválida → não. */
export function podeDesfazer(deletedAt: string | null | undefined, agora = Date.now()): boolean {
  if (!deletedAt) return false;
  const t = Date.parse(deletedAt);
  if (Number.isNaN(t)) return false;
  return agora - t < DIAS_DESFAZER * DIA_MS;
}

/** Dias inteiros que restam para desfazer (mínimo 0; "hoje" conta como 1 enquanto houver prazo). */
export function diasRestantes(deletedAt: string, agora = Date.now()): number {
  const t = Date.parse(deletedAt);
  if (Number.isNaN(t)) return 0;
  const resta = t + DIAS_DESFAZER * DIA_MS - agora;
  return resta <= 0 ? 0 : Math.ceil(resta / DIA_MS);
}

/** Limite inferior (ISO) de deleted_at para a lista "Apagados" (só o que ainda dá para desfazer). */
export function inicioJanela(agora = Date.now()): string {
  return new Date(agora - DIAS_DESFAZER * DIA_MS).toISOString();
}

export const ROTULO_TIPO: Record<TipoEnvio, string> = { faixa: "Faixa", album: "Álbum/EP", playlist: "Playlist", story: "Story" };

/** Limite do título por tipo (o mesmo do banco): faixa 200, álbum 120. */
export const MAX_TITULO: Record<"faixa" | "album", number> = { faixa: 200, album: 120 };

/** Título editado: trim, 1..max caracteres, sem quebras de linha. Inválido → null. */
export function parseTituloEnvio(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t.length >= 1 && t.length <= max ? t : null;
}
