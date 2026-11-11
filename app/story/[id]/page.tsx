import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ConteudoStory } from "@/components/conteudo-story";
import { Tela } from "@/components/ui";
import { isUuid } from "@/lib/playlists/rules";
import { carregarRadio } from "@/lib/radio/queries";
import { carregarStories } from "@/lib/stories/queries";

/** Pré-visualização (WhatsApp, redes): o cartão vertical do story. */
export async function generateMetadata({ params }: Pick<PageProps<"/story/[id]">, "params">): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return {};
  const story = (await carregarStories()).find((s) => s.id === id);
  if (!story) return {};
  const titulo = `${story.authorName} no radioOn`;
  const imagem = { url: `/api/stories/${id}/cartao`, width: 1080, height: 1920, alt: titulo };
  return {
    title: `${titulo} · story`,
    description: story.body ?? "Ouça no radioOn.",
    openGraph: { title: titulo, description: story.body ?? "Ouça no radioOn", images: [imagem] },
    twitter: { card: "summary_large_image", title: titulo, images: [imagem.url] },
  };
}

async function Conteudo({ params }: Pick<PageProps<"/story/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [stories, radio] = await Promise.all([carregarStories(), carregarRadio()]);
  const story = stories.find((s) => s.id === id);
  if (!story) notFound();
  const f = story.trackId ? radio.faixas.find((x) => x.id === story.trackId) : undefined;
  return <ConteudoStory story={story} faixa={f ? { id: f.id, title: f.title, artistName: f.artistName, durationSec: f.durationSec } : null} agora={new Date().getTime()} />;
}

export default function StoryPage({ params }: PageProps<"/story/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
