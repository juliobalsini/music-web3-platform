"use client";

import { Pause, Play, SkipForward } from "lucide-react";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import type { FaixaListada, Programa } from "@/lib/radio/rules";

const hora = (h: number) => `${String(h % 24).padStart(2, "0")}h`;

/** Cartão "No ar": programa do horário (se houver) ou a Rádio radioOn; título em até duas linhas. */
export function CartaoNoAr({
  faixa,
  fila,
  continuo,
  atual,
  proximo,
}: {
  faixa: FaixaListada;
  fila: FaixaListada[];
  continuo: boolean;
  atual: Programa | null;
  proximo: Programa | null;
}) {
  const p = usePlayer();
  const aqui = p.atual?.id === faixa.id;
  const tocando = aqui && p.estado === "tocando";
  const propria = p.usuarioId !== null && p.usuarioId === faixa.artistId;
  return (
    <section aria-label="No ar" className="flex flex-col gap-3 rounded-xl bg-white/10 p-3">
      <p className="truncate text-sm font-semibold text-white/70">{atual ? `${atual.title} · ${hora(atual.startHour)}–${hora(atual.endHour)}` : "Rádio radioOn"}</p>
      <div className="flex items-center gap-3">
        <Capa id={faixa.id} title={faixa.title} hasCover={faixa.hasCover} className="size-20" />
        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-2 text-lg font-bold leading-tight">
            <span data-testid="titulo-no-ar" className="line-clamp-2 min-w-0 break-words">{faixa.title}</span>
            {tocando && <Equalizador />}
          </p>
          <p className="truncate text-sm text-white/70">
            {faixa.artistName}
            {atual?.curatorName ? ` · curadoria de ${atual.curatorName}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            data-testid="play"
            onClick={() => p.tocar(faixa, fila, continuo)}
            aria-label={tocando ? `Pausar ${faixa.title}` : `Tocar ${faixa.title}`}
            className="foco-claro flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900 shadow-[0_6px_14px_-6px_rgba(232,154,60,0.7)]"
          >
            {tocando ? <Pause className="size-6 fill-night-900" aria-hidden="true" /> : <Play className="ml-0.5 size-6 fill-night-900" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => (aqui ? p.proxima() : p.tocar(fila[1] ?? faixa, fila, continuo))}
            aria-label="Próxima faixa"
            className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
          >
            <SkipForward className="size-5 fill-white" aria-hidden="true" />
          </button>
        </div>
      </div>
      {faixa.note && (
        <p className="text-pretty text-sm text-white/90">
          <span className="font-semibold text-brand">{faixa.playlister ?? "Playlister"}: </span>
          {faixa.note}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 text-xs text-white/70">
        <span data-testid="regra-pontos">{propria ? "Suas faixas não geram pontos para você" : "Ouça 30s e ganhe pontos"}</span>
        {proximo && (
          <span className="truncate">
            A seguir: {proximo.title} · {hora(proximo.startHour)}
          </span>
        )}
      </div>
    </section>
  );
}
