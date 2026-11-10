import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListaFaixas } from "@/components/lista-faixas";
import { Tela } from "@/components/ui";
import { obterPlaylist } from "@/lib/playlists/queries";
import { isUuid } from "@/lib/playlists/rules";
import { carregarRadio } from "@/lib/radio/queries";
import type { FaixaListada } from "@/lib/radio/rules";

async function Conteudo({ params }: Pick<PageProps<"/playlist/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const playlist = await obterPlaylist(id);
  if (!playlist) notFound();
  const radio = await carregarRadio();
  const porId = new Map(radio.faixas.map((f) => [f.id, f]));
  // A nota mostrada é a do curador desta playlist.
  const faixas = playlist.faixas
    .map((i) => {
      const f = porId.get(i.id);
      return f ? ({ ...f, note: i.note, playlister: playlist.curator } satisfies FaixaListada) : null;
    })
    .filter((f): f is FaixaListada => !!f);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{playlist.title}</h1>
        {playlist.curator && <p className="text-white/70">Playlist de {playlist.curator}</p>}
      </div>
      {faixas.length === 0 ? (
        <p className="text-white/70 text-pretty">Esta playlist ainda não tem faixas. Volte em breve.</p>
      ) : (
        <ListaFaixas rotulo="Faixas da playlist" faixas={faixas} />
      )}
    </>
  );
}

export default function PlaylistPage({ params }: PageProps<"/playlist/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
