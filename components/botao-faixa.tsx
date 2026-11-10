"use client";

import { Pause, Play } from "lucide-react";

import { usePlayer } from "@/components/player-provider";
import type { FaixaListada } from "@/lib/radio/rules";

/** Play grande de uma faixa (página da faixa, estado vazio nunca usa). */
export function BotaoFaixa({ faixa, fila }: { faixa: FaixaListada; fila?: FaixaListada[] }) {
  const p = usePlayer();
  const tocando = p.atual?.id === faixa.id && p.estado === "tocando";
  return (
    <button
      type="button"
      data-testid="play"
      onClick={() => p.tocar(faixa, fila ?? [faixa])}
      aria-label={tocando ? `Pausar ${faixa.title}` : `Tocar ${faixa.title}`}
      className="foco-claro flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900 shadow-[0_8px_16px_-6px_rgba(232,154,60,0.7)]"
    >
      {tocando ? <Pause className="size-9 fill-night-900" aria-hidden="true" /> : <Play className="ml-1 size-9 fill-night-900" aria-hidden="true" />}
    </button>
  );
}
