import type { FaixaListada } from "@/lib/radio/rules";

import type { Story } from "./rules";
import type { FaixaDoStory } from "./viewer";

/** Faixas citadas pelos stories (postados e de bio), no formato leve do visualizador. */
export function faixasDosStories(faixas: FaixaListada[], stories: Story[]): Record<string, FaixaDoStory> {
  const ids = new Set(stories.map((s) => s.trackId).filter(Boolean));
  return Object.fromEntries(
    faixas.filter((f) => ids.has(f.id)).map((f) => [f.id, { id: f.id, title: f.title, artistName: f.artistName, durationSec: f.durationSec, hasCover: f.hasCover }]),
  );
}
