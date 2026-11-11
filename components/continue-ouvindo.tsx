"use client";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import type { FaixaListada } from "@/lib/radio/rules";

/** Carrossel horizontal de capas (até 10 faixas recentes do usuário). Oculto sem histórico. */
export function ContinueOuvindo({ faixas }: { faixas: FaixaListada[] }) {
  const { atual, estado, tocar } = usePlayer();
  if (faixas.length === 0) return null;
  const lista = faixas.slice(0, 10);
  return (
    <section aria-label="Continue ouvindo" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Continue ouvindo</h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((f) => (
          <li key={f.id} className="w-28 shrink-0 snap-start">
            <button
              type="button"
              onClick={() => tocar(f, lista)}
              aria-label={`Tocar ${f.title}, ${f.artistName}`}
              className="flex w-full flex-col gap-1 rounded-lg text-left"
            >
              <span className="relative block">
                <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="aspect-square w-full" />
                {atual?.id === f.id && estado === "tocando" && (
                  <span className="absolute bottom-1 right-1 rounded bg-night-900/80 p-1">
                    <Equalizador />
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{f.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
