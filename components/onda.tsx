"use client";

import { useTempo, usePlayer } from "@/components/player-provider";

const BARRAS = 56;

/** Alturas determinísticas por faixa (não é a forma real do áudio; só um guia visual). */
function alturas(id: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return Array.from({ length: BARRAS }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    const v = ((h >>> 0) % 1000) / 1000;
    return 0.25 + 0.75 * Math.abs(Math.sin(i / 5 + v * 2)) * (0.5 + v / 2);
  });
}

/** Onda de progresso com busca: barras + <input range> acessível por cima. */
export function Onda({ id }: { id: string }) {
  const { atual, duracao } = useTempo();
  const { buscar } = usePlayer();
  const pct = duracao > 0 ? Math.min(1, atual / duracao) : 0;
  const barras = alturas(id);
  return (
    <div className="relative h-14 w-full touch-pan-y">
      <div aria-hidden="true" className="flex h-full items-center gap-[3px]">
        {barras.map((a, i) => (
          <span
            key={i}
            style={{ height: `${a * 100}%` }}
            className={`flex-1 rounded-full ${i / BARRAS < pct ? "bg-brand" : "bg-white/25"}`}
          />
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.floor(duracao))}
        step={1}
        value={Math.floor(atual)}
        disabled={duracao <= 0}
        onChange={(e) => buscar(Number(e.target.value))}
        aria-label="Progresso da faixa"
        aria-valuetext={`${Math.floor(atual)} de ${Math.floor(duracao)} segundos`}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </div>
  );
}
