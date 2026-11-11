"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ConteudoStory, type FaixaDoStory } from "@/components/conteudo-story";
import { capaGerada } from "@/lib/radio/rules";
import { agruparPorAutor, type Story } from "@/lib/stories/rules";

/**
 * Faixa de stories recentes (círculos por autor) e visor em tela cheia. O visor percorre os stories do
 * autor (do mais antigo ao mais novo) e depois fecha. `agora` vem do servidor (render puro).
 */
export function FaixaStories({ stories, faixas, agora }: { stories: Story[]; faixas: Record<string, FaixaDoStory>; agora: number }) {
  const grupos = agruparPorAutor(stories);
  const [aberto, setAberto] = useState<{ g: number; i: number } | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  if (grupos.length === 0) return null;
  const grupo = aberto ? grupos[aberto.g] : null;
  const story = grupo && aberto ? grupo.stories[aberto.i] : null;
  const passo = (d: 1 | -1) => {
    if (!aberto || !grupo) return;
    const i = aberto.i + d;
    if (i >= 0 && i < grupo.stories.length) setAberto({ g: aberto.g, i });
    else if (d === 1) setAberto(null);
  };

  return (
    <section aria-label="Stories" className="flex flex-col gap-2">
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {grupos.map((g, idx) => (
          <li key={g.authorId} className="w-[4.5rem] shrink-0">
            <button type="button" onClick={() => setAberto({ g: idx, i: 0 })} aria-label={`Ver stories de ${g.authorName}`} className="flex w-full flex-col items-center gap-1 rounded-lg py-1">
              <span className="rounded-full bg-gradient-to-br from-brand to-brand-2 p-[3px]">
                <span
                  aria-hidden="true"
                  style={{ background: capaGerada(g.authorName).fundo }}
                  className="flex size-14 items-center justify-center rounded-full border-2 border-night-900 text-xl font-bold text-white"
                >
                  {g.authorName.charAt(0).toUpperCase()}
                </span>
              </span>
              <span className="w-full truncate text-center text-xs font-semibold">{g.authorName}</span>
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        aria-label={grupo ? `Stories de ${grupo.authorName}` : "Stories"}
        onClose={() => setAberto(null)}
        className="m-0 size-full max-h-none max-w-none overflow-y-auto bg-night-900 text-white backdrop:bg-night-900"
      >
        {story && grupo && (
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-5 pb-8 pt-4">
            <div className="flex items-center justify-between">
              <div aria-hidden="true" className="flex flex-1 gap-1 pr-3">
                {grupo.stories.map((s, k) => (
                  <span key={s.id} className={`h-1 flex-1 rounded-full ${k <= aberto!.i ? "bg-brand" : "bg-white/20"}`} />
                ))}
              </div>
              <button type="button" onClick={() => setAberto(null)} aria-label="Fechar stories" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <ConteudoStory key={story.id} story={story} faixa={story.trackId ? (faixas[story.trackId] ?? null) : null} agora={agora} />
            <div className="mt-auto flex justify-between">
              <button type="button" onClick={() => passo(-1)} disabled={aberto!.i === 0} aria-label="Story anterior" className="flex size-12 items-center justify-center rounded-full bg-white/10 disabled:opacity-30">
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => passo(1)} aria-label={aberto!.i === grupo.stories.length - 1 ? "Fechar stories" : "Próximo story"} className="flex size-12 items-center justify-center rounded-full bg-white/10">
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
