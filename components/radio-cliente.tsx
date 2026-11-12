"use client";

import { useEffect, useRef, useState } from "react";

import { CatalogoFaixas } from "@/components/catalogo-faixas";
import { CartaoNoAr } from "@/components/cartao-no-ar";
import { CarrosselFaixas } from "@/components/carrossel-faixas";
import type { FaixaDoStory } from "@/components/conteudo-story";
import { ContinueOuvindo } from "@/components/continue-ouvindo";
import { FaixaStories } from "@/components/faixa-stories";
import { GradeAlbuns, GradePlaylists } from "@/components/grades";
import { ListaFaixas } from "@/components/lista-faixas";
import { ArtistasParaConhecer, SelecaoPrateleira } from "@/components/prateleiras";
import { EstadoVazio } from "@/components/secoes-radio";
import type { ArtistaConhecer } from "@/lib/radio/home";
import { ABAS, abaVizinha, direcaoDoGesto, filtrosVisiveis, type Aba, type Filtro } from "@/lib/menu";
import type { Radio } from "@/lib/radio/queries";
import type { FaixaListada } from "@/lib/radio/rules";
import type { Story } from "@/lib/stories/rules";

const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold";

export type ClimaAgora = { id: string; label: string; faixas: FaixaListada[]; doClima: boolean };

/**
 * Rádio no cliente. Cada filtro é uma visão própria (não um recorte da Home): a troca é instantânea
 * (as visões já abertas ficam montadas, só escondidas) e cada uma lembra a posição de rolagem.
 * A URL só informa o ponto de partida (?f=, ?aba=) e é atualizada sem navegar.
 */
export function RadioCliente({
  radio,
  continuarServidor,
  validos,
  clima,
  artistas,
  stories,
  faixasDosStories,
  agora,
  filtroInicial,
  abaInicial,
}: {
  radio: Radio;
  /** Escutas da conta (servidor), para completar o histórico local do Continue ouvindo. */
  continuarServidor: FaixaListada[];
  /** Ids de playlists, álbuns e perfis que existem (valida os atalhos locais). */
  validos: string[];
  clima: ClimaAgora;
  artistas: ArtistaConhecer[];
  /** Stories ativos (últimos 7 dias). */
  stories: Story[];
  faixasDosStories: Record<string, FaixaDoStory>;
  agora: number;
  filtroInicial: Filtro;
  abaInicial: Aba | null;
}) {
  const filtros = filtrosVisiveis({ albuns: radio.albuns.length > 0, stories: stories.length > 0 });
  const inicial: Filtro = filtros.some((f) => f.id === filtroInicial) ? filtroInicial : "tudo";
  const [filtro, setFiltro] = useState<Filtro>(inicial);
  const [abertos, setAbertos] = useState<Set<Filtro>>(() => new Set<Filtro>([inicial]));
  const [aba, setAba] = useState<Aba>(abaInicial ?? "descobertas");
  const toque = useRef<{ x: number; y: number } | null>(null);
  const rolagem = useRef<Partial<Record<Filtro, number>>>({});

  // Depois de abrir a tela, monta as outras visões em segundo plano: a primeira troca também é instantânea.
  useEffect(() => {
    const t = setTimeout(() => setAbertos(new Set(filtros.map((f) => f.id))), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só no primeiro desenho
  }, []);

  // Restaura a rolagem da visão escolhida (a de cada filtro é independente).
  useEffect(() => {
    window.scrollTo(0, rolagem.current[filtro] ?? 0);
  }, [filtro]);

  function lembrar(f: Filtro, a: Aba) {
    const q = new URLSearchParams();
    if (f !== "tudo") q.set("f", f);
    if (a !== "descobertas") q.set("aba", a);
    history.replaceState(null, "", q.size ? `/?${q}` : "/");
  }
  const escolherFiltro = (f: Filtro) => {
    if (f === filtro) return;
    rolagem.current[filtro] = window.scrollY;
    setAbertos((s) => new Set(s).add(f));
    setFiltro(f);
    lembrar(f, aba);
  };
  const escolherAba = (a: Aba) => {
    setAba(a);
    lembrar(filtro, a);
  };

  const alta = radio.emAlta;
  const vazio = radio.faixas.length === 0 || !radio.noAr;
  const visao = (f: Filtro) => (filtro === f ? "flex flex-col gap-5" : "hidden");
  const aberta = (f: Filtro) => abertos.has(f);

  return (
    <>
      <div className={filtro === "tudo" ? "" : "hidden"}>
        <FaixaStories stories={stories} faixas={faixasDosStories} agora={agora} />
      </div>
      <nav aria-label="Filtros" className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-night-900 px-4 py-2">
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

      {/* TUDO: a Home, uma rádio viva. */}
      <div data-testid="visao-tudo" className={visao("tudo")}>
        {vazio ? (
          <EstadoVazio />
        ) : (
          <>
            <CartaoNoAr faixa={radio.noAr!.faixa} fila={radio.noAr!.fila} continuo={radio.noAr!.continuo} atual={radio.programa.atual} proximo={radio.programa.proximo} />
            <div data-testid="agora-combina">
              <CarrosselFaixas
                titulo={`Agora combina com ${clima.label}`}
                dica={clima.doClima ? "Faixas desse clima, no horário de Brasília" : "Ainda sem faixas desse clima: as mais recentes"}
                faixas={clima.faixas}
                margemSnap
              />
            </div>
            <ContinueOuvindo faixas={radio.faixas} servidor={continuarServidor} validos={validos} />
            <SelecaoPrateleira lista={radio.selecao} />
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
      </div>

      <div data-testid="visao-faixas" className={visao("faixas")}>
        {aberta("faixas") && (vazio ? <EstadoVazio /> : <CatalogoFaixas faixas={radio.faixas} />)}
      </div>
      <div data-testid="visao-playlists" className={visao("playlists")}>
        {aberta("playlists") && <GradePlaylists selecao={radio.selecao} playlists={radio.todasPlaylists} />}
      </div>
      {radio.albuns.length > 0 && (
        <div data-testid="visao-albuns" className={visao("albuns")}>
          {aberta("albuns") && <GradeAlbuns lista={radio.albuns} />}
        </div>
      )}
      {stories.length > 0 && (
        <div data-testid="visao-stories" className={visao("stories")}>
          {aberta("stories") && <FaixaStories stories={stories} faixas={faixasDosStories} agora={agora} modo="grade" />}
        </div>
      )}
    </>
  );
}
