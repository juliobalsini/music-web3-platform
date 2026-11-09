import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Player } from "@/components/player";
import { obterPlaylist } from "@/lib/playlists/queries";
import { isUuid } from "@/lib/playlists/rules";

async function Conteudo({ params }: Pick<PageProps<"/playlist/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const playlist = await obterPlaylist(id);
  if (!playlist) notFound();
  return (
    <>
      <h1 className="text-2xl font-semibold">{playlist.title}</h1>
      {playlist.faixas.length === 0 ? (
        <p className="text-white/70">Nenhuma faixa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {playlist.faixas.map((f) => (
            <li key={f.id}><Player trackId={f.id} title={f.title} /></li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PlaylistPage({ params }: PageProps<"/playlist/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
