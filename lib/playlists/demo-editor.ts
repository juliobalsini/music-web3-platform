import "server-only";

import { cookies } from "next/headers";

import { demoAtivo } from "@/lib/radio/demo";

import type { PlaylistPagina } from "./queries";

/**
 * Editor de playlist logado no E2E (issue #122): a prévia não tem conta de teste. Só fora de produção, com o catálogo de
 * demonstração e o cookie de teste `radioon_demo_editor=1`, a playlist …0701 abre como rascunho "seu" e as ações do editor
 * respondem sem tocar no banco (nada é gravado). Em produção `demoAtivo()` é falso: a playlist não existe (404).
 */
export const PLAYLIST_DEMO_EDITOR = "00000000-0000-4000-8000-000000000701";
export const COOKIE_DEMO_EDITOR = "radioon_demo_editor";

const faixa = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export async function editorDemo(id: unknown): Promise<boolean> {
  if (!demoAtivo() || id !== PLAYLIST_DEMO_EDITOR) return false;
  return (await cookies()).get(COOKIE_DEMO_EDITOR)?.value === "1";
}

/** Rascunho com 3 faixas demo (faltam 2 para publicar); a 1ª com nota e destaque. */
export function playlistDemoEditor(): PlaylistPagina {
  return {
    id: PLAYLIST_DEMO_EDITOR,
    title: "Rascunho de teste",
    description: null,
    capa: null,
    curator: "Você",
    curatorId: faixa(799),
    isPublic: false,
    mine: true,
    saves: 0,
    saved: false,
    temaSemana: null,
    faixas: [
      { id: faixa(1), note: "Abre com calma.", featured: true, hidden: false },
      { id: faixa(2), note: null, featured: false, hidden: false },
      { id: faixa(3), note: null, featured: false, hidden: false },
    ],
  };
}
