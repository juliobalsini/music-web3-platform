"use client";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import type { FaixaListada } from "@/lib/radio/rules";

/** Grade 2x2 de retomada. */
export function ContinueOuvindo({ faixas, titulo }: { faixas: FaixaListada[]; titulo: string }) {
  const { atual, estado, tocar } = usePlayer();
  if (faixas.length === 0) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {faixas.slice(0, 4).map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => tocar(f, faixas)}
              aria-label={`Tocar ${f.title}, ${f.artistName}`}
              className="flex min-h-14 w-full items-center gap-2 overflow-hidden rounded-lg bg-white/10 pr-2 text-left hover:bg-white/15"
            >
              <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-14 rounded-r-none" />
              <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">
                <span className="line-clamp-2">{f.title}</span>
              </span>
              {atual?.id === f.id && estado === "tocando" && <Equalizador />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
