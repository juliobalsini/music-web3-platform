"use client";

import { Pause, Play } from "lucide-react";

import { Capa } from "@/components/capa";
import { usePlayer } from "@/components/player-provider";
import type { FaixaListada } from "@/lib/radio/rules";

/** Carrossel horizontal de cartões visuais de faixa: capa grande com play, título e artista. */
export function CarrosselFaixas({ titulo, dica, faixas }: { titulo: string; dica?: string; faixas: FaixaListada[] }) {
  const { atual, estado, tocar } = usePlayer();
  if (faixas.length === 0) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold">{titulo}</h2>
        {dica && <p className="text-sm text-white/70">{dica}</p>}
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {faixas.map((f) => {
          const tocando = atual?.id === f.id && estado === "tocando";
          return (
            <li key={f.id} className="w-36 shrink-0 snap-start">
              <button
                type="button"
                onClick={() => tocar(f, faixas)}
                aria-label={`${tocando ? "Pausar" : "Tocar"} ${f.title}, ${f.artistName}`}
                className="flex w-full flex-col gap-1.5 rounded-xl text-left"
              >
                <span className="relative block">
                  <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="aspect-square w-full !rounded-xl" />
                  <span aria-hidden="true" className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-brand text-night-900 shadow-lg">
                    {tocando ? <Pause className="size-5 fill-night-900" /> : <Play className="ml-0.5 size-5 fill-night-900" />}
                  </span>
                </span>
                <span className="line-clamp-2 text-sm font-semibold leading-tight">{f.title}</span>
                <span className="truncate text-xs text-white/70">{f.artistName}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
