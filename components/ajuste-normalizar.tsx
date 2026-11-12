"use client";

import { useSyncExternalStore } from "react";

import { definirNormalizar, normalizarLigado } from "@/lib/player/ganho";

/** Interruptor "Normalizar volume" (ligado por padrão; vale só neste aparelho). */
export function AjusteNormalizar() {
  const ligado = useSyncExternalStore(
    (cb) => {
      window.addEventListener("radioon:normalizar", cb);
      return () => window.removeEventListener("radioon:normalizar", cb);
    },
    normalizarLigado,
    () => true,
  );
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={() => {
        definirNormalizar(!ligado);
      }}
      className="foco-claro flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-3 text-left"
    >
      <span>
        <span className="block font-semibold">Normalizar volume</span>
        <span className="block text-sm text-white/70">Faixas com volume parecido. O arquivo do artista não muda.</span>
      </span>
      <span aria-hidden="true" className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${ligado ? "bg-brand" : "bg-white/25"}`}>
        <span className={`size-5 rounded-full bg-white transition-transform ${ligado ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}
