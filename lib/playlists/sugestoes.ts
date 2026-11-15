// Regras puras do editor de playlist (#122, fase 1): sugestões do painel "Adicionar faixas",
// capa em mosaico e trecho da prévia de 15 s. Sem acesso a banco nem a armazenamento.
import { rotuloClima, rotuloGenero, type ClimaId } from "../radio/generos.ts";

type F = { id: string; genre: string | null; mood: string | null; likes: number; plays: number; createdAt: string };

export type GrupoSugestao<T> = { id: "clima" | "genero" | "recentes" | "curtidas"; titulo: string; faixas: T[] };

export const SUGESTOES_POR_GRUPO = 6;

/** Gênero mais frequente nas faixas da playlist (empate → o que aparece primeiro); null se nenhuma tiver gênero. */
export function generoPredominante(faixas: { genre: string | null }[]): string | null {
  const cont = new Map<string, number>();
  for (const f of faixas) if (f.genre) cont.set(f.genre, (cont.get(f.genre) ?? 0) + 1);
  let melhor: string | null = null;
  let n = 0;
  for (const [g, c] of cont) if (c > n) [melhor, n] = [g, c];
  return melhor;
}

/**
 * Sugestões do painel de adicionar, nesta ordem: clima do horário, gênero predominante da playlist,
 * ouvidas recentemente (histórico local, na ordem dele) e curtidas. Nunca sugere faixa já na playlist
 * nem repete faixa entre grupos; grupo sem faixa não aparece.
 */
export function sugestoes<T extends F>(
  catalogo: T[],
  opcoes: { naPlaylist: Set<string>; clima: ClimaId; genero: string | null; recentes: string[]; curtidas: Set<string>; limite?: number },
): GrupoSugestao<T>[] {
  const limite = opcoes.limite ?? SUGESTOES_POR_GRUPO;
  const usadas = new Set(opcoes.naPlaylist);
  const porId = new Map(catalogo.map((f) => [f.id, f]));
  const populares = (a: T, b: T) => b.likes - a.likes || b.plays - a.plays || b.createdAt.localeCompare(a.createdAt);
  const grupos: GrupoSugestao<T>[] = [];
  const pegar = (id: GrupoSugestao<T>["id"], titulo: string, lista: T[]) => {
    const faixas: T[] = [];
    for (const f of lista) {
      if (faixas.length >= limite) break;
      if (usadas.has(f.id)) continue;
      usadas.add(f.id);
      faixas.push(f);
    }
    if (faixas.length > 0) grupos.push({ id, titulo, faixas });
  };
  pegar("clima", `Agora combina com ${rotuloClima(opcoes.clima) ?? "o momento"}`, catalogo.filter((f) => f.mood === opcoes.clima).sort(populares));
  if (opcoes.genero) pegar("genero", `Mais ${rotuloGenero(opcoes.genero) ?? opcoes.genero}`, catalogo.filter((f) => f.genre === opcoes.genero).sort(populares));
  pegar("recentes", "Ouvidas recentemente", opcoes.recentes.map((id) => porId.get(id)).filter((f): f is T => !!f));
  pegar("curtidas", "Suas curtidas", catalogo.filter((f) => opcoes.curtidas.has(f.id)).sort(populares));
  return grupos;
}

/** Capa automática: 4+ faixas → mosaico 2×2 das 4 primeiras; 1–3 → capa da primeira; 0 → arte do título. */
export function capaMosaico<T>(faixas: T[]): { tipo: "mosaico"; faixas: T[] } | { tipo: "unica"; faixa: T } | { tipo: "arte" } {
  if (faixas.length >= 4) return { tipo: "mosaico", faixas: faixas.slice(0, 4) };
  if (faixas.length > 0) return { tipo: "unica", faixa: faixas[0] };
  return { tipo: "arte" };
}

export const PREVIA_SEGUNDOS = 15;

/** Começo da prévia: ~30% da faixa (passa da introdução), sem ultrapassar o fim; faixa curta ou sem duração → 0. */
export function inicioDaPrevia(duracao: number | null | undefined): number {
  if (!duracao || duracao <= PREVIA_SEGUNDOS * 2) return 0;
  return Math.min(Math.floor(duracao * 0.3), Math.floor(duracao - PREVIA_SEGUNDOS));
}

/** Índice de destino ao arrastar: deslocamento vertical em px / altura da linha, preso à lista. */
export function destinoArraste(de: number, deslocamento: number, alturaLinha: number, total: number): number {
  if (alturaLinha <= 0 || total <= 0) return de;
  const passo = Math.round(deslocamento / alturaLinha);
  return Math.max(0, Math.min(total - 1, de + passo));
}

/** Deslizar para remover: só para a esquerda e além do limiar (px). */
export const LIMIAR_DESLIZAR = 96;
export const deveRemoverAoDeslizar = (dx: number) => dx <= -LIMIAR_DESLIZAR;
