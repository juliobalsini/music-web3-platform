"use client";

import { Headphones, Heart, Pause, Play, Shuffle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import { embaralhar, generosPresentes, ordenarFaixas, ORDENS, type Ordem } from "@/lib/radio/home";
import { rotuloClima, rotuloGenero } from "@/lib/radio/generos";
import { formatContagem, formatDuracao, type FaixaListada } from "@/lib/radio/rules";

const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold";
const ativoCls = "bg-brand text-night-900";
const inativoCls = "bg-white/10 text-white hover:bg-white/15";

/**
 * Filtro Faixas: catálogo completo com "Últimas adicionadas", ordenação, chips de gênero, lista com artista
 * clicável, e "Tocar tudo" / "Aleatório" (viram fila de reprodução).
 */
export function CatalogoFaixas({ faixas }: { faixas: FaixaListada[] }) {
  const { atual, estado, tocar } = usePlayer();
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [genero, setGenero] = useState<string | null>(null);
  const generos = useMemo(() => generosPresentes(faixas), [faixas]);
  const lista = useMemo(() => ordenarFaixas(faixas.filter((f) => !genero || f.genre === genero), ordem), [faixas, ordem, genero]);
  const ultimas = useMemo(() => ordenarFaixas(faixas, "recentes").slice(0, 8), [faixas]);

  if (faixas.length === 0) return <p className="text-white/70">Nenhuma faixa publicada ainda.</p>;
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Últimas adicionadas" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Últimas adicionadas</h2>
        <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
          {ultimas.map((f) => (
            <li key={f.id} className="w-28 shrink-0 snap-start">
              <button type="button" onClick={() => tocar(f, ultimas)} aria-label={`Tocar ${f.title}, ${f.artistName}`} className="flex w-full flex-col gap-1 rounded-xl text-left">
                <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="aspect-square w-full !rounded-xl" />
                <span className="line-clamp-2 text-sm font-semibold leading-tight">{f.title}</span>
                <span className="truncate text-xs text-white/70">{f.artistName}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex gap-2">
        <button type="button" data-testid="tocar-tudo" onClick={() => lista[0] && tocar(lista[0], lista)} disabled={lista.length === 0} className="foco-claro flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-brand to-brand-2 font-semibold text-night-900 disabled:opacity-60">
          <Play className="size-5 fill-night-900" aria-hidden="true" /> Tocar tudo
        </button>
        <button
          type="button"
          data-testid="aleatorio"
          onClick={() => {
            const f = embaralhar(lista);
            if (f[0]) tocar(f[0], f);
          }}
          disabled={lista.length === 0}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/10 font-semibold hover:bg-white/15 disabled:opacity-60"
        >
          <Shuffle className="size-5" aria-hidden="true" /> Aleatório
        </button>
      </div>

      <div role="group" aria-label="Ordenar" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {ORDENS.map((o) => (
          <button key={o.id} type="button" aria-pressed={ordem === o.id} onClick={() => setOrdem(o.id)} className={`${chip} ${ordem === o.id ? ativoCls : inativoCls}`}>
            {o.label}
          </button>
        ))}
      </div>
      {generos.length > 1 && (
        <div role="group" aria-label="Gênero" className="-mx-4 flex gap-2 overflow-x-auto px-4">
          <button type="button" aria-pressed={genero === null} onClick={() => setGenero(null)} className={`${chip} ${genero === null ? ativoCls : inativoCls}`}>Todos</button>
          {generos.map((g) => (
            <button key={g.id} type="button" aria-pressed={genero === g.id} onClick={() => setGenero(g.id)} className={`${chip} ${genero === g.id ? ativoCls : inativoCls}`}>
              {g.label}
            </button>
          ))}
        </div>
      )}

      <ol aria-label="Todas as faixas" data-testid="catalogo" className="flex flex-col">
        {lista.map((f) => {
          const naFila = atual?.id === f.id;
          const tocando = naFila && estado === "tocando";
          const tags = [rotuloGenero(f.genre), rotuloClima(f.mood)].filter(Boolean).join(" · ");
          return (
            <li key={f.id} className={`flex min-h-16 items-center gap-1 rounded-lg ${naFila ? "bg-white/5" : ""}`}>
              <button type="button" onClick={() => tocar(f, lista)} aria-label={`${tocando ? "Pausar" : "Tocar"} ${f.title}, ${f.artistName}`} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-white/5">
                <span className="relative shrink-0">
                  <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-12" />
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center rounded-md bg-night-900/50 opacity-0 hover:opacity-100">
                    {tocando ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-2 font-semibold ${naFila ? "text-brand" : ""}`}>
                    <span data-testid="titulo-faixa" className="truncate">{f.title}</span>
                    {tocando && <Equalizador />}
                  </span>
                  {tags && <span className="block truncate text-xs text-white/70">{tags}</span>}
                </span>
              </button>
              <span className="flex w-24 shrink-0 flex-col items-end gap-0.5 pr-1 text-xs text-white/70 tabular-nums">
                <Link href={`/perfil/${f.artistId}`} className="flex min-h-7 max-w-full items-center truncate text-sm text-white/90 underline-offset-2 hover:underline">
                  <span className="truncate">{f.artistName}</span>
                </Link>
                <span>{formatDuracao(f.durationSec)}</span>
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><Headphones className="size-3.5" aria-hidden="true" />{formatContagem(f.plays)}<span className="sr-only"> escutas</span></span>
                  <span className="flex items-center gap-0.5"><Heart className="size-3.5" aria-hidden="true" />{formatContagem(f.likes)}<span className="sr-only"> curtidas</span></span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
