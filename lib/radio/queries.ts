import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";

import { dadosDemo, demoAtivo } from "./demo";
import { totalOuvindo } from "./home";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  descobertas,
  fluxoRadio,
  horaEmBrasilia,
  menosOuvidas,
  novidades,
  ouvindoAgora,
  programacao,
  rankingEmAlta,
  rankingPlaylistsPorEscutas,
  SEMANA,
  montarAlbuns,
  type AlbumResumo,
  type FaixaListada,
  type ItemRanking,
  type Programa,
} from "./rules";


export type PlaylisterResumo = { id: string; name: string; playlists: number; faixas: number; topPlaylistId: string };
export type PlaylistSemana = {
  id: string; title: string; curator: string | null; curatorId: string; trackCount: number;
  /** Primeira faixa da playlist: a capa dela ilustra a playlist. */
  capa: { id: string; title: string; hasCover: boolean } | null;
};

export type Radio = {
  faixas: FaixaListada[];
  emAlta: ItemRanking<FaixaListada>[];
  descobertas: FaixaListada[];
  /** true = escolhidas por playlisters; false = fallback "menos ouvidas" (sem curadoria ainda). */
  descobertasCuradas: boolean;
  novidades: FaixaListada[];
  albuns: AlbumResumo[];
  playlisters: PlaylisterResumo[];
  playlists: PlaylistSemana[];
  /** Todas as playlists públicas com faixas (perfis públicos). */
  todasPlaylists: PlaylistSemana[];
  programa: { atual: Programa | null; proximo: Programa | null };
  /** Faixa "No ar" e a fila que segue (playlist do programa no horário; senão, o fluxo da Rádio radioOn). */
  noAr: { faixa: FaixaListada; fila: FaixaListada[]; continuo: boolean } | null;
  /** Ouvintes agora, contando você: nunca menos de 1 (sem service_role, só você). */
  ouvindo: number;
};

const VAZIO: Radio = {
  faixas: [],
  emAlta: [],
  descobertas: [],
  descobertasCuradas: false,
  novidades: [],
  albuns: [],
  playlisters: [],
  playlists: [],
  todasPlaylists: [],
  programa: { atual: null, proximo: null },
  noAr: null,
  ouvindo: 1,
};

type Cliente = Awaited<ReturnType<typeof createClient>>;
type LinhaTrack = {
  id: string; title: string; artist_id: string; duration_sec: number | null; cover_key?: string | null;
  created_at: string; composer?: string | null; performers?: string | null; album?: string | null; label?: string | null; genre?: string | null; mood?: string | null; album_id?: string | null; track_no?: number | null;
};
type LinhaPlaylist = {
  id: string; title: string; curator_id: string; created_at: string;
  playlist_tracks: { track_id: string; note?: string | null; position: number; hidden?: boolean | null; featured?: boolean | null }[];
};
type LinhaPrograma = { id: string; title: string; start_hour: number; end_hour: number; playlist_id: string; curator_id: string };

type LinhaAlbum = { id: string; title: string; kind: string; artist_id: string; created_at: string };

const COLUNAS_BASE = "id,title,artist_id,duration_sec,created_at";
const COLUNAS_FICHA = `${COLUNAS_BASE},cover_key,composer,performers,album,label`;
const COLUNAS_GM = `${COLUNAS_FICHA},genre,mood`;
const COLUNAS_TRACKS = `${COLUNAS_GM},album_id,track_no`;

function adminOuNulo(): Cliente | null {
  try {
    return createAdminClient() as unknown as Cliente;
  } catch {
    return null;
  }
}

/**
 * Faixas publicadas. Sem embeds (ambiguidade ou coluna ausente derrubava a lista inteira em silêncio):
 * colunas completas → colunas base → mesma leitura com service_role (só `status = published`, o mesmo
 * filtro da policy pública). Erros vão para o log do servidor, nunca para a página.
 */
async function lerFaixasPublicadas(supabase: Cliente): Promise<LinhaTrack[]> {
  const admin = adminOuNulo();
  const tentativas: { rotulo: string; cliente: Cliente; colunas: string }[] = [
    { rotulo: "completa", cliente: supabase, colunas: COLUNAS_TRACKS },
    { rotulo: "genero-clima", cliente: supabase, colunas: COLUNAS_GM },
    { rotulo: "ficha", cliente: supabase, colunas: COLUNAS_FICHA },
    { rotulo: "base", cliente: supabase, colunas: COLUNAS_BASE },
    ...(admin
      ? [
          { rotulo: "admin completa", cliente: admin, colunas: COLUNAS_TRACKS },
          { rotulo: "admin base", cliente: admin, colunas: COLUNAS_BASE },
        ]
      : []),
  ];
  for (const t of tentativas) {
    const { data, error } = await t.cliente
      .from("tracks")
      .select(t.colunas)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error(`[radio] faixas (${t.rotulo}):`, error.message);
      continue;
    }
    // Vazio pelo cliente comum: confirma com service_role antes de aceitar "sem faixas".
    if ((data ?? []).length > 0 || t.rotulo.startsWith("admin")) return (data ?? []) as unknown as LinhaTrack[];
  }
  return [];
}

async function lerNomes(supabase: Cliente, ids: string[]): Promise<Map<string, string>> {
  const nomes = new Map<string, string>();
  if (ids.length === 0) return nomes;
  const admin = adminOuNulo();
  for (const cliente of admin ? [supabase, admin] : [supabase]) {
    const { data, error } = await cliente.from("profiles").select("id,display_name").in("id", ids);
    if (error) {
      console.error("[radio] perfis:", error.message);
      continue;
    }
    for (const p of (data ?? []) as { id: string; display_name: string | null }[]) if (p.display_name) nomes.set(p.id, p.display_name);
    if (nomes.size >= ids.length) break;
  }
  return nomes;
}

async function lerPlaylists(supabase: Cliente): Promise<LinhaPlaylist[]> {
  for (const colunas of [
    "id,title,curator_id,created_at,playlist_tracks(track_id,note,position,hidden,featured)",
    "id,title,curator_id,created_at,playlist_tracks(track_id,note,position)",
    "id,title,curator_id,created_at,playlist_tracks(track_id,position)",
  ]) {
    const { data, error } = await supabase.from("playlists").select(colunas).eq("is_public", true).order("created_at", { ascending: false }).limit(100);
    // Faixas ocultas pelo curador não entram em contagens, notas nem na fila "No ar".
    if (!error) {
      return ((data ?? []) as unknown as LinhaPlaylist[]).map((p) => ({ ...p, playlist_tracks: p.playlist_tracks.filter((i) => !i.hidden) }));
    }
    console.error("[radio] playlists:", error.message);
  }
  return [];
}

async function lerProgramas(supabase: Cliente): Promise<LinhaPrograma[]> {
  const { data, error } = await supabase.from("programs").select("id,title,start_hour,end_hour,playlist_id,curator_id").order("start_hour");
  if (error) console.error("[radio] programas:", error.message);
  return (data ?? []) as LinhaPrograma[];
}

/** Álbuns/EPs (tabela nova: sem ela, lista vazia e a Rádio segue sem o filtro Álbuns). */
async function lerAlbuns(supabase: Cliente): Promise<LinhaAlbum[]> {
  const { data, error } = await supabase.from("albums").select("id,title,kind,artist_id,created_at").order("created_at", { ascending: false }).limit(100);
  if (error) {
    console.error("[radio] álbuns:", error.message);
    return [];
  }
  return (data ?? []) as LinhaAlbum[];
}

/** Tudo da Rádio numa leitura por requisição. Cada parte falha sozinha: nunca derruba as faixas. */
export const carregarRadio = cache(async (): Promise<Radio> => {
  await connection(); // dados por requisição: o relógio só pode ser lido depois disto (cacheComponents)
  try {
    const supabase = await createClient();
    const agora = Date.now();
    const [tracksReais, plsReais, progsReais, albunsReais] = await Promise.all([
      lerFaixasPublicadas(supabase).catch(() => [] as LinhaTrack[]),
      lerPlaylists(supabase).catch(() => [] as LinhaPlaylist[]),
      lerProgramas(supabase).catch(() => [] as LinhaPrograma[]),
      lerAlbuns(supabase).catch(() => [] as LinhaAlbum[]),
    ]);
    // Cookie `radioon_sem_demo` (só vale fora de produção) deixa o E2E conferir o estado vazio.
    const semDemo = (await cookies()).has("radioon_sem_demo");
    const demo = demoAtivo() && !semDemo ? dadosDemo(agora) : null;
    const tracks = [...tracksReais, ...((demo?.tracks ?? []) as unknown as LinhaTrack[])];
    const pls = [...plsReais, ...((demo?.playlists ?? []) as unknown as LinhaPlaylist[])];
    const progs = [...progsReais, ...((demo?.programs ?? []) as unknown as LinhaPrograma[])];
    const ids = new Set([...tracks.map((t) => t.artist_id), ...pls.map((p) => p.curator_id), ...progs.map((p) => p.curator_id)]);
    const nomes = await lerNomes(supabase, [...ids].filter((id) => !demo?.nomes.has(id))).catch(() => new Map<string, string>());
    for (const [k, v] of demo?.nomes ?? []) nomes.set(k, v);
    const nomeDe = (id: string) => nomes.get(id) ?? null;

    // Agregados que o RLS não deixa o visitante ler: só contagens, via service_role no servidor.
    const plays = new Map<string, number>();
    const likes = new Map<string, number>();
    let escutas: { track_id: string; started_at: string }[] = [];
    let outros: number | null = null;
    const meuId = await supabase.auth.getUser().then((r) => r.data.user?.id ?? null).catch(() => null);
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
      for (const r of (l.data ?? []) as { track_id: string }[]) likes.set(r.track_id, (likes.get(r.track_id) ?? 0) + 1);
      if (!v.error && !o.error) outros = ouvindoAgora(((o.data ?? []) as { user_id: string; last_beat_at: string | null }[]).filter((l) => l.user_id !== meuId), agora);
    } catch {
      /* sem service_role (prévias/testes): contagens zeradas */
    }
    if (demo) {
      escutas = [...escutas, ...demo.escutas];
      for (const r of demo.curtidas) likes.set(r.track_id, (likes.get(r.track_id) ?? 0) + 1);
      outros = outros ?? 3;
    }
    for (const e of escutas) plays.set(e.track_id, (plays.get(e.track_id) ?? 0) + 1);

    const playlists = pls.filter((p) => p.playlist_tracks.length > 0);
    const emPlaylists = new Map<string, number>();
    const notas = new Map<string, { note: string; by: string | null }>();
    for (const p of playlists) {
      for (const it of p.playlist_tracks) {
        emPlaylists.set(it.track_id, (emPlaylists.get(it.track_id) ?? 0) + 1);
        if (it.note?.trim() && !notas.has(it.track_id)) notas.set(it.track_id, { note: it.note.trim(), by: nomeDe(p.curator_id) });
      }
    }

    const faixas: FaixaListada[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artistId: t.artist_id,
      artistName: nomeDe(t.artist_id) ?? "Artista",
      durationSec: t.duration_sec,
      hasCover: !!t.cover_key,
      createdAt: t.created_at,
      composer: t.composer ?? null,
      performers: t.performers ?? null,
      album: t.album ?? null,
      label: t.label ?? null,
      genre: t.genre ?? null,
      mood: t.mood ?? null,
      albumId: t.album_id ?? null,
      trackNo: t.track_no ?? null,
      plays: plays.get(t.id) ?? 0,
      likes: likes.get(t.id) ?? 0,
      note: notas.get(t.id)?.note ?? null,
      playlister: notas.get(t.id)?.by ?? null,
    }));

    const porCurador = new Map<string, PlaylisterResumo>();
    for (const p of playlists) {
      const r = porCurador.get(p.curator_id) ?? { id: p.curator_id, name: nomeDe(p.curator_id) ?? "Playlister", playlists: 0, faixas: 0, topPlaylistId: p.id };
      r.playlists += 1;
      r.faixas += p.playlist_tracks.length;
      porCurador.set(p.curator_id, r);
    }
    const faixaPorId = new Map(faixas.map((f) => [f.id, f]));
    const resumo = (p: LinhaPlaylist): PlaylistSemana => {
      const primeira = faixaPorId.get([...p.playlist_tracks].sort((a, b) => a.position - b.position).find((i) => faixaPorId.has(i.track_id))?.track_id ?? "");
      return {
        id: p.id, title: p.title, curator: nomeDe(p.curator_id), curatorId: p.curator_id, trackCount: p.playlist_tracks.length,
        capa: primeira ? { id: primeira.id, title: primeira.title, hasCover: primeira.hasCover } : null,
      };
    };
    const semana = playlists.filter((p) => agora - Date.parse(p.created_at) < SEMANA);
    const base = semana.length > 0 ? semana : playlists;

    const programas: Programa[] = progs.map((p) => ({
      id: p.id, title: p.title, startHour: p.start_hour, endHour: p.end_hour,
      curatorName: nomeDe(p.curator_id), playlistId: p.playlist_id,
    }));

    const emAlta = rankingEmAlta(faixas, escutas, agora);
    const curadas = descobertas(faixas, plays, emPlaylists);
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
      noAr = { faixa: doPrograma[i], fila: [...doPrograma.slice(i), ...doPrograma.slice(0, i)], continuo: false };
    } else if (faixas.length > 0) {
      // Rádio radioOn: fluxo contínuo (novidades + pouco ouvidas + curtidas), mesmo giro para todos (10 min).
      const fluxo = fluxoRadio(faixas, Math.floor(agora / 600_000));
      noAr = { faixa: fluxo[0], fila: fluxo, continuo: true };
    }

    return {
      faixas,
      noAr,
      emAlta,
      descobertas: curadas.length > 0 ? curadas : menosOuvidas(faixas),
      descobertasCuradas: curadas.length > 0,
      novidades: novidades(faixas),
      albuns: montarAlbuns([...albunsReais, ...(demo?.albums ?? [])], faixas, nomeDe),
      playlisters: [...porCurador.values()].sort((a, b) => b.faixas - a.faixas || b.playlists - a.playlists).slice(0, 8),
      playlists: rankingPlaylistsPorEscutas(base, escutas, agora)
        .slice(0, 8)
        .map(resumo),
      todasPlaylists: playlists.map(resumo),
      programa,
      ouvindo: totalOuvindo(outros ?? 0),
    };
  } catch (e) {
    console.error("[radio] falha geral:", e instanceof Error ? e.message : e);
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
export async function continuarOuvindo(userId: string, faixas: FaixaListada[], limite = 10): Promise<FaixaListada[]> {
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
