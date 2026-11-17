"use client";

import { Check } from "lucide-react";
import { useId } from "react";

import { GENEROS_GOSTO, MAX_GOSTOS } from "@/lib/preferencias/rules";
import { rotuloGenero, type GeneroId } from "@/lib/radio/generos";

/**
 * Gêneros que a pessoa curte: caixas nativas em chips (alvo de 44 px). Ao chegar em `max`, as demais ficam
 * indisponíveis até desmarcar uma. Usado em Configurações (até 5) e no primeiro acesso (até 3).
 */
export function EscolherGostos({
  valor,
  aoMudar,
  max = MAX_GOSTOS,
  legenda = "Gêneros que você curte",
}: {
  valor: GeneroId[];
  aoMudar: (g: GeneroId[]) => void;
  max?: number;
  legenda?: string;
}) {
  const id = useId();
  const cheio = valor.length >= max;
  return (
    <fieldset className="flex flex-col gap-3 p-4" aria-describedby={id}>
      <legend className="float-left mb-1 font-semibold">{legenda}</legend>
      <p id={id} aria-live="polite" className="clear-left text-sm tabular-nums text-[var(--ds-texto-2)]">
        {valor.length} de {max}
      </p>
      <div className="flex flex-wrap gap-2">
        {GENEROS_GOSTO.map((g) => {
          const marcado = valor.includes(g);
          return (
            <label key={g} className="cursor-pointer has-[:disabled]:cursor-not-allowed">
              <input
                type="checkbox"
                checked={marcado}
                disabled={!marcado && cheio}
                onChange={() => aoMudar(marcado ? valor.filter((x) => x !== g) : [...valor, g])}
                data-testid={`pref-gosto-${g}`}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--ds-borda)] px-4 text-sm font-semibold text-[var(--ds-texto-2)] transition-colors duration-[var(--ds-mov-rapido)] peer-checked:border-transparent peer-checked:bg-[var(--ds-destaque)] peer-checked:text-sobre-destaque peer-disabled:opacity-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ds-texto)]">
                {marcado && <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />}
                {rotuloGenero(g)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
