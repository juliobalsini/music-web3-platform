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

export type FaixaDaPlaylist = { id: string; note: string | null; featured: boolean };

export async function obterPlaylist(id: string) {
  try {
    const supabase = await createClient();
    const { data: p } = await supabase
      .from("playlists")
      .select("id,title,curator_id,is_public,profiles(display_name)")
      .eq("id", id)
      .maybeSingle();
    if (!p) return null;
    // hidden/featured vêm de migration nova: sem elas cai para a leitura antiga.
    let lidos: { data: unknown; error: unknown } = await supabase
      .from("playlist_tracks")
      .select("position,note,hidden,featured,tracks(id,title,status)")
      .eq("playlist_id", id)
      .order("position");
    if (lidos.error) {
      lidos = await supabase
        .from("playlist_tracks")
        .select("position,note,tracks(id,title,status)")
        .eq("playlist_id", id)
        .order("position");
    }
    const faixas: FaixaDaPlaylist[] = [];
    for (const i of (lidos.data ?? []) as unknown as {
      note: string | null; hidden?: boolean | null; featured?: boolean | null;
      tracks: { id: string; status: string } | { id: string; status: string }[] | null;
    }[]) {
      if (i.hidden) continue;
      const t = Array.isArray(i.tracks) ? i.tracks[0] : i.tracks;
      if (t && t.status === "published") faixas.push({ id: t.id, note: i.note ?? null, featured: !!i.featured });
    }
    const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return { id: p.id as string, title: p.title as string, curator: (prof?.display_name as string | null) ?? null, curatorId: p.curator_id as string, faixas };
  } catch {
    return null;
  }
}
