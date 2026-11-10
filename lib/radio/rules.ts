// Regras puras da Rádio (sem servidor): ranking, descobertas, programação, ouvintes, capa gerada.

export type FaixaRadio = {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  durationSec: number | null;
  hasCover: boolean;
  createdAt: string;
  composer: string | null;
  performers: string | null;
  album: string | null;
  label: string | null;
};

export type FaixaListada = FaixaRadio & {
  plays: number;
  likes: number;
  /** Nota do playlister (curadoria), se a faixa estiver numa playlist pública com nota. */
  note: string | null;
  playlister: string | null;
};

export type Tendencia = "up" | "down" | "same" | "new";

const DIA = 24 * 3600 * 1000;
export const SEMANA = 7 * DIA;
/** Faixa com até este nº de escutas válidas ainda é "pouco ouvida". */
export const DESCOBERTA_MAX_ESCUTAS = 50;

export function formatDuracao(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 1200 → "1,2 mil"; abaixo de mil, o número. */
export function formatContagem(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(".", ",")} mil`;
}

export type EscutaTempo = { track_id: string; started_at: string };

function contar(escutas: EscutaTempo[], de: number, ate: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of escutas) {
    const t = Date.parse(e.started_at);
    if (t >= de && t < ate) m.set(e.track_id, (m.get(e.track_id) ?? 0) + 1);
  }
  return m;
}

function ordenar<T extends { id: string }>(ids: T[], pontos: Map<string, number>, total: Map<string, number>): T[] {
  return [...ids].sort(
    (a, b) =>
      (pontos.get(b.id) ?? 0) - (pontos.get(a.id) ?? 0) ||
      (total.get(b.id) ?? 0) - (total.get(a.id) ?? 0) ||
      a.id.localeCompare(b.id),
  );
}

export type ItemRanking<T> = { faixa: T; posicao: number; tendencia: Tendencia };

/**
 * Em alta: ranking pelas escutas válidas dos últimos 7 dias. Tendência compara a posição
 * com a da semana anterior; "new" = faixa criada nos últimos 7 dias. Só entra quem tem escuta na semana.
 */
export function rankingEmAlta<T extends { id: string; createdAt: string }>(
  faixas: T[],
  escutas: EscutaTempo[],
  agora: number,
  limite = 10,
): ItemRanking<T>[] {
  const semana = contar(escutas, agora - SEMANA, agora + 1);
  const anterior = contar(escutas, agora - 2 * SEMANA, agora - SEMANA);
  const total = contar(escutas, 0, agora + 1);
  const atual = ordenar(faixas.filter((f) => (semana.get(f.id) ?? 0) > 0), semana, total);
  const antes = ordenar(faixas.filter((f) => (anterior.get(f.id) ?? 0) > 0), anterior, total);
  const posAntes = new Map(antes.map((f, i) => [f.id, i]));
  return atual.slice(0, limite).map((faixa, i) => {
    const novo = agora - Date.parse(faixa.createdAt) < SEMANA;
    const p = posAntes.get(faixa.id);
    const tendencia: Tendencia = novo ? "new" : p === undefined || p > i ? "up" : p < i ? "down" : "same";
    return { faixa, posicao: i + 1, tendencia };
  });
}

/** Descobertas: pouco ouvidas e escolhidas por playlisters (estão em playlists públicas). */
export function descobertas<T extends { id: string }>(
  faixas: T[],
  plays: Map<string, number>,
  emPlaylists: Map<string, number>,
  limite = 10,
): T[] {
  return faixas
    .filter((f) => (emPlaylists.get(f.id) ?? 0) > 0 && (plays.get(f.id) ?? 0) <= DESCOBERTA_MAX_ESCUTAS)
    .sort(
      (a, b) =>
        (emPlaylists.get(b.id) ?? 0) - (emPlaylists.get(a.id) ?? 0) ||
        (plays.get(a.id) ?? 0) - (plays.get(b.id) ?? 0) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limite);
}

export function novidades<T extends { createdAt: string }>(faixas: T[], limite = 10): T[] {
  return [...faixas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limite);
}

export type Programa = { id: string; title: string; startHour: number; endHour: number; curatorName: string | null; playlistId: string };

/** Hora cheia (0–23) em Brasília (UTC−3, sem horário de verão desde 2019). */
export function horaEmBrasilia(agora: number): number {
  return new Date(agora - 3 * 3600 * 1000).getUTCHours();
}

/** Programa no ar agora e o próximo (o seguinte que começa; dá a volta no dia). */
export function programacao(programas: Programa[], hora: number): { atual: Programa | null; proximo: Programa | null } {
  const atual = programas.find((p) => hora >= p.startHour && hora < p.endHour) ?? null;
  const ordem = [...programas].filter((p) => p.id !== atual?.id).sort((a, b) => a.startHour - b.startHour);
  const proximo = ordem.find((p) => p.startHour > hora) ?? ordem[0] ?? null;
  return { atual, proximo };
}

/** Ouvintes únicos com batimento recente (janela padrão de 3 min). */
export function ouvindoAgora(linhas: { user_id: string; last_beat_at: string | null }[], agora: number, janelaMs = 3 * 60 * 1000): number {
  const ids = new Set<string>();
  for (const l of linhas) {
    if (l.last_beat_at && agora - Date.parse(l.last_beat_at) <= janelaMs) ids.add(l.user_id);
  }
  return ids.size;
}

/** Arte gerada a partir do título: determinística, só com cores da marca. */
const PALETAS = [
  ["#e89a3c", "#00112a"],
  ["#f4b562", "#062244"],
  ["#c9742a", "#00112a"],
  ["#e89a3c", "#0b3a66"],
  ["#2b5d8f", "#00112a"],
  ["#f4b562", "#7a3f12"],
] as const;

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function capaGerada(titulo: string): { fundo: string; letra: string; cor: string; cor2: string } {
  const h = hash(titulo.trim().toLowerCase());
  const [cor, cor2] = PALETAS[h % PALETAS.length];
  const angulo = 20 + ((h >>> 8) % 140);
  const letra = titulo.trim().charAt(0).toUpperCase() || "R";
  return { fundo: `linear-gradient(${angulo}deg, ${cor} 0%, ${cor2} 100%)`, letra, cor, cor2 };
}

/** Normaliza para busca: minúsculas, sem acentos, sem espaços sobrando. */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Lê `?q=`: texto de até 60 caracteres ("" se ausente). */
export function lerBusca(valor: string | string[] | undefined): string {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return (v ?? "").slice(0, 60).trim();
}

/** Filtra por todos os termos (AND) em qualquer um dos campos de texto do item. */
export function buscar<T>(itens: T[], consulta: string, campos: (item: T) => (string | null | undefined)[]): T[] {
  const termos = normalizarBusca(consulta).split(" ").filter(Boolean);
  if (termos.length === 0) return itens;
  return itens.filter((item) => {
    const texto = normalizarBusca(campos(item).filter(Boolean).join(" "));
    return termos.every((t) => texto.includes(t));
  });
}

export type PlaylistRankeavel = { id: string; created_at: string; playlist_tracks: { track_id: string }[] };

/**
 * Ranking de playlists por escutas válidas da semana nas faixas que elas contêm (substitui o
 * ranking por nº de faixas). Empate → mais faixas, depois mais recente. Não altera a entrada.
 */
export function rankingPlaylistsPorEscutas<P extends PlaylistRankeavel>(
  playlists: P[],
  escutas: { track_id: string; started_at: string }[],
  agora: number,
): P[] {
  const porFaixa = new Map<string, number>();
  for (const e of escutas) {
    if (agora - Date.parse(e.started_at) >= SEMANA) continue;
    porFaixa.set(e.track_id, (porFaixa.get(e.track_id) ?? 0) + 1);
  }
  const pontos = (p: P) => p.playlist_tracks.reduce((n, i) => n + (porFaixa.get(i.track_id) ?? 0), 0);
  return playlists
    .map((p) => ({ p, n: pontos(p) }))
    .sort((a, b) => b.n - a.n || b.p.playlist_tracks.length - a.p.playlist_tracks.length || b.p.created_at.localeCompare(a.p.created_at))
    .map((x) => x.p);
}
