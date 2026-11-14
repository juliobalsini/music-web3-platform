import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BotaoFaixa } from "@/components/botao-faixa";
import { Capa } from "@/components/capa";
import { Tela } from "@/components/ui";
import { isUuid } from "@/lib/playlists/rules";
import { carregarRadio } from "@/lib/radio/queries";

/** Pré-visualização (WhatsApp, redes): título, artista e imagem 1200x630 gerada em /api/tracks/[id]/og. */
export async function generateMetadata({ params }: Pick<PageProps<"/faixa/[id]">, "params">): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return {};
  const faixa = (await carregarRadio()).faixas.find((f) => f.id === id);
  if (!faixa) return {};
  const titulo = `${faixa.title} · ${faixa.artistName}`;
  const imagem = { url: `/api/tracks/${id}/og`, width: 1200, height: 630, alt: titulo };
  return {
    title: `${titulo} · radioOn`,
    description: "Ouça na radioOn: música independente, sem cadastro.",
    openGraph: { title: titulo, description: "Ouça na radioOn", type: "music.song", images: [imagem] },
    twitter: { card: "summary_large_image", title: titulo, images: [imagem.url] },
  };
}

// Página de compartilhamento: capa, título, artista e play.
async function Conteudo({ params }: Pick<PageProps<"/faixa/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const radio = await carregarRadio();
  const faixa = radio.faixas.find((f) => f.id === id);
  if (!faixa) notFound();
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Capa id={faixa.id} title={faixa.title} hasCover={faixa.hasCover} className="size-60" />
      <div>
        <h1 className="text-2xl font-bold text-balance">{faixa.title}</h1>
        <p className="text-white/70">{faixa.artistName}</p>
      </div>
      <BotaoFaixa faixa={faixa} />
      <p className="text-sm text-white/70">Ouça 30s e ganhe pontos.</p>
    </div>
  );
}

export default function FaixaPage({ params }: PageProps<"/faixa/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
