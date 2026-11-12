"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { Capa } from "@/components/capa";
import { Equalizador } from "@/components/equalizador";
import { usePlayer } from "@/components/player-provider";
import { EVENTO } from "@/lib/radio/continuar-local";
import { atalhosVisiveis, lerAtalhos, pontoDeRetomada, progressoAtalho, type Atalho } from "@/lib/radio/continuar";
import { capaGerada, type FaixaListada } from "@/lib/radio/rules";

const CHAVE = "radioon:continuar:v1";

function assinar(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}
const lerBruto = () => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};

export const hrefDoAtalho = (a: Pick<Atalho, "tipo" | "id">) =>
  a.tipo === "playlist" ? `/playlist/${a.id}` : a.tipo === "album" ? `/album/${a.id}` : `/perfil/${a.id}`;

/**
 * Continue ouvindo: atalhos compactos em grade 2×3 (capa pequena, título, artista, barra fina de progresso).
 * Mistura faixas, playlists, álbuns e perfis visitados. Faixa retoma do ponto exato. Some com menos de 2.
 * O histórico fica no aparelho; `servidor` (escutas da conta) completa com faixas ouvidas em outro lugar.
 */
export function ContinueOuvindo({ faixas, servidor, validos }: { faixas: FaixaListada[]; servidor: FaixaListada[]; validos: string[] }) {
  const { atual, estado, tocar } = usePlayer();
  const bruto = useSyncExternalStore(assinar, lerBruto, () => null);
  const porId = useMemo(() => new Map(faixas.map((f) => [f.id, f])), [faixas]);

  const itens = useMemo(() => {
    const ok = new Set(validos);
    const local = lerAtalhos(bruto);
    const jaTem = new Set(local.filter((a) => a.tipo === "faixa").map((a) => a.id));
    // Do servidor: sem posição, e sempre mais antigas que o histórico local.
    const doServidor: Atalho[] = servidor
      .filter((f) => !jaTem.has(f.id))
      .map((f, i) => ({ tipo: "faixa", id: f.id, titulo: f.title, sub: f.artistName, capaId: f.id, temCapa: f.hasCover, pos: 0, dur: f.durationSec ?? 0, ts: i + 1 }));
    return atalhosVisiveis([...local, ...doServidor], (a) => (a.tipo === "faixa" ? porId.has(a.id) : ok.has(a.id)));
  }, [bruto, servidor, validos, porId]);

  if (itens.length === 0) return null;
  const fila = itens.filter((a) => a.tipo === "faixa").map((a) => porId.get(a.id)!);
  return (
    <section aria-label="Continue ouvindo" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Continue ouvindo</h2>
      <ul data-testid="continue-grade" className="grid grid-cols-2 gap-2">
        {itens.map((a) => {
          const corpo = (
            <>
              <span className="relative block shrink-0">
                {a.tipo === "perfil" ? (
                  <span aria-hidden="true" style={{ background: capaGerada(a.titulo).fundo }} className="flex size-12 items-center justify-center rounded-full text-lg font-bold text-white">
                    {a.titulo.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Capa id={a.capaId ?? a.id} title={a.titulo} hasCover={a.temCapa} className="size-12" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold leading-tight">{a.titulo}</span>
                  {a.tipo === "faixa" && atual?.id === a.id && estado === "tocando" && <Equalizador />}
                </span>
                <span className="block truncate text-xs text-white/70">{a.sub}</span>
              </span>
            </>
          );
          const caixa = "relative flex min-h-14 w-full items-center gap-2 overflow-hidden rounded-lg bg-white/10 py-1.5 pl-1.5 pr-2 text-left hover:bg-white/15";
          const pct = progressoAtalho(a) * 100;
          return (
            <li key={`${a.tipo}:${a.id}`}>
              {a.tipo === "faixa" ? (
                <button
                  type="button"
                  className={caixa}
                  aria-label={`Retomar ${a.titulo}, ${a.sub}`}
                  onClick={() => {
                    const f = porId.get(a.id);
                    if (f) tocar(f, fila, false, pontoDeRetomada(a.pos, a.dur));
                  }}
                >
                  {corpo}
                  {pct > 0 && (
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                      <span data-testid="progresso" className="block h-full bg-brand" style={{ width: `${pct}%` }} />
                    </span>
                  )}
                </button>
              ) : (
                <Link href={hrefDoAtalho(a)} className={caixa}>
                  {corpo}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
