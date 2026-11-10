"use client";

import { ChevronDown, ChevronUp, Headphones, Heart, Minus } from "lucide-react";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import { formatContagem, formatDuracao, type FaixaListada, type ItemRanking, type Tendencia } from "@/lib/radio/rules";

const TENDENCIA: Record<Tendencia, { rotulo: string; Icone: typeof ChevronUp | null; cor: string }> = {
  up: { rotulo: "Subiu", Icone: ChevronUp, cor: "text-brand" },
  down: { rotulo: "Desceu", Icone: ChevronDown, cor: "text-white/60" },
  same: { rotulo: "Manteve", Icone: Minus, cor: "text-white/60" },
  new: { rotulo: "Novo", Icone: null, cor: "text-night-900 bg-brand" },
};

/** Lista densa: capa pequena, escutas, curtidas e duração; equalizador na faixa tocando. */
export function ListaFaixas({
  faixas,
  ranking,
  rotulo,
  vazio = "Nada por aqui ainda.",
  dica,
  numerar = false,
}: {
  faixas?: FaixaListada[];
  ranking?: ItemRanking<FaixaListada>[];
  rotulo: string;
  vazio?: string;
  /** Linha curta sob as abas (como no protótipo). */
  dica?: string;
  /** Numera 01, 02… quando não é ranking. */
  numerar?: boolean;
}) {
  const { atual, estado, tocar } = usePlayer();
  const itens = ranking ? ranking.map((r) => r.faixa) : (faixas ?? []);
  if (itens.length === 0) return <p className="px-1 text-sm text-white/70">{vazio}</p>;
  return (
    <>
    {dica && <p className="px-1 pb-1 text-sm text-white/70">{dica}</p>}
    <ol aria-label={rotulo} className="flex flex-col">
      {itens.map((f, i) => {
        const item = ranking?.[i];
        const t = item ? TENDENCIA[item.tendencia] : null;
        const tocando = atual?.id === f.id && estado === "tocando";
        const naFila = atual?.id === f.id;
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => tocar(f, itens)}
              aria-label={`${tocando ? "Pausar" : "Tocar"} ${f.title}, ${f.artistName}`}
              className={`flex min-h-16 w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-white/5 ${naFila ? "bg-white/5" : ""}`}
            >
              {!item && numerar && (
                <span aria-hidden="true" className="w-7 shrink-0 text-sm font-bold tabular-nums text-brand">{String(i + 1).padStart(2, "0")}</span>
              )}
              {item && (
                <span className="flex w-7 shrink-0 flex-col items-center text-sm font-bold tabular-nums">
                  {item.posicao}
                  {t && (
                    <span className={`${t.cor} flex items-center justify-center rounded text-[10px] font-bold uppercase leading-none`} data-tendencia={item.tendencia}>
                      {t.Icone ? <t.Icone className="size-4" aria-hidden="true" /> : <span className="px-1 py-0.5">Novo</span>}
                      <span className="sr-only">{t.rotulo}</span>
                    </span>
                  )}
                </span>
              )}
              <Capa id={f.id} title={f.title} hasCover={f.hasCover} className="size-12" />
              <span className="min-w-0 flex-1">
                <span className={`flex items-center gap-2 truncate font-semibold ${naFila ? "text-brand" : ""}`}>
                  <span className="truncate">{f.title}</span>
                  {tocando && <Equalizador />}
                </span>
                <span className="block truncate text-sm text-white/70">{f.artistName}{f.playlister && numerar ? ` · escolha de ${f.playlister}` : ""}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-white/70 tabular-nums">
                <span>{formatDuracao(f.durationSec)}</span>
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><Headphones className="size-3.5" aria-hidden="true" />{formatContagem(f.plays)}<span className="sr-only"> escutas</span></span>
                  <span className="flex items-center gap-0.5"><Heart className="size-3.5" aria-hidden="true" />{formatContagem(f.likes)}<span className="sr-only"> curtidas</span></span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
    </>
  );
}
