"use client";

import { Pause, Play } from "lucide-react";

import { usePlayer } from "@/components/player-provider";
import type { FaixaListada } from "@/lib/radio/rules";

/** "Tocar álbum": começa pela primeira faixa e segue a ordem do álbum. */
export function BotaoAlbum({ faixas }: { faixas: FaixaListada[] }) {
  const p = usePlayer();
  const noAlbum = p.atual !== null && faixas.some((f) => f.id === p.atual!.id);
  const tocando = noAlbum && p.estado === "tocando";
  return (
    <button
      type="button"
      data-testid="play-album"
      onClick={() => (noAlbum ? p.alternar() : p.tocar(faixas[0], faixas))}
      className="foco-claro inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-br from-brand to-brand-2 px-6 font-semibold text-night-900"
    >
      {tocando ? <Pause className="size-5 fill-night-900" aria-hidden="true" /> : <Play className="size-5 fill-night-900" aria-hidden="true" />}
      {tocando ? "Pausar álbum" : "Tocar álbum"}
    </button>
  );
}
