"use client";
/* eslint-disable @next/next/no-img-element -- capas do bucket por URL assinada; sem otimizador (cota). */

import { useMemo, useState } from "react";

import { CapaArte } from "@/components/capa";
import { Logo } from "@/components/logo";
import { useVistos } from "@/components/stories-vistos";
import { VisualizadorStories } from "@/components/visualizador-stories";
import { capaGerada } from "@/lib/radio/rules";
import { agruparPorAutor, type GrupoStories, type Story } from "@/lib/stories/rules";
import { ordenarGrupos, primeiroNaoVisto, tudoVisto, type FaixaDoStory, type Posicao } from "@/lib/stories/viewer";


/** Anel âmbar (não visto) ou cinza (visto) em volta do avatar. */
function Anel({ visto, children }: { visto: boolean; children: React.ReactNode }) {
  return <span data-visto={visto ? "sim" : "nao"} className={`rounded-full p-[3px] ${visto ? "bg-white/30" : "bg-gradient-to-br from-brand to-brand-2"}`}>{children}</span>;
}

function Avatar({ g, tamanho }: { g: GrupoStories; tamanho: string }) {
  return (
    <span
      aria-hidden="true"
      style={g.isPlatform ? undefined : { background: capaGerada(g.authorName).fundo }}
      className={`flex ${tamanho} items-center justify-center rounded-full border-[3px] border-night-900 font-bold text-white ${g.isPlatform ? "bg-night-800" : ""}`}
    >
      {g.isPlatform ? <Logo className="h-8 w-auto" alt="" /> : g.authorName.charAt(0).toUpperCase()}
    </span>
  );
}

/** Card vertical de um perfil (grade Rádio > Stories e linha do Explorar): capa da faixa, avatar com anel e estado visto. */
function CartaoPerfil({ g, vistos, faixas, onAbrir }: { g: GrupoStories; vistos: ReadonlySet<string>; faixas: Record<string, FaixaDoStory>; onAbrir: () => void }) {
  const visto = tudoVisto(g, vistos);
  const alvo = g.stories.find((s) => !vistos.has(s.id)) ?? g.stories[g.stories.length - 1];
  const faixa = alvo.trackId ? faixas[alvo.trackId] : null;
  const tem = g.stories.length;
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Ver stories de ${g.authorName}`}
      data-visto={visto ? "sim" : "nao"}
      className={`relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-xl p-2.5 text-left ${visto ? "opacity-75" : ""}`}
      style={{ background: capaGerada(g.authorName).fundo }}
    >
      {faixa && (faixa.hasCover ? <img src={`/api/tracks/${faixa.id}/capa`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" /> : <CapaArte title={faixa.title} className="absolute inset-0 size-full !rounded-none" />)}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night-900/85 via-night-900/10 to-night-900/40" />
      <span className="relative self-start">
        <Anel visto={visto}><Avatar g={g} tamanho="size-9 text-sm" /></Anel>
      </span>
      <span className="relative flex flex-col gap-0.5">
        <span className="truncate text-sm font-bold">{g.authorName}</span>
        <span className="line-clamp-2 text-xs text-white/90">{alvo.body?.split("\n")[0] || (faixa ? faixa.title : alvo.hasImage ? "Imagem" : "Story")}</span>
        <span className="text-xs font-semibold text-white/80">{visto ? "Visto" : tem > 1 ? `${tem} stories` : "Novo"}</span>
      </span>
    </button>
  );
}

/**
 * Stories recentes: círculos (home), grade (Rádio > Stories) ou linha de cards (Explorar). Todos abrem o mesmo
 * visualizador em tela cheia. A ordem é: radioOn oficial, não vistos, vistos (congelada ao abrir).
 */
export function FaixaStories({
  stories,
  faixas,
  agora,
  modo = "circulos",
  usuarioArtista = false,
}: {
  stories: Story[];
  faixas: Record<string, FaixaDoStory>;
  agora: number;
  modo?: "circulos" | "grade" | "linha";
  /** Artista/playlister logado: mostra "Seu story +" no início. */
  usuarioArtista?: boolean;
}) {
  const vistos = useVistos();
  const grupos = useMemo(() => ordenarGrupos(agruparPorAutor(stories), vistos), [stories, vistos]);
  const [aberto, setAberto] = useState<{ grupos: GrupoStories[]; inicio: Posicao } | null>(null);

  if (grupos.length === 0 && !usuarioArtista) return null;
  const abrir = (idx: number) => setAberto({ grupos, inicio: { g: idx, i: primeiroNaoVisto(grupos[idx], vistos) } });

  return (
    <section aria-label="Stories" className="flex flex-col gap-2">
      {modo === "circulos" && (
        <ul data-testid="stories-circulos" className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
          {usuarioArtista && (
            <li className="w-[4.75rem] shrink-0">
              <a href="/stories/novo" aria-label="Seu story, publicar" className="flex w-full flex-col items-center gap-1 rounded-lg py-1">
                <span className="rounded-full border-2 border-dashed border-brand p-[3px]">
                  <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-night-800 text-3xl font-bold text-brand">+</span>
                </span>
                <span className="w-full truncate text-center text-xs font-semibold">Seu story +</span>
              </a>
            </li>
          )}
          {grupos.map((g, idx) => (
            <li key={g.authorId} className="w-[4.75rem] shrink-0">
              <button type="button" onClick={() => abrir(idx)} aria-label={`Ver stories de ${g.authorName}`} className="flex w-full flex-col items-center gap-1 rounded-lg py-1">
                <Anel visto={tudoVisto(g, vistos)}>
                  <Avatar g={g} tamanho="size-16 text-xl" />
                </Anel>
                <span className="w-full truncate text-center text-xs font-semibold">{g.authorName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {modo === "grade" && (
        <>
          <h2 className="text-lg font-bold">Stories no ar</h2>
          <ul data-testid="stories-grade" className="grid grid-cols-2 gap-3">
            {grupos.map((g, idx) => (
              <li key={g.authorId}><CartaoPerfil g={g} vistos={vistos} faixas={faixas} onAbrir={() => abrir(idx)} /></li>
            ))}
          </ul>
        </>
      )}
      {modo === "linha" && (
        <>
          <h2 className="text-lg font-bold">Stories</h2>
          <ul data-testid="stories-linha" className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {grupos.map((g, idx) => (
              <li key={g.authorId} className="w-32 shrink-0"><CartaoPerfil g={g} vistos={vistos} faixas={faixas} onAbrir={() => abrir(idx)} /></li>
            ))}
          </ul>
        </>
      )}
      {aberto && <VisualizadorStories grupos={aberto.grupos} faixas={faixas} agora={agora} inicio={aberto.inicio} onFechar={() => setAberto(null)} />}
    </section>
  );
}
