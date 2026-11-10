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

export type ItemOrdem = { trackId: string; position: number };

/**
 * Troca a faixa com a vizinha na direção pedida. Devolve as novas posições (só das duas
 * faixas) ou null se já estiver na ponta ou a faixa não existir.
 */
export function trocarPosicao(itens: ItemOrdem[], trackId: string, dir: "up" | "down"): [ItemOrdem, ItemOrdem] | null {
  const ord = [...itens].sort((a, b) => a.position - b.position);
  const i = ord.findIndex((x) => x.trackId === trackId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ord.length) return null;
  return [
    { trackId: ord[i].trackId, position: ord[j].position },
    { trackId: ord[j].trackId, position: ord[i].position },
  ];
}
