const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Título de playlist: 1–200 caracteres após o trim (mesmo limite do banco). */
export function parseTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length >= 1 && v.length <= 200 ? v : null;
}

export type PlaylistResumo = { id: string; title: string; createdAt: string; trackCount: number };

/** Ranking: mais faixas primeiro; empate → mais recente. Ignora playlists vazias. */
export function rankPlaylists<T extends PlaylistResumo>(lista: T[]): T[] {
  return lista
    .filter((p) => p.trackCount > 0)
    .sort((a, b) => b.trackCount - a.trackCount || b.createdAt.localeCompare(a.createdAt));
}
