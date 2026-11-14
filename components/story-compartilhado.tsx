"use client";

import { useRouter } from "next/navigation";

import { VisualizadorStories } from "@/components/visualizador-stories";
import type { GrupoStories } from "@/lib/stories/rules";
import type { FaixaDoStory } from "@/lib/stories/viewer";

/** Link compartilhado (/story/[id]): abre o visualizador em tela cheia, com convite discreto ao final. */
export function StoryCompartilhado({ grupo, indice, faixas, agora }: { grupo: GrupoStories; indice: number; faixas: Record<string, FaixaDoStory>; agora: number }) {
  const router = useRouter();
  return <VisualizadorStories grupos={[grupo]} faixas={faixas} agora={agora} inicio={{ g: 0, i: indice }} onFechar={() => router.push("/")} convite />;
}
