// Regras puras da Home e dos filtros (sem servidor; testáveis): clima do horário, Seleção radioOn,
// "A seguir", artistas para conhecer, ordenação e filtro do catálogo, "Continue ouvindo".

import { CLIMAS, GENEROS, rotuloClima, rotuloGenero, type ClimaId } from "./generos.ts";
import { SEMANA } from "./rules.ts";

/** Perfil oficial da plataforma (virtual: não é uma conta; dono das playlists Seleção radioOn). */
export const RADIOON_ID = "00000000-0000-4000-8000-00000000f001";
export const RADIOON_NOME = "radioOn";

/** Dia da semana (0 = domingo) e hora em Brasília (UTC−3). */
export function diaEHoraBrasilia(agora: number): { dia: number; hora: number } {
  const d = new Date(agora - 3 * 3600 * 1000);
  return { dia: d.getUTCDay(), hora: d.getUTCHours() };
}

/**
 * Clima do horário em Brasília: Madrugada 0–5 h, Foco 6–11 h, Domingo no resto dos domingos,
 * Estrada 17–20 h, Pista sexta e sábado à noite (21–23 h); Chuva é a alternativa (tarde, noites comuns).
 */
export function climaAgora(agora: number): ClimaId {
  const { dia, hora } = diaEHoraBrasilia(agora);
  if (hora <= 5) return "madrugada";
  if (dia === 0) return "domingo";
  if (hora <= 11) return "foco";
  if (hora >= 17 && hora <= 20) return "estrada";
  if ((dia === 5 || dia === 6) && hora >= 21) return "pista";
  return "chuva";
}

/** Faixas do clima; sem nenhuma, as mais recentes (nunca prateleira vazia se há catálogo). */
export function faixasDoClima<T extends { mood: string | null; createdAt: string }>(faixas: T[], clima: string, limite = 10): { faixas: T[]; doClima: boolean } {
  const doClima = faixas.filter((f) => f.mood === clima).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (doClima.length > 0) return { faixas: doClima.slice(0, limite), doClima: true };
  return { faixas: [...faixas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limite), doClima: false };
}

/** Próximas `n` faixas depois da atual no fluxo (dá a volta se a fila é contínua). */
export function proximas<T extends { id: string }>(fila: T[], atualId: string | null | undefined, n = 3, continuo = true): T[] {
  const i = Math.max(0, fila.findIndex((f) => f.id === atualId));
  const lista: T[] = [];
  for (let k = 1; k < fila.length && lista.length < n; k++) {
    const j = i + k;
    if (j >= fila.length && !continuo) break;
    const f = fila[j % fila.length];
    if (f.id !== atualId) lista.push(f);
  }
  return lista;
}

export type FaixaSel = { id: string; createdAt: string; genre: string | null; mood: string | null; plays: number };
export type Selecao = { id: string; titulo: string; faixas: string[] };

/** Mínimo de faixas para uma playlist de gênero. */
export const MIN_GENERO = 3;

/**
 * Seleção radioOn (automática, recalculada a cada requisição): Novidades da semana, uma por gênero
 * com ao menos 3 faixas e uma por clima. Só inclui listas com faixas (novidades: fallback nas mais recentes).
 */
export function selecaoRadioOn<T extends FaixaSel>(faixas: T[], agora: number): Selecao[] {
  const recentes = [...faixas].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const semana = recentes.filter((f) => agora - Date.parse(f.createdAt) < SEMANA);
  const novas = (semana.length > 0 ? semana : recentes).slice(0, 20);
  const lista: Selecao[] = [];
  if (novas.length > 0) lista.push({ id: "novidades", titulo: "Novidades da semana", faixas: novas.map((f) => f.id) });
  for (const g of GENEROS) {
    const fs = recentes.filter((f) => f.genre === g.id);
    if (fs.length >= MIN_GENERO) lista.push({ id: `genero-${g.id}`, titulo: g.label, faixas: fs.map((f) => f.id) });
  }
  for (const c of CLIMAS) {
    const fs = recentes.filter((f) => f.mood === c.id);
    if (fs.length > 0) lista.push({ id: `clima-${c.id}`, titulo: c.label, faixas: fs.map((f) => f.id) });
  }
  return lista;
}

export const tituloSelecao = (id: string) =>
  id === "novidades" ? "Novidades da semana" : id.startsWith("genero-") ? (rotuloGenero(id.slice(7)) ?? null) : id.startsWith("clima-") ? (rotuloClima(id.slice(6)) ?? null) : null;

export type ArtistaConhecer = { id: string; nome: string; faixas: number };

/** Artistas com menos escutas somadas primeiro (mais a descobrir), desempate por mais faixas e nome. */
export function artistasParaConhecer<T extends { artistId: string; artistName: string; plays: number }>(faixas: T[], limite = 10): ArtistaConhecer[] {
  const m = new Map<string, ArtistaConhecer & { plays: number }>();
  for (const f of faixas) {
    const a = m.get(f.artistId) ?? { id: f.artistId, nome: f.artistName, faixas: 0, plays: 0 };
    a.faixas += 1;
    a.plays += f.plays;
    m.set(f.artistId, a);
  }
  return [...m.values()]
    .sort((a, b) => a.plays - b.plays || b.faixas - a.faixas || a.nome.localeCompare(b.nome))
    .slice(0, limite)
    .map(({ id, nome, faixas: n }) => ({ id, nome, faixas: n }));
}

export type Ordem = "recentes" | "ouvidas" | "curtidas" | "az";
export const ORDENS: { id: Ordem; label: string }[] = [
  { id: "recentes", label: "Recentes" },
  { id: "ouvidas", label: "Mais ouvidas" },
  { id: "curtidas", label: "Mais curtidas" },
  { id: "az", label: "A–Z" },
];

export function ordenarFaixas<T extends { id: string; title: string; plays: number; likes: number; createdAt: string }>(faixas: T[], ordem: Ordem): T[] {
  const por: Record<Ordem, (a: T, b: T) => number> = {
    recentes: (a, b) => b.createdAt.localeCompare(a.createdAt),
    ouvidas: (a, b) => b.plays - a.plays || b.createdAt.localeCompare(a.createdAt),
    curtidas: (a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt),
    az: (a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }),
  };
  return [...faixas].sort((a, b) => por[ordem](a, b) || a.id.localeCompare(b.id));
}

/** Gêneros presentes no catálogo (com contagem), na ordem da lista fixa. */
export function generosPresentes<T extends { genre: string | null }>(faixas: T[]): { id: string; label: string; total: number }[] {
  return GENEROS.map((g) => ({ id: g.id as string, label: g.label as string, total: faixas.filter((f) => f.genre === g.id).length })).filter((g) => g.total > 0);
}

/** Embaralha (Fisher–Yates) com sorteio injetável (testes). */
export function embaralhar<T>(lista: T[], sorteio: () => number = Math.random): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// ---- Continue ouvindo (histórico local do aparelho; posição exata de cada faixa) ----

export type TipoAtalho = "faixa" | "playlist" | "album" | "perfil";
export type Atalho = {
  tipo: TipoAtalho;
  id: string;
  titulo: string;
  sub: string;
  /** Faixa cuja capa ilustra o atalho (faixa, primeira da playlist/álbum); perfil usa a inicial. */
  capaId: string | null;
  temCapa: boolean;
  /** Só faixas: ponto onde parou e duração, em segundos. */
  pos: number;
  dur: number;
  ts: number;
};

export const MAX_ATALHOS = 6;
export const MIN_ATALHOS = 2;
const GUARDA = 30;

const TIPOS: TipoAtalho[] = ["faixa", "playlist", "album", "perfil"];

/** Lê o JSON salvo, descartando o que não tem forma de atalho. */
export function lerAtalhos(bruto: string | null): Atalho[] {
  if (!bruto) return [];
  try {
    const j: unknown = JSON.parse(bruto);
    if (!Array.isArray(j)) return [];
    return j.filter(
      (a): a is Atalho =>
        !!a && typeof a === "object" && TIPOS.includes(a.tipo) && typeof a.id === "string" && typeof a.titulo === "string" && typeof a.ts === "number",
    ).map((a) => ({ ...a, sub: String(a.sub ?? ""), capaId: a.capaId ?? null, temCapa: !!a.temCapa, pos: Number(a.pos) || 0, dur: Number(a.dur) || 0 }));
  } catch {
    return [];
  }
}

/** Põe o atalho no topo (um por tipo+id), preservando a posição quando o novo não a traz. */
export function registrarAtalho(lista: Atalho[], novo: Omit<Atalho, "pos" | "dur"> & Partial<Pick<Atalho, "pos" | "dur">>): Atalho[] {
  const antigo = lista.find((a) => a.tipo === novo.tipo && a.id === novo.id);
  const item: Atalho = { ...novo, pos: novo.pos ?? antigo?.pos ?? 0, dur: novo.dur ?? antigo?.dur ?? 0 };
  return [item, ...lista.filter((a) => !(a.tipo === novo.tipo && a.id === novo.id))].slice(0, GUARDA);
}

/** Progresso 0–1 (só faixas com duração conhecida). */
export function progressoAtalho(a: Pick<Atalho, "pos" | "dur">): number {
  return a.dur > 0 ? Math.min(1, Math.max(0, a.pos / a.dur)) : 0;
}

/** Ponto de retomada: no fim (ou quase) recomeça do zero. */
export function pontoDeRetomada(pos: number, dur: number): number {
  if (!(pos > 1)) return 0;
  if (dur > 0 && pos >= dur - 3) return 0;
  return Math.floor(pos);
}

/**
 * Até 6 atalhos misturando os tipos: mais recente de cada tipo primeiro (rodízio), depois o resto por
 * data; faixas ausentes do catálogo (`existe` falso) saem. Menos de 2 → vazio (a seção some).
 */
export function atalhosVisiveis(lista: Atalho[], existe: (a: Atalho) => boolean): Atalho[] {
  const validos = lista.filter(existe).sort((a, b) => b.ts - a.ts);
  const porTipo = TIPOS.map((t) => validos.filter((a) => a.tipo === t));
  const escolhidos: Atalho[] = [];
  for (let i = 0; escolhidos.length < MAX_ATALHOS && i < validos.length; i++) {
    for (const g of porTipo) if (g[i] && escolhidos.length < MAX_ATALHOS) escolhidos.push(g[i]);
  }
  const r = escolhidos.sort((a, b) => b.ts - a.ts);
  return r.length >= MIN_ATALHOS ? r : [];
}
