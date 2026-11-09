import "server-only";

import { createClient } from "@/lib/supabase/server";

import { rankPlaylists, type PlaylistResumo } from "./rules";

type Linha = { id: string; title: string; created_at: string; playlist_tracks: { count: number }[] };

function resumir(l: Linha): PlaylistResumo {
  return { id: l.id, title: l.title, createdAt: l.created_at, trackCount: l.playlist_tracks[0]?.count ?? 0 };
}

/** Playlists públicas ranqueadas. Falha de banco → lista vazia (home nunca quebra). */
export async function listarPlaylistsPublicas(limite = 12): Promise<PlaylistResumo[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("playlists")
      .select("id,title,created_at,playlist_tracks(count)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(100);
    return rankPlaylists(((data ?? []) as Linha[]).map(resumir)).slice(0, limite);
  } catch {
    return [];
  }
}

export async function obterPlaylist(id: string) {
  try {
    const supabase = await createClient();
    const { data: p } = await supabase
      .from("playlists")
      .select("id,title,curator_id,is_public")
      .eq("id", id)
      .maybeSingle();
    if (!p) return null;
    const { data: itens } = await supabase
      .from("playlist_tracks")
      .select("position,tracks(id,title,status)")
      .eq("playlist_id", id)
      .order("position");
    const faixas = (itens ?? [])
      .map((i) => (Array.isArray(i.tracks) ? i.tracks[0] : i.tracks))
      .filter((t): t is { id: string; title: string; status: string } => !!t && t.status === "published");
    return { id: p.id as string, title: p.title as string, faixas };
  } catch {
    return null;
  }
}
