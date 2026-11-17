// Story de bio automático (issue #156). Regras puras: nada é gravado no banco; o story é derivado do perfil
// (foto, nome, frase) e das faixas publicadas a cada leitura. Ao mudar foto, frase ou faixa mais ouvida,
// o id muda, então o story volta a contar como "não visto".

import { caminhoFotoPerfil } from "../perfil/foto.ts";
import { ATIVO_MS, agruparPorAutor, type GrupoStories, type Story } from "./rules.ts";

export const PREFIXO_BIO = "bio-";
export const MAX_BIO = 140;
/** Início do trecho de 15 s (ajustado à duração no visualizador). */
export const INICIO_TRECHO_BIO = 30;

export type PerfilBio = {
  id: string;
  nome: string | null;
  foto: string | null;
  bio: string | null;
  /** Ocultado pelo artista em Configurações (ou perfil privado). */
  oculto: boolean;
};

export type FaixaBio = { id: string; artistId: string; genre: string | null; plays: number; createdAt: string };

export const ehStoryDeBio = (s: Pick<Story, "id">) => s.id.startsWith(PREFIXO_BIO);

/**
 * Foto aceita no story: foto própria (rota do app, sempre relativa), https do Google (conta Google do artista) ou
 * arquivo de demonstração local. Qualquer outra origem é descartada (o banco já exige https; aqui também se limita o domínio).
 */
export function fotoSegura(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^\/demo\/[a-z0-9-]+\.svg$/.test(url)) return url;
  const propria = caminhoFotoPerfil(url);
  if (propria) return propria;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "googleusercontent.com" || u.hostname.endsWith(".googleusercontent.com")) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Frase da bio: espaços colapsados, 1–140 caracteres; vazio = sem frase. `undefined` = inválida. */
export function parseBio(v: unknown): string | null | undefined {
  if (v == null) return null;
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length <= MAX_BIO ? s : undefined;
}

/** Faixa do trecho: a mais ouvida; empate (ou ninguém ouviu ainda) → a mais recente. */
export function faixaDaBio<T extends FaixaBio>(faixas: T[]): T | null {
  return [...faixas].sort((a, b) => b.plays - a.plays || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))[0] ?? null;
}

/** Gênero principal: o mais frequente nas faixas; empate → o da faixa mais recente. */
export function generoPrincipal(faixas: FaixaBio[]): string | null {
  const conta = new Map<string, { n: number; ultima: string }>();
  for (const f of faixas) {
    if (!f.genre) continue;
    const c = conta.get(f.genre) ?? { n: 0, ultima: "" };
    c.n += 1;
    if (f.createdAt > c.ultima) c.ultima = f.createdAt;
    conta.set(f.genre, c);
  }
  return [...conta.entries()].sort((a, b) => b[1].n - a[1].n || b[1].ultima.localeCompare(a[1].ultima))[0]?.[0] ?? null;
}

/** Hash curto e estável (FNV-1a 32 bits, hex). */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const idDaBio = (artistId: string, foto: string, bio: string | null, trackId: string) => `${PREFIXO_BIO}${artistId}-${hash(`${foto}\n${bio ?? ""}\n${trackId}`)}`;

/**
 * Story de bio de um artista: exige foto, nome e ao menos 1 faixa publicada, e não estar oculto.
 * Não expira (a data é a da faixa mais recente, só para ordenar).
 */
export function storyDeBio(perfil: PerfilBio, faixasDoArtista: FaixaBio[], generoRotulo: (id: string) => string | null = () => null): Story | null {
  const foto = fotoSegura(perfil.foto);
  const nome = perfil.nome?.trim();
  const faixa = faixaDaBio(faixasDoArtista);
  if (perfil.oculto || !foto || !nome || !faixa) return null;
  const genero = generoPrincipal(faixasDoArtista);
  const bio = perfil.bio?.trim() || null;
  const recente = faixasDoArtista.reduce((m, f) => (f.createdAt > m ? f.createdAt : m), faixa.createdAt);
  return {
    id: idDaBio(perfil.id, foto, bio, faixa.id),
    authorId: perfil.id,
    authorName: nome,
    isPlatform: false,
    body: bio,
    hasImage: false,
    trackId: faixa.id,
    clipStart: INICIO_TRECHO_BIO,
    createdAt: recente,
    bio: { foto, genero: genero ? (generoRotulo(genero) ?? null) : null },
  };
}

/** Stories de bio de todos os artistas com faixas (ordem: mais faixas, depois o nome). */
export function storiesDeBio(perfis: PerfilBio[], faixas: FaixaBio[], generoRotulo?: (id: string) => string | null): Story[] {
  const por = new Map<string, FaixaBio[]>();
  for (const f of faixas) por.set(f.artistId, [...(por.get(f.artistId) ?? []), f]);
  return perfis
    .map((p) => ({ s: storyDeBio(p, por.get(p.id) ?? [], generoRotulo), n: por.get(p.id)?.length ?? 0 }))
    .filter((x): x is { s: Story; n: number } => x.s !== null)
    .sort((a, b) => b.n - a.n || a.s.authorName.localeCompare(b.s.authorName))
    .map((x) => x.s);
}

/** Um grupo por story de bio (cada bio é um "perfil" de um story só). */
const gruposDeBio = (bios: Story[]): GrupoStories[] => bios.map((s) => ({ authorId: s.authorId, authorName: s.authorName, isPlatform: false, stories: [s] }));

export type CardHome = { grupo: GrupoStories; tipo: "boas-vindas" | "novidade" | "bio" };

/**
 * Linha "Artistas para conhecer" da Home: só cards de bio, com duas exceções no início:
 * 1) visitante novo (sem conta, ainda não viu): o story de boas-vindas da radioOn;
 * 2) artistas seguidos com story postado nos últimos 7 dias (novidade; abre os stories postados).
 * Depois, bios não vistas e por fim as vistas. Nenhum outro story postado aparece na Home.
 */
export function linhaDaHome({
  bios,
  postados,
  seguidos,
  vistos,
  visitante,
  agora,
}: {
  bios: Story[];
  postados: Story[];
  seguidos: ReadonlySet<string>;
  vistos: ReadonlySet<string>;
  visitante: boolean;
  agora: number;
}): CardHome[] {
  const recentes = postados.filter((s) => agora - Date.parse(s.createdAt) < ATIVO_MS);
  const cards: CardHome[] = [];
  const boasVindas = recentes.filter((s) => s.isPlatform);
  if (visitante && boasVindas.length > 0 && !boasVindas.every((s) => vistos.has(s.id))) {
    cards.push({ grupo: agruparPorAutor(boasVindas)[0], tipo: "boas-vindas" });
  }
  const novos = agruparPorAutor(recentes.filter((s) => !s.isPlatform && seguidos.has(s.authorId)));
  for (const g of novos) cards.push({ grupo: g, tipo: "novidade" });
  const comNovidade = new Set(novos.map((g) => g.authorId));
  const restantes = gruposDeBio(bios.filter((s) => !comNovidade.has(s.authorId)));
  const naoVistos = restantes.filter((g) => !vistos.has(g.stories[0].id));
  const vistosG = restantes.filter((g) => vistos.has(g.stories[0].id));
  for (const g of [...naoVistos, ...vistosG]) cards.push({ grupo: g, tipo: "bio" });
  return cards;
}

/**
 * Stories do Explorar: postados de quem a pessoa segue, postados recentes (a radioOn primeiro),
 * bios ainda não vistas, bios vistas. Postados só dos últimos 7 dias.
 */
export function gruposDoExplorar({
  bios,
  postados,
  seguidos,
  vistos,
  agora,
}: {
  bios: Story[];
  postados: Story[];
  seguidos: ReadonlySet<string>;
  vistos: ReadonlySet<string>;
  agora: number;
}): GrupoStories[] {
  const grupos = agruparPorAutor(postados.filter((s) => agora - Date.parse(s.createdAt) < ATIVO_MS));
  const deSeguidos = grupos.filter((g) => !g.isPlatform && seguidos.has(g.authorId));
  const outros = grupos.filter((g) => g.isPlatform || !seguidos.has(g.authorId)).sort((a, b) => Number(b.isPlatform) - Number(a.isPlatform));
  const bioG = gruposDeBio(bios);
  return [...deSeguidos, ...outros, ...bioG.filter((g) => !vistos.has(g.stories[0].id)), ...bioG.filter((g) => vistos.has(g.stories[0].id))];
}
