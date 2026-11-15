"use client";
/* eslint-disable @next/next/no-img-element -- capas do bucket e fotos do Google por URL; sem otimizador (cota). */

import { useMemo, useState, type ReactNode } from "react";

import { CapaArte } from "@/components/capa";
import { Logo } from "@/components/logo";
import { useVistos } from "@/components/stories-vistos";
import { VisualizadorStories } from "@/components/visualizador-stories";
import { capaGerada } from "@/lib/radio/rules";
import { gruposDoExplorar, linhaDaHome, type CardHome } from "@/lib/stories/bio";
import type { GrupoStories, Story } from "@/lib/stories/rules";
import { primeiroNaoVisto, tudoVisto, type FaixaDoStory, type Posicao } from "@/lib/stories/viewer";

function Avatar({ g }: { g: GrupoStories }) {
  const foto = g.stories[0]?.bio?.foto;
  if (g.isPlatform) {
    return (
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full border-2 border-night-900 bg-night-800">
        <Logo className="h-5 w-auto" alt="" />
      </span>
    );
  }
  if (foto) return <img src={foto} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full border-2 border-night-900 object-cover" />;
  return (
    <span aria-hidden="true" style={{ background: capaGerada(g.authorName).fundo }} className="flex size-9 items-center justify-center rounded-full border-2 border-night-900 text-sm font-bold text-white">
      {g.authorName.charAt(0).toUpperCase()}
    </span>
  );
}

/** Fundo do card: foto do artista (bio), capa da faixa do story, ou o gradiente do perfil. */
function Fundo({ story, faixa }: { story: Story; faixa: FaixaDoStory | null }) {
  if (story.bio) return <img src={story.bio.foto} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />;
  if (!faixa) return null;
  return faixa.hasCover ? (
    <img src={`/api/tracks/${faixa.id}/capa`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
  ) : (
    <CapaArte title={faixa.title} className="absolute inset-0 size-full !rounded-none" />
  );
}

/**
 * Card vertical de story (mesmo componente na Home e no Explorar). Bio: foto do artista em destaque, nome e gênero.
 * Novidade: story postado por quem a pessoa segue, com anel âmbar e selo "Novo".
 */
function CartaoStory({ g, tipo, vistos, faixas, onAbrir }: { g: GrupoStories; tipo: CardHome["tipo"] | "postado"; vistos: ReadonlySet<string>; faixas: Record<string, FaixaDoStory>; onAbrir: () => void }) {
  const visto = tudoVisto(g, vistos);
  const alvo = g.stories.find((s) => !vistos.has(s.id)) ?? g.stories[g.stories.length - 1];
  const faixa = alvo.trackId ? (faixas[alvo.trackId] ?? null) : null;
  const bio = alvo.bio;
  const linha = bio ? (bio.genero ?? alvo.body ?? faixa?.title ?? "") : (alvo.body?.split("\n")[0] || (faixa ? faixa.title : alvo.hasImage ? "Imagem" : "Story"));
  const n = g.stories.length;
  // A novidade já tem o selo "Novo" no topo: embaixo, só a contagem.
  const status = bio ? (visto ? "Visto" : "Conhecer") : visto ? "Visto" : tipo === "novidade" || n > 1 ? `${n} ${n === 1 ? "story" : "stories"}` : "Novo";
  const destaque = !visto && (tipo === "novidade" || tipo === "boas-vindas" || tipo === "postado");
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={bio ? `Conhecer ${g.authorName}` : `Ver stories de ${g.authorName}`}
      data-visto={visto ? "sim" : "nao"}
      data-tipo={tipo}
      className={`relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-xl p-2.5 text-left transition-opacity ${visto ? "opacity-75" : ""} ${
        destaque ? "ring-2 ring-brand ring-offset-2 ring-offset-night-900" : ""
      }`}
      style={{ background: g.isPlatform ? undefined : capaGerada(g.authorName).fundo }}
    >
      {g.isPlatform && <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-night-800 to-night-900" />}
      <Fundo story={alvo} faixa={faixa} />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night-900/90 via-night-900/15 to-night-900/30" />
      <span className="relative flex items-start justify-between gap-1">
        {bio ? <span /> : <Avatar g={g} />}
        {tipo === "novidade" && !visto && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-[0.6875rem] font-bold text-night-900">Novo</span>
        )}
      </span>
      <span className="relative flex flex-col gap-0.5">
        <span className="truncate text-sm font-bold">{g.authorName}</span>
        {linha && <span className="line-clamp-2 text-xs text-white/90">{linha}</span>}
        <span className="text-xs font-semibold text-white/80">{status}</span>
      </span>
    </button>
  );
}

/**
 * Linha horizontal de cards de story. Home ("Artistas para conhecer"): bios de artistas, com o story de boas-vindas
 * (visitante novo) e os stories novos de quem a pessoa segue no início. Explorar ("Stories"): postados de quem segue,
 * postados recentes, bios não vistas, bios vistas. Todos abrem o mesmo visualizador em tela cheia.
 */
export function LinhaStories({
  modo,
  bios,
  postados,
  seguidos: seguidosIds,
  visitante = false,
  faixas,
  agora,
  semBios,
}: {
  modo: "home" | "explorar";
  bios: Story[];
  /** Stories postados ativos (últimos 7 dias), inclusive o de boas-vindas da radioOn. */
  postados: Story[];
  seguidos: string[];
  /** Sem conta: o story de boas-vindas abre a linha da Home até ser visto. */
  visitante?: boolean;
  faixas: Record<string, FaixaDoStory>;
  agora: number;
  /** Home sem nenhum artista com story de bio (sem foto ainda): a lista simples de artistas. */
  semBios?: ReactNode;
}) {
  const vistos = useVistos();
  const seguidos = useMemo(() => new Set(seguidosIds), [seguidosIds]);
  const cards = useMemo<{ grupo: GrupoStories; tipo: CardHome["tipo"] | "postado" }[]>(() => {
    if (modo === "home") return linhaDaHome({ bios, postados, seguidos, vistos, visitante, agora });
    return gruposDoExplorar({ bios, postados, seguidos, vistos, agora }).map((g) => ({ grupo: g, tipo: g.stories[0]?.bio ? "bio" : "postado" }));
  }, [modo, bios, postados, seguidos, vistos, visitante, agora]);
  const [aberto, setAberto] = useState<{ grupos: GrupoStories[]; inicio: Posicao } | null>(null);

  const reserva = bios.length === 0 ? semBios : null;
  if (cards.length === 0 && !reserva) return null;
  const grupos = cards.map((c) => c.grupo);
  const abrir = (idx: number) => setAberto({ grupos, inicio: { g: idx, i: primeiroNaoVisto(grupos[idx], vistos) } });
  const titulo = modo === "home" ? "Artistas para conhecer" : "Stories";

  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {cards.length > 0 && <ul data-testid={modo === "home" ? "linha-artistas" : "stories-linha"} className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-1">
        {cards.map((c, idx) => (
          <li key={c.grupo.authorId} className="w-32 shrink-0 snap-start">
            <CartaoStory g={c.grupo} tipo={c.tipo} vistos={vistos} faixas={faixas} onAbrir={() => abrir(idx)} />
          </li>
        ))}
      </ul>}
      {reserva}
      {aberto && <VisualizadorStories grupos={aberto.grupos} faixas={faixas} agora={agora} inicio={aberto.inicio} seguidos={seguidosIds} onFechar={() => setAberto(null)} />}
    </section>
  );
}
