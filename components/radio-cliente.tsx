"use client";

import { useMemo, useRef, useState } from "react";

import { Albuns } from "@/components/albuns";
import { CartaoNoAr } from "@/components/cartao-no-ar";
import { ContinueOuvindo } from "@/components/continue-ouvindo";
import { ListaFaixas } from "@/components/lista-faixas";
import { FaixaStories } from "@/components/faixa-stories";
import type { FaixaDoStory } from "@/components/conteudo-story";
import { CarrosselFaixas } from "@/components/carrossel-faixas";
import { ArtistasParaConhecer, SelecaoRadioOn } from "@/components/home-prateleiras";
import { EstadoVazio } from "@/components/secoes-radio";
import { ABAS, abaVizinha, direcaoDoGesto, type Aba } from "@/lib/menu";
import { artistasParaConhecer, selecaoRadioOn } from "@/lib/radio/home";
import { prateleiraClima } from "@/lib/radio/home";
import { rotuloClima } from "@/lib/radio/generos";
import type { Radio } from "@/lib/radio/queries";
import type { FaixaListada } from "@/lib/radio/rules";
import type { Story } from "@/lib/stories/rules";

/**
 * Home no cliente: as abas trocam por estado local (sem ida ao servidor) e as abas aceitam
 * o gesto de arrastar. A URL só informa o ponto de partida (?f=, ?aba=) e é atualizada sem navegar.
 */
export function RadioCliente({
  radio,
  continuar,
  stories,
  faixasDosStories,
  agora,
  abaInicial,
}: {
  radio: Radio;
  continuar: FaixaListada[];
  /** Stories ativos (últimos 7 dias). */
  stories: Story[];
  faixasDosStories: Record<string, FaixaDoStory>;
  agora: number;
  abaInicial: Aba | null;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial ?? "descobertas");
  const toque = useRef<{ x: number; y: number } | null>(null);
  const clima = useMemo(() => prateleiraClima(radio.faixas, agora), [radio.faixas, agora]);
  const selecao = useMemo(() => selecaoRadioOn(radio.faixas, agora), [radio.faixas, agora]);
  const artistas = useMemo(() => artistasParaConhecer(radio.faixas), [radio.faixas]);

  const escolherAba = (a: Aba) => {
    setAba(a);
    history.replaceState(null, "", a === "descobertas" ? "/" : `/?aba=${a}`);
  };

  const alta = radio.emAlta;
  return (
    <>
      <FaixaStories stories={stories} faixas={faixasDosStories} agora={agora} />
      {radio.faixas.length === 0 || !radio.noAr ? (
        <EstadoVazio />
      ) : (
        <>
          <CartaoNoAr faixa={radio.noAr.faixa} fila={radio.noAr.fila} continuo={radio.noAr.continuo} atual={radio.programa.atual} proximo={radio.programa.proximo} />
          <CarrosselFaixas
            titulo={`Agora combina com ${rotuloClima(clima.clima)}`}
            dica={clima.recentes ? "Ainda sem faixas deste clima: as mais recentes" : undefined}
            faixas={clima.faixas}
          />
          <ContinueOuvindo faixas={continuar} />
          <SelecaoRadioOn lista={selecao} />
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
          <ArtistasParaConhecer lista={artistas} />
        </>
      )}
      <Albuns lista={radio.albuns} />
    </>
  );
}
