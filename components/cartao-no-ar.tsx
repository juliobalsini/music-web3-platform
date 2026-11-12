"use client";
/* eslint-disable @next/next/no-img-element -- capa do bucket por URL assinada; sem otimizador (cota). */

import { Pause, Play, SkipForward } from "lucide-react";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import { proximas } from "@/lib/radio/home";
import { capaGerada, type FaixaListada, type Programa } from "@/lib/radio/rules";

const hora = (h: number) => `${String(h % 24).padStart(2, "0")}h`;

/**
 * Cartão "No ar" em destaque: fundo ambiente com as cores da capa, nota do playlister e "A seguir" com as
 * próximas 3 faixas do fluxo (toque pula até elas). Título em até duas linhas.
 */
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
  // "A seguir" acompanha o ponto do fluxo em que a rádio está (faixa tocando da fila, senão a do cartão).
  const noFluxo = p.atual && fila.some((f) => f.id === p.atual!.id) ? p.atual.id : faixa.id;
  const seguintes = proximas(fila, noFluxo, 3, continuo);
  const cor = capaGerada(faixa.title);
  return (
    <section aria-label="No ar" className="relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl p-4 ring-1 ring-white/10">
      {/* Ambiente: a própria capa desfocada, ou o par de cores da capa gerada. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: cor.fundo }}>
        {faixa.hasCover && <img src={`/api/tracks/${faixa.id}/capa`} alt="" className="size-full scale-125 object-cover blur-2xl" />}
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-night-900/30 via-night-900/55 to-night-900/90" />

      <p className="truncate text-sm font-semibold text-white/80">{atual ? `${atual.title} · ${hora(atual.startHour)}–${hora(atual.endHour)}` : "Rádio radioOn"}</p>

      <div className="flex items-center gap-4">
        <Capa id={faixa.id} title={faixa.title} hasCover={faixa.hasCover} className="size-28 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)] !rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-2 text-2xl font-bold leading-tight">
            <span data-testid="titulo-no-ar" className="line-clamp-2 min-w-0 break-words">{faixa.title}</span>
            {tocando && <Equalizador className="mt-1.5" />}
          </p>
          <p className="truncate text-sm text-white/80">
            {faixa.artistName}
            {atual?.curatorName ? ` · curadoria de ${atual.curatorName}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="play"
          onClick={() => p.tocar(faixa, fila, continuo)}
          aria-label={tocando ? `Pausar ${faixa.title}` : `Tocar ${faixa.title}`}
          className="foco-claro flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900 shadow-[0_8px_18px_-6px_rgba(232,154,60,0.8)]"
        >
          {tocando ? <Pause className="size-7 fill-night-900" aria-hidden="true" /> : <Play className="ml-0.5 size-7 fill-night-900" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => (aqui ? p.proxima() : p.tocar(fila[1] ?? faixa, fila, continuo))}
          aria-label="Próxima faixa"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <SkipForward className="size-5 fill-white" aria-hidden="true" />
        </button>
        <span data-testid="regra-pontos" className="min-w-0 flex-1 text-pretty text-right text-xs text-white/80">
          {propria ? "Suas faixas não geram pontos para você" : "Ouça 30s e ganhe pontos"}
        </span>
      </div>

      {faixa.note && (
        <p className="text-pretty rounded-xl bg-night-900/40 px-3 py-2 text-sm text-white/90">
          <span className="font-semibold text-brand-2">{faixa.playlister ?? "Playlister"}: </span>
          {faixa.note}
        </p>
      )}

      {seguintes.length > 0 && (
        <div data-testid="a-seguir" className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-white/90">A seguir</h2>
          <ol className="flex flex-col">
            {seguintes.map((f, i) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => p.tocar(f, fila, continuo)}
                  aria-label={`Pular para ${f.title}, ${f.artistName}`}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-white/10"
                >
                  <span aria-hidden="true" className="w-5 shrink-0 text-sm font-bold tabular-nums text-brand-2">{i + 1}</span>
                  <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{f.title}</span>
                    <span className="block truncate text-xs text-white/75">{f.artistName}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {proximo && <p className="truncate text-xs text-white/75">Próximo programa: {proximo.title} · {hora(proximo.startHour)}</p>}
    </section>
  );
}
