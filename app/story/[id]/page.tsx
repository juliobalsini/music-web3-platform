import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StoryCompartilhado } from "@/components/story-compartilhado";
import { isUuid } from "@/lib/playlists/rules";
import { carregarRadio } from "@/lib/radio/queries";
import { carregarStories } from "@/lib/stories/queries";
import { ativo, agruparPorAutor } from "@/lib/stories/rules";

/** Pré-visualização (WhatsApp, redes): o cartão vertical do story. */
export async function generateMetadata({ params }: Pick<PageProps<"/story/[id]">, "params">): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return {};
  const story = (await carregarStories()).find((s) => s.id === id);
  if (!story) return {};
  const titulo = `${story.authorName} na radioOn`;
  const imagem = { url: `/api/stories/${id}/cartao`, width: 1080, height: 1920, alt: titulo };
  return {
    title: `${titulo} · story`,
    description: story.body ?? "Ouça na radioOn.",
    openGraph: { title: titulo, description: story.body ?? "Ouça na radioOn", images: [imagem] },
    twitter: { card: "summary_large_image", title: titulo, images: [imagem.url] },
  };
}

async function Conteudo({ params }: Pick<PageProps<"/story/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [stories, radio] = await Promise.all([carregarStories(), carregarRadio()]);
  const story = stories.find((s) => s.id === id);
  if (!story) notFound();
  const agora = new Date().getTime();
  // O perfil do autor: stories ativos (cronológicos) e, se este já está arquivado, só ele.
  const doAutor = stories.filter((s) => s.authorId === story.authorId && (ativo(s.createdAt, agora) || s.id === story.id));
  const grupo = agruparPorAutor(doAutor)[0];
  const faixas = Object.fromEntries(
    radio.faixas.filter((f) => grupo.stories.some((s) => s.trackId === f.id)).map((f) => [f.id, { id: f.id, title: f.title, artistName: f.artistName, durationSec: f.durationSec, hasCover: f.hasCover }]),
  );
  return <StoryCompartilhado grupo={grupo} indice={Math.max(0, grupo.stories.findIndex((s) => s.id === id))} faixas={faixas} agora={agora} />;
}

export default function StoryPage({ params }: PageProps<"/story/[id]">) {
  return (
    <Suspense>
      <Conteudo params={params} />
    </Suspense>
  );
}
