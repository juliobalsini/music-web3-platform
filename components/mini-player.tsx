"use client";

import { Pause, Play, SkipForward } from "lucide-react";

import { Capa } from "@/components/capa";
import { usePlayer, useTempo } from "@/components/player-provider";

/** Mini player fixo (acima da navegação inferior), persistente entre páginas. Toque abre o player cheio. */
export function MiniPlayer() {
  const { atual, estado, alternar, proxima, abrir } = usePlayer();
  const { atual: t, duracao } = useTempo();
  if (!atual) return null;
  const tocando = estado === "tocando";
  const pct = duracao > 0 ? Math.min(100, (t / duracao) * 100) : 0;
  return (
    <div
      data-testid="mini-player"
      className="fixed inset-x-2 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-30 mx-auto max-w-md overflow-hidden rounded-xl bg-night-800 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
    >
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => abrir(true)}
          aria-label={`Abrir player: ${atual.title}`}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 p-2 text-left"
        >
          <Capa id={atual.id} title={atual.title} hasCover={atual.hasCover} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{atual.title}</span>
            <span className="block truncate text-xs text-white/70">
              {estado === "limite" ? "Limite diário atingido" : estado === "erro" ? "Não foi possível tocar" : atual.artistName}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={alternar}
          disabled={estado === "carregando"}
          aria-label={tocando ? "Pausar" : "Tocar"}
          className="foco-claro flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-night-900 disabled:opacity-60"
        >
          {tocando ? <Pause className="size-5 fill-night-900" aria-hidden="true" /> : <Play className="ml-0.5 size-5 fill-night-900" aria-hidden="true" />}
        </button>
        <button type="button" onClick={proxima} aria-label="Próxima faixa" className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
          <SkipForward className="size-5 fill-white" aria-hidden="true" />
        </button>
      </div>
      <div aria-hidden="true" className="h-0.5 bg-white/10">
        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
