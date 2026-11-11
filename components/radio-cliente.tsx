"use client";

import { useRef, useState } from "react";

import { CartaoNoAr } from "@/components/cartao-no-ar";
import { ContinueOuvindo } from "@/components/continue-ouvindo";
import { ListaFaixas } from "@/components/lista-faixas";
import { EstadoVazio, PlaylistsDaSemana } from "@/components/secoes-radio";
import { ABAS, abaVizinha, direcaoDoGesto, filtrosVisiveis, type Aba, type Filtro } from "@/lib/menu";
import type { Radio } from "@/lib/radio/queries";
import type { FaixaListada } from "@/lib/radio/rules";

const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold";

/** Selo "No ar · N ouvindo" no topo da Rádio. */
function SeloNoAr({ ouvindo }: { ouvindo: number | null }) {
  return (
    <p data-testid="selo-no-ar" className="flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-brand">
      <span aria-hidden="true" className="size-2 rounded-full bg-brand" style={{ animation: "eq 1.4s ease-in-out infinite" }} />
      No ar
      {ouvindo !== null && ouvindo > 0 && (
        <span data-testid="ouvindo" className="font-semibold text-white/80">
          · {ouvindo} ouvindo
        </span>
      )}
    </p>
  );
}

/**
 * Rádio no cliente: filtros e abas trocam por estado local (sem ida ao servidor) e as abas aceitam
 * o gesto de arrastar. A URL só informa o ponto de partida (?f=, ?aba=) e é atualizada sem navegar.
 */
export function RadioCliente({
  radio,
  continuar,
  filtroInicial,
  abaInicial,
}: {
  radio: Radio;
  continuar: FaixaListada[];
  filtroInicial: Filtro;
  abaInicial: Aba | null;
}) {
  const filtros = filtrosVisiveis({ albuns: false, stories: false });
  const [filtro, setFiltro] = useState<Filtro>(filtros.some((f) => f.id === filtroInicial) ? filtroInicial : "tudo");
  const [aba, setAba] = useState<Aba>(abaInicial ?? "descobertas");
  const toque = useRef<{ x: number; y: number } | null>(null);
  const mostra = (...f: Filtro[]) => filtro === "tudo" || f.includes(filtro);

  function lembrar(f: Filtro, a: Aba) {
    const q = new URLSearchParams();
    if (f !== "tudo") q.set("f", f);
    if (a !== "descobertas") q.set("aba", a);
    history.replaceState(null, "", q.size ? `/?${q}` : "/");
  }
  const escolherFiltro = (f: Filtro) => {
    setFiltro(f);
    lembrar(f, aba);
  };
  const escolherAba = (a: Aba) => {
    setAba(a);
    lembrar(filtro, a);
  };

  const alta = radio.emAlta;
  return (
    <>
      <SeloNoAr ouvindo={radio.ouvindo} />
      <nav aria-label="Filtros" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => escolherFiltro(f.id)}
            aria-pressed={filtro === f.id}
            className={`${chip} ${filtro === f.id ? "bg-brand text-night-900" : "bg-white/10 text-white hover:bg-white/15"}`}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {mostra("faixas") &&
        (radio.faixas.length === 0 || !radio.noAr ? (
          <EstadoVazio />
        ) : (
          <>
            <CartaoNoAr faixa={radio.noAr.faixa} fila={radio.noAr.fila} continuo={radio.noAr.continuo} atual={radio.programa.atual} proximo={radio.programa.proximo} />
            <ContinueOuvindo faixas={continuar} />
            <section
              aria-label="Faixas"
              className="flex touch-pan-y flex-col gap-1"
              onTouchStart={(e) => {
                toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={(e) => {
                const t = toque.current;
                toque.current = null;
                if (!t) return;
                const d = direcaoDoGesto(e.changedTouches[0].clientX - t.x, e.changedTouches[0].clientY - t.y);
                if (d !== 0) escolherAba(abaVizinha(aba, d));
              }}
            >
              <div role="tablist" aria-label="Listas" className="mb-1 flex gap-1 border-b border-white/10">
                {ABAS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="tab"
                    aria-selected={aba === a.id}
                    onClick={() => escolherAba(a.id)}
                    className={`flex min-h-11 items-center px-3 text-sm font-semibold ${aba === a.id ? "border-b-2 border-brand text-brand" : "text-white/70 hover:text-white"}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {aba === "descobertas" && (
                <ListaFaixas
                  rotulo="Descobertas"
                  faixas={radio.descobertas}
                  numerar
                  dica={radio.descobertasCuradas ? "Pouco ouvidas, escolhidas a dedo por playlisters" : "Ainda sem curadoria: as faixas menos ouvidas"}
                />
              )}
              {aba === "alta" &&
                (alta.length > 0 ? (
                  <ListaFaixas rotulo="Em alta" dica="As mais ouvidas da semana na rádio" ranking={alta} />
                ) : (
                  <ListaFaixas rotulo="Em alta" dica="Ainda sem ranking: mais recentes" faixas={radio.novidades} numerar />
                ))}
              {aba === "novidades" && <ListaFaixas rotulo="Novidades" numerar dica="Acabaram de chegar de artistas independentes" faixas={radio.novidades} />}
            </section>
          </>
        ))}

      {mostra("playlists") && <PlaylistsDaSemana lista={radio.playlists} />}
      {filtro === "playlists" && radio.playlists.length === 0 && <p className="text-white/70">Nenhuma playlist pública ainda.</p>}
    </>
  );
}
