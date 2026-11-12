// Regras puras do filtro Faixas (ordenação, gêneros, aleatório).

import { GENEROS } from "./generos.ts";

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
