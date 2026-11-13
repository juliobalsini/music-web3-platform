import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
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

export type PlaylistPagina = {
  id: string; title: string; description: string | null; curator: string | null; curatorId: string;
  isPublic: boolean; mine: boolean; saves: number; saved: boolean; faixas: FaixaDaPlaylist[];
};

export async function obterPlaylist(id: string): Promise<PlaylistPagina | null> {
  try {
    const supabase = await createClient();
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user && !u.user.is_anonymous ? u.user.id : null;
    // description vem de migration nova: sem ela cai para a leitura antiga.
    let lido: { data: unknown; error: unknown } = await supabase
      .from("playlists")
      .select("id,title,description,curator_id,is_public,profiles(display_name)")
      .eq("id", id)
      .maybeSingle();
    if (lido.error) {
      lido = await supabase.from("playlists").select("id,title,curator_id,is_public,profiles(display_name)").eq("id", id).maybeSingle();
    }
    const p = lido.data as { id: string; title: string; description?: string | null; curator_id: string; is_public: boolean; profiles: { display_name: string | null } | { display_name: string | null }[] | null } | null;
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
    const mine = uid === p.curator_id;
    const faixas: FaixaDaPlaylist[] = [];
    for (const i of (lidos.data ?? []) as unknown as {
      note: string | null; hidden?: boolean | null; featured?: boolean | null;
      tracks: { id: string; status: string } | { id: string; status: string }[] | null;
    }[]) {
      // Oculta só para o público; o dono (editor) vê tudo.
      if (i.hidden && !mine) continue;
      const t = Array.isArray(i.tracks) ? i.tracks[0] : i.tracks;
      if (t && t.status === "published") faixas.push({ id: t.id, note: i.note ?? null, featured: !!i.featured });
    }
    const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    // Contagem pública sem expor quem salvou: só o número, lido no servidor.
    let saves = 0;
    try {
      const { count } = await createAdminClient().from("playlist_saves").select("user_id", { count: "exact", head: true }).eq("playlist_id", id);
      saves = count ?? 0;
    } catch {}
    let saved = false;
    if (uid) {
      const { data: s } = await supabase.from("playlist_saves").select("playlist_id").eq("playlist_id", id).eq("user_id", uid).maybeSingle();
      saved = !!s;
    }
    return { id: p.id, title: p.title, description: p.description ?? null, curator: prof?.display_name ?? null, curatorId: p.curator_id, isPublic: !!p.is_public, mine, saves, saved, faixas };
  } catch {
    return null;
  }
}
