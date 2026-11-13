"use client";
/* eslint-disable @next/next/no-img-element -- capa do bucket como fundo ambiente; sem otimizador (cota). */

import { Pause, Play, SkipForward } from "lucide-react";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import { capaGerada, formatDuracao, type FaixaListada, type Programa } from "@/lib/radio/rules";

/** O selo "Ao vivo" só aparece com público de verdade (evita "1 ouvindo"). */
export const LIMITE_AO_VIVO = 10;

const hora = (h: number) => `${String(h % 24).padStart(2, "0")}h`;

/** Fundo ambiente: a própria capa desfocada ou, sem capa, o par de cores da arte gerada. */
function Ambiente({ faixa }: { faixa: FaixaListada }) {
  const c = capaGerada(faixa.title);
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden" style={{ background: c.fundo }}>
      {faixa.hasCover && <img src={`/api/tracks/${faixa.id}/capa`} alt="" className="size-full scale-150 object-cover opacity-70 blur-3xl" />}
      <div className="absolute inset-0 bg-gradient-to-b from-night-900/10 via-night-900/40 to-night-900/85" />
    </div>
  );
}

/** Cartão "No ar": destaque da Home, com a faixa, a nota do playlister e "A seguir" (3 faixas do fluxo). */
export function CartaoNoAr({
  faixa,
  fila,
  continuo,
  atual,
  proximo,
  ouvindo = 0,
}: {
  faixa: FaixaListada;
  fila: FaixaListada[];
  continuo: boolean;
  atual: Programa | null;
  proximo: Programa | null;
  ouvindo?: number;
}) {
  const p = usePlayer();
  const aqui = p.atual?.id === faixa.id;
  const tocando = aqui && p.estado === "tocando";
  const propria = p.usuarioId !== null && p.usuarioId === faixa.artistId;
  const aSeguir = fila.filter((f) => f.id !== faixa.id).slice(0, 3);
  return (
    <section aria-label="No ar" className="relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl p-4 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)]">
      <Ambiente faixa={faixa} />
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white/80">
        <p className="truncate">{atual ? `${atual.title} · ${hora(atual.startHour)}–${hora(atual.endHour)}` : "Player On"}</p>
        {ouvindo >= LIMITE_AO_VIVO && (
          <p data-testid="ao-vivo" className="shrink-0 whitespace-nowrap text-brand">
            Ao vivo · {ouvindo} ouvindo
          </p>
        )}
      </div>
      <div className="flex items-end gap-4">
        <Capa id={faixa.id} title={faixa.title} hasCover={faixa.hasCover} className="size-36 !rounded-2xl shadow-[0_12px_24px_-10px_rgba(0,0,0,0.7)]" />
        <div className="min-w-0 flex-1 pb-1">
          <p className="flex items-start gap-2 text-2xl font-bold leading-tight text-balance">
            <span data-testid="titulo-no-ar" className="line-clamp-3 min-w-0 break-words">{faixa.title}</span>
            {tocando && <Equalizador />}
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
          className="foco-claro flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand to-brand-2 font-bold text-night-900 shadow-[0_8px_16px_-8px_rgba(232,154,60,0.8)]"
        >
          {tocando ? <Pause className="size-6 fill-night-900" aria-hidden="true" /> : <Play className="ml-0.5 size-6 fill-night-900" aria-hidden="true" />}
          {tocando ? "Pausar" : "Ouvir agora"}
        </button>
        <button
          type="button"
          onClick={() => (aqui ? p.proxima() : p.tocar(aSeguir[0] ?? faixa, fila, continuo))}
          aria-label="Próxima faixa"
          className="flex size-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/20"
        >
          <SkipForward className="size-5 fill-white" aria-hidden="true" />
        </button>
      </div>
      {faixa.note && (
        <p className="text-pretty rounded-xl bg-night-900/50 px-3 py-2 text-sm text-white/90">
          <span className="font-semibold text-brand">{faixa.playlister ?? "Playlister"}: </span>
          {faixa.note}
        </p>
      )}
      {aSeguir.length > 0 && (
        <div aria-label="A seguir" role="group" className="flex flex-col">
          <h2 className="mb-1 text-sm font-bold text-white/90">A seguir</h2>
          <ul className="flex flex-col">
            {aSeguir.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => p.tocar(f, fila, continuo)}
                  aria-label={`Pular para ${f.title}, ${f.artistName}`}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-white/10"
                >
                  <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-11" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{f.title}</span>
                    <span className="block truncate text-xs text-white/75">{f.artistName}</span>
                  </span>
                  <span className="text-xs tabular-nums text-white/75">{formatDuracao(f.durationSec)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 text-xs text-white/80">
        <span data-testid="regra-pontos">{propria ? "Suas faixas não geram pontos para você" : "Ouça 30s e ganhe pontos"}</span>
        {proximo && (
          <span className="truncate">
            Próximo programa: {proximo.title} · {hora(proximo.startHour)}
          </span>
        )}
      </div>
    </section>
  );
}
