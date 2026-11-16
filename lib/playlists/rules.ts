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

/** Publicar exige pelo menos 5 faixas. */
export const MIN_FAIXAS_PUBLICAR = 5;

export function podePublicar(qtdFaixas: number): boolean {
  return qtdFaixas >= MIN_FAIXAS_PUBLICAR;
}

/** Título padrão do rascunho: "Minha playlist N" (N = quantas o usuário já tem + 1). */
export function tituloPadrao(jaTem: number): string {
  return `Minha playlist ${Math.max(0, jaTem) + 1}`;
}

/** Chave de criação idempotente: curta, só [A-Za-z0-9-]. */
export function parseCreateKey(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : null;
}

/** Descrição opcional: até 500 caracteres; vazio vira null; inválido vira undefined. */
export function parseDescricao(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (v.length > 500) return undefined;
  return v === "" ? null : v;
}

/** Move um item de `de` para `para` numa lista de ids (devolve cópia; índices inválidos não alteram). */
export function reordenar<T>(lista: T[], de: number, para: number): T[] {
  if (de < 0 || de >= lista.length || para < 0 || para >= lista.length || de === para) return [...lista];
  const c = [...lista];
  const [x] = c.splice(de, 1);
  c.splice(para, 0, x);
  return c;
}

/** Curadoria de uma faixa na playlist: nota curta, destaque e ocultar (só o público deixa de ver). */
export type Curadoria = { note: string | null; featured: boolean; hidden: boolean };
export const NOTA_MAX = 280;

/**
 * Valida uma mudança de curadoria vinda do cliente. Devolve só os campos válidos presentes;
 * `null` se houver campo inválido ou nenhum campo (nada a gravar).
 */
export function parseCuradoria(value: unknown): Partial<Curadoria> | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out: Partial<Curadoria> = {};
  for (const k of Object.keys(v)) if (k !== "note" && k !== "featured" && k !== "hidden") return null;
  if ("featured" in v) {
    if (typeof v.featured !== "boolean") return null;
    out.featured = v.featured;
  }
  if ("hidden" in v) {
    if (typeof v.hidden !== "boolean") return null;
    out.hidden = v.hidden;
  }
  if ("note" in v) {
    if (v.note === null) out.note = null;
    else if (typeof v.note === "string") {
      const t = v.note.trim();
      if (t.length > NOTA_MAX) return null;
      out.note = t === "" ? null : t;
    } else return null;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Linha de playlist_tracks com a playlist e a faixa embutidas (consulta de presença do artista). */
export type LinhaPresenca = {
  playlist_id: string;
  track_id: string;
  hidden?: boolean | null;
  playlists: { curator_id: string; is_public: boolean } | { curator_id: string; is_public: boolean }[] | null;
  tracks: { artist_id: string; status: string } | { artist_id: string; status: string }[] | null;
};

export type Presenca = { total: number; porFaixa: Map<string, number> };

const primeiro = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/**
 * "Sua faixa está em N playlists": conta playlists públicas de outras pessoas que contêm faixas publicadas
 * do artista. Ignora itens ocultos pelo playlister e as playlists do próprio artista. `total` = playlists
 * distintas; `porFaixa` = playlists distintas por faixa.
 */
export function contarPresenca(linhas: LinhaPresenca[], artistId: string): Presenca {
  const todas = new Set<string>();
  const porFaixa = new Map<string, Set<string>>();
  for (const l of linhas) {
    const p = primeiro(l.playlists);
    const t = primeiro(l.tracks);
    if (!p || !t || l.hidden === true) continue;
    if (!p.is_public || p.curator_id === artistId) continue;
    if (t.artist_id !== artistId || t.status !== "published") continue;
    todas.add(l.playlist_id);
    const s = porFaixa.get(l.track_id) ?? new Set<string>();
    s.add(l.playlist_id);
    porFaixa.set(l.track_id, s);
  }
  return { total: todas.size, porFaixa: new Map([...porFaixa].map(([k, s]) => [k, s.size])) };
}

/** Texto curto da presença: "Sua faixa está em 1 playlist" / "Suas faixas estão em 3 playlists". */
export function textoPresenca(total: number, faixas: number): string | null {
  if (total <= 0) return null;
  const pl = total === 1 ? "1 playlist" : `${total} playlists`;
  return faixas > 1 ? `Suas faixas estão em ${pl}` : `Sua faixa está em ${pl}`;
}

/** Rótulo do chip por faixa: "Em 1 playlist" / "Em 4 playlists". */
export function rotuloEmPlaylists(n: number): string | undefined {
  if (n <= 0) return undefined;
  return n === 1 ? "Em 1 playlist" : `Em ${n} playlists`;
}
