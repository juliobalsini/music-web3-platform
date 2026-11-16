// Regras puras do hub de playlists (#122, fase 2, item 1). Só contagens: nenhuma regra recebe
// quem salvou ou quem segue (o servidor lê só `playlist_id`/`followed_id` com service_role).

const SEMANA = 7 * 24 * 3600 * 1000;

/** Cada seção do hub só aparece com pelo menos este número de itens (nada de seção rala nem dado falso). */
export const HUB_MINIMO = 3;

export type PlaylistDoHub = {
  id: string;
  curatorId: string;
  /** Itens visíveis (ocultos já removidos) com a data em que entraram na playlist. */
  itens: { trackId: string; addedAt: string | null }[];
};
export type Salvamento = { playlistId: string; createdAt: string };

export const secaoVisivel = (lista: unknown[], minimo = HUB_MINIMO) => lista.length >= minimo;

/** Em alta: playlists mais salvas nos últimos 7 dias (só as que tiveram salvamento na semana). */
export function emAltaPorSalvamentos(playlists: PlaylistDoHub[], salvamentos: Salvamento[], agora: number, limite = 10): { id: string; salvos: number }[] {
  const ids = new Set(playlists.map((p) => p.id));
  const n = new Map<string, number>();
  for (const s of salvamentos) {
    const t = Date.parse(s.createdAt);
    if (!ids.has(s.playlistId) || !(agora - t < SEMANA) || t > agora) continue;
    n.set(s.playlistId, (n.get(s.playlistId) ?? 0) + 1);
  }
  return [...n.entries()]
    .map(([id, salvos]) => ({ id, salvos }))
    .sort((a, b) => b.salvos - a.salvos || a.id.localeCompare(b.id))
    .slice(0, limite);
}

export type PlaylisterDestaque = { id: string; salvos: number; seguidores: number; playlists: number; topPlaylistId: string };

/**
 * Playlisters em destaque: soma dos salvamentos das playlists públicas da pessoa + seguidores.
 * Só entra quem tem playlist pública com faixas e pontuação > 0; a playlist mais salva vira o atalho.
 */
export function playlistersEmDestaque(
  playlists: PlaylistDoHub[],
  salvamentos: Salvamento[],
  seguidores: Map<string, number>,
  limite = 8,
): PlaylisterDestaque[] {
  const salvosPorPlaylist = new Map<string, number>();
  for (const s of salvamentos) salvosPorPlaylist.set(s.playlistId, (salvosPorPlaylist.get(s.playlistId) ?? 0) + 1);
  const por = new Map<string, PlaylisterDestaque & { topSalvos: number }>();
  for (const p of playlists) {
    if (p.itens.length === 0) continue;
    const salvos = salvosPorPlaylist.get(p.id) ?? 0;
    const r = por.get(p.curatorId) ?? { id: p.curatorId, salvos: 0, seguidores: seguidores.get(p.curatorId) ?? 0, playlists: 0, topPlaylistId: p.id, topSalvos: -1 };
    r.salvos += salvos;
    r.playlists += 1;
    if (salvos > r.topSalvos) {
      r.topSalvos = salvos;
      r.topPlaylistId = p.id;
    }
    por.set(p.curatorId, r);
  }
  return [...por.values()]
    .filter((r) => r.salvos + r.seguidores > 0)
    .sort((a, b) => b.salvos + b.seguidores - (a.salvos + a.seguidores) || b.salvos - a.salvos || a.id.localeCompare(b.id))
    .slice(0, limite)
    .map((r) => ({ id: r.id, salvos: r.salvos, seguidores: r.seguidores, playlists: r.playlists, topPlaylistId: r.topPlaylistId }));
}

export type ArtistaPlaylistado = { id: string; posicao: number; playlists: number };

/**
 * Mais playlistados: artistas cujas faixas entraram em mais playlists públicas **de outras pessoas**
 * nos últimos 7 dias (cada playlist conta uma vez por artista). Empate divide a mesma posição.
 */
export function maisPlaylistados(
  playlists: PlaylistDoHub[],
  artistaDaFaixa: Map<string, string>,
  agora: number,
  limite = 10,
): ArtistaPlaylistado[] {
  const por = new Map<string, Set<string>>();
  for (const p of playlists) {
    for (const it of p.itens) {
      const artista = artistaDaFaixa.get(it.trackId);
      if (!artista || artista === p.curatorId || !it.addedAt) continue;
      const t = Date.parse(it.addedAt);
      if (!(agora - t < SEMANA) || t > agora) continue;
      const s = por.get(artista) ?? new Set<string>();
      s.add(p.id);
      por.set(artista, s);
    }
  }
  const lista = [...por.entries()]
    .map(([id, s]) => ({ id, playlists: s.size }))
    .sort((a, b) => b.playlists - a.playlists || a.id.localeCompare(b.id))
    .slice(0, limite);
  let posicao = 0;
  return lista.map((a, i) => {
    if (i === 0 || a.playlists !== lista[i - 1].playlists) posicao = i + 1;
    return { ...a, posicao };
  });
}

export const vezes = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
