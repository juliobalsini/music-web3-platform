// Regras puras do visualizador de stories em tela cheia (sem React; testáveis).

import { CLIP_SEGUNDOS, type GrupoStories, type Story } from "./rules.ts";

export const DURACAO_TEXTO_MS = 5000;
/** Teto de tempo de um story com imagem/texto quando não há música. */
export const LIMITE_SEM_MUSICA_MS = 15_000;

/** Duração do story na tela: 5 s sem música; com música, a duração do trecho (≤ 15 s, ou a faixa inteira se for menor). */
export function duracaoDoStory(story: Pick<Story, "trackId">, duracaoFaixa: number | null): number {
  if (!story.trackId) return DURACAO_TEXTO_MS;
  const s = duracaoFaixa && duracaoFaixa > 0 ? Math.min(CLIP_SEGUNDOS, duracaoFaixa) : CLIP_SEGUNDOS;
  return Math.round(s * 1000);
}

export type Posicao = { g: number; i: number };

/** Próximo story (mesmo perfil, depois o próximo perfil). `null` = acabou: fechar. */
export function proxima(grupos: GrupoStories[], p: Posicao): Posicao | null {
  const g = grupos[p.g];
  if (!g) return null;
  if (p.i + 1 < g.stories.length) return { g: p.g, i: p.i + 1 };
  if (p.g + 1 < grupos.length) return { g: p.g + 1, i: 0 };
  return null;
}

/** Story anterior; no primeiro de todos, reinicia o mesmo (nunca fecha). */
export function anterior(grupos: GrupoStories[], p: Posicao): Posicao {
  if (p.i > 0) return { g: p.g, i: p.i - 1 };
  if (p.g > 0) return { g: p.g - 1, i: Math.max(0, grupos[p.g - 1].stories.length - 1) };
  return { g: 0, i: 0 };
}

/** Troca de perfil por gesto horizontal: `d` = +1 (próximo perfil) ou -1; `null` no limite (próximo = fecha só ao avançar). */
export function trocarPerfil(grupos: GrupoStories[], p: Posicao, d: 1 | -1): Posicao | null {
  const g = p.g + d;
  if (g < 0) return null;
  if (g >= grupos.length) return null;
  return { g, i: 0 };
}

export type Zona = "esquerda" | "meio" | "direita";
/** Terço esquerdo volta, terço direito avança, o meio não faz nada (segurar pausa). */
export function zonaDoToque(x: number, largura: number): Zona {
  if (largura <= 0) return "meio";
  const r = x / largura;
  return r < 1 / 3 ? "esquerda" : r > 2 / 3 ? "direita" : "meio";
}

export type Gesto = { dx: number; dy: number; ms: number };
export const LIMITE_DESLIZE = 60;
export const TOQUE_MAX_MOVIMENTO = 12;
export const TOQUE_MAX_MS = 280;

/** Classifica um gesto de ponteiro: toque, segurar (pausa), deslize horizontal ou para baixo. */
export function classificarGesto(g: Gesto): "toque" | "segurar" | "horizontal" | "baixo" | "nada" {
  const ax = Math.abs(g.dx);
  const ay = Math.abs(g.dy);
  if (ax < TOQUE_MAX_MOVIMENTO && ay < TOQUE_MAX_MOVIMENTO) return g.ms <= TOQUE_MAX_MS ? "toque" : "segurar";
  if (ay > ax && g.dy > LIMITE_DESLIZE) return "baixo";
  if (ax >= ay && ax > LIMITE_DESLIZE) return "horizontal";
  return "nada";
}

/** "há 4 h", "há 12 min", "há 3 dias", "agora". */
export function tempoRelativo(createdAt: string, agora: number): string {
  const min = Math.floor((agora - Date.parse(createdAt)) / 60_000);
  if (!Number.isFinite(min) || min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

/**
 * Ordem dos perfis: radioOn oficial primeiro, depois quem tem story não visto, depois os vistos.
 * Dentro de cada bloco, mantém a ordem recebida (mais recente primeiro).
 */
export function ordenarGrupos(grupos: GrupoStories[], vistos: ReadonlySet<string>): GrupoStories[] {
  const rank = (g: GrupoStories) => (g.isPlatform ? 0 : tudoVisto(g, vistos) ? 2 : 1);
  return grupos.map((g, k) => ({ g, k })).sort((a, b) => rank(a.g) - rank(b.g) || a.k - b.k).map((x) => x.g);
}

export const tudoVisto = (g: GrupoStories, vistos: ReadonlySet<string>) => g.stories.every((s) => vistos.has(s.id));

/** Ao abrir um perfil, começa no primeiro story ainda não visto (ou no primeiro, se todos vistos). */
export function primeiroNaoVisto(g: GrupoStories, vistos: ReadonlySet<string>): number {
  const i = g.stories.findIndex((s) => !vistos.has(s.id));
  return i < 0 ? 0 : i;
}

export const CHAVE_VISTOS = "radioon_stories_vistos";
export const MAX_VISTOS = 300;

/** Lê/escreve a lista de ids vistos (JSON) preservando os mais recentes. */
export function lerVistos(bruto: string | null): string[] {
  if (!bruto) return [];
  try {
    const v: unknown = JSON.parse(bruto);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(-MAX_VISTOS) : [];
  } catch {
    return [];
  }
}

export function marcarVisto(bruto: string | null, id: string): string {
  const lista = lerVistos(bruto).filter((x) => x !== id);
  lista.push(id);
  return JSON.stringify(lista.slice(-MAX_VISTOS));
}

/** Compartilhamento: o Instagram usa a folha nativa com o cartão como arquivo. */
export function linksRedes(url: string, texto: string) {
  const u = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  };
}

export type FaixaDoStory = { id: string; title: string; artistName: string; durationSec: number | null; hasCover?: boolean };
