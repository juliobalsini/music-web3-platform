import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  descobertas,
  horaEmBrasilia,
  novidades,
  ouvindoAgora,
  programacao,
  rankingEmAlta,
  SEMANA,
  type FaixaListada,
  type ItemRanking,
  type Programa,
} from "./rules";

type Nome = { display_name: string | null } | { display_name: string | null }[] | null;
const nome = (p: Nome) => (Array.isArray(p) ? p[0]?.display_name : p?.display_name) ?? null;

export type PlaylisterResumo = { id: string; name: string; playlists: number; faixas: number; topPlaylistId: string };
export type PlaylistSemana = { id: string; title: string; curator: string | null; trackCount: number };

export type Radio = {
  faixas: FaixaListada[];
  emAlta: ItemRanking<FaixaListada>[];
  descobertas: FaixaListada[];
  novidades: FaixaListada[];
  playlisters: PlaylisterResumo[];
  playlists: PlaylistSemana[];
  programa: { atual: Programa | null; proximo: Programa | null };
  /** Faixa "No ar" e a fila que segue (faixas da playlist do programa; sem programa, a mais ouvida da semana). */
  noAr: { faixa: FaixaListada; fila: FaixaListada[] } | null;
  /** null = indisponível (sem service_role); a UI esconde o contador. */
  ouvindo: number | null;
};

const VAZIO: Radio = {
  faixas: [],
  emAlta: [],
  descobertas: [],
  novidades: [],
  playlisters: [],
  playlists: [],
  programa: { atual: null, proximo: null },
  noAr: null,
  ouvindo: null,
};

/** Tudo da Rádio numa leitura por requisição. Qualquer falha → o que deu para montar (nunca quebra a página). */
export const carregarRadio = cache(async (): Promise<Radio> => {
  await connection(); // dados por requisição: o relógio só pode ser lido depois disto (cacheComponents)
  try {
    const supabase = await createClient();
    const agora = Date.now();
    const [{ data: tracks }, { data: pls }, { data: progs }] = await Promise.all([
      supabase
        .from("tracks")
        .select("id,title,artist_id,duration_sec,cover_key,created_at,composer,performers,album,label,profiles(display_name)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("playlists")
        .select("id,title,curator_id,created_at,profiles(display_name),playlist_tracks(track_id,note,position)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("programs")
        .select("id,title,start_hour,end_hour,playlist_id,profiles(display_name)")
        .order("start_hour"),
    ]);

    // Agregados que o RLS não deixa o visitante ler: só contagens, via service_role no servidor.
    const plays = new Map<string, number>();
    const likes = new Map<string, number>();
    let escutas: { track_id: string; started_at: string }[] = [];
    let ouvindo: number | null = null;
    try {
      const admin = createAdminClient();
      const [v, l, o] = await Promise.all([
        admin
          .from("listen_events")
          .select("track_id,started_at")
          .eq("is_valid", true)
          .order("started_at", { ascending: false })
          .limit(20000),
        admin.from("track_reactions").select("track_id").eq("kind", "like").limit(20000),
        admin
          .from("listen_events")
          .select("user_id,last_beat_at")
          .gte("last_beat_at", new Date(agora - 3 * 60 * 1000).toISOString())
          .limit(2000),
      ]);
      escutas = (v.data ?? []) as typeof escutas;
      for (const e of escutas) plays.set(e.track_id, (plays.get(e.track_id) ?? 0) + 1);
      for (const r of (l.data ?? []) as { track_id: string }[]) likes.set(r.track_id, (likes.get(r.track_id) ?? 0) + 1);
      if (!v.error && !o.error) ouvindo = ouvindoAgora((o.data ?? []) as { user_id: string; last_beat_at: string | null }[], agora);
    } catch {
      /* sem service_role (prévias/testes): contagens zeradas */
    }

    type PL = {
      id: string; title: string; curator_id: string; created_at: string; profiles: Nome;
      playlist_tracks: { track_id: string; note: string | null; position: number }[];
    };
    const playlists = ((pls ?? []) as unknown as PL[]).filter((p) => p.playlist_tracks.length > 0);
    const emPlaylists = new Map<string, number>();
    const notas = new Map<string, { note: string; by: string | null }>();
    for (const p of playlists) {
      for (const it of p.playlist_tracks) {
        emPlaylists.set(it.track_id, (emPlaylists.get(it.track_id) ?? 0) + 1);
        if (it.note?.trim() && !notas.has(it.track_id)) notas.set(it.track_id, { note: it.note.trim(), by: nome(p.profiles) });
      }
    }

    type TR = {
      id: string; title: string; artist_id: string; duration_sec: number | null; cover_key: string | null;
      created_at: string; composer: string | null; performers: string | null; album: string | null; label: string | null;
      profiles: Nome;
    };
    const faixas: FaixaListada[] = ((tracks ?? []) as unknown as TR[]).map((t) => ({
      id: t.id,
      title: t.title,
      artistId: t.artist_id,
      artistName: nome(t.profiles) ?? "Artista",
      durationSec: t.duration_sec,
      hasCover: !!t.cover_key,
      createdAt: t.created_at,
      composer: t.composer,
      performers: t.performers,
      album: t.album,
      label: t.label,
      plays: plays.get(t.id) ?? 0,
      likes: likes.get(t.id) ?? 0,
      note: notas.get(t.id)?.note ?? null,
      playlister: notas.get(t.id)?.by ?? null,
    }));

    const porCurador = new Map<string, PlaylisterResumo>();
    for (const p of playlists) {
      const r = porCurador.get(p.curator_id) ?? { id: p.curator_id, name: nome(p.profiles) ?? "Playlister", playlists: 0, faixas: 0, topPlaylistId: p.id };
      r.playlists += 1;
      r.faixas += p.playlist_tracks.length;
      porCurador.set(p.curator_id, r);
    }
    const semana = playlists.filter((p) => agora - Date.parse(p.created_at) < SEMANA);
    const base = semana.length > 0 ? semana : playlists;

    type PG = { id: string; title: string; start_hour: number; end_hour: number; playlist_id: string; profiles: Nome };
    const programas: Programa[] = ((progs ?? []) as unknown as PG[]).map((p) => ({
      id: p.id, title: p.title, startHour: p.start_hour, endHour: p.end_hour,
      curatorName: nome(p.profiles), playlistId: p.playlist_id,
    }));

    const emAlta = rankingEmAlta(faixas, escutas, agora);
    const programa = programacao(programas, horaEmBrasilia(agora));
    const porId = new Map(faixas.map((f) => [f.id, f]));
    let noAr: Radio["noAr"] = null;
    const pl = programa.atual ? playlists.find((p) => p.id === programa.atual!.playlistId) : undefined;
    const doPrograma = pl
      ? [...pl.playlist_tracks].sort((a, b) => a.position - b.position).map((i) => porId.get(i.track_id)).filter((f): f is FaixaListada => !!f)
      : [];
    if (doPrograma.length > 0) {
      // Rodízio determinístico: a faixa muda a cada 10 min, igual para todos os ouvintes.
      const i = Math.floor(agora / 600_000) % doPrograma.length;
      noAr = { faixa: doPrograma[i], fila: [...doPrograma.slice(i), ...doPrograma.slice(0, i)] };
    } else if (faixas.length > 0) {
      const base = emAlta[0]?.faixa ?? faixas[0];
      noAr = { faixa: base, fila: [base, ...faixas.filter((f) => f.id !== base.id)] };
    }

    return {
      faixas,
      noAr,
      emAlta,
      descobertas: descobertas(faixas, plays, emPlaylists),
      novidades: novidades(faixas),
      playlisters: [...porCurador.values()].sort((a, b) => b.faixas - a.faixas || b.playlists - a.playlists).slice(0, 8),
      playlists: base
        .sort((a, b) => b.playlist_tracks.length - a.playlist_tracks.length || b.created_at.localeCompare(a.created_at))
        .slice(0, 8)
        .map((p) => ({ id: p.id, title: p.title, curator: nome(p.profiles), trackCount: p.playlist_tracks.length })),
      programa,
      ouvindo,
    };
  } catch {
    return VAZIO;
  }
});

export type ReacoesUsuario = { like: Set<string>; save: Set<string>; support: Set<string> };

/** Reações do usuário logado (RLS: só as próprias). Sem sessão → conjuntos vazios. */
export async function reacoesDoUsuario(): Promise<ReacoesUsuario> {
  const r: ReacoesUsuario = { like: new Set(), save: new Set(), support: new Set() };
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("track_reactions").select("track_id,kind").limit(2000);
    for (const l of (data ?? []) as { track_id: string; kind: keyof ReacoesUsuario }[]) r[l.kind]?.add(l.track_id);
  } catch {
    /* vazio */
  }
  return r;
}

/** "Continue ouvindo": faixas distintas das últimas escutas do usuário (RLS própria). */
export async function continuarOuvindo(userId: string, faixas: FaixaListada[], limite = 4): Promise<FaixaListada[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("listen_events")
      .select("track_id,started_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(60);
    const porId = new Map(faixas.map((f) => [f.id, f]));
    const vistos = new Set<string>();
    const lista: FaixaListada[] = [];
    for (const e of (data ?? []) as { track_id: string }[]) {
      const f = porId.get(e.track_id);
      if (f && !vistos.has(f.id)) {
        vistos.add(f.id);
        lista.push(f);
      }
      if (lista.length === limite) break;
    }
    return lista;
  } catch {
    return [];
  }
}
