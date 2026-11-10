import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Player } from "@/components/player";
import { Tela } from "@/components/ui";
import { obterPlaylist } from "@/lib/playlists/queries";
import { isUuid } from "@/lib/playlists/rules";

async function Conteudo({ params }: Pick<PageProps<"/playlist/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const playlist = await obterPlaylist(id);
  if (!playlist) notFound();
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">{playlist.title}</h1>
      {playlist.faixas.length === 0 ? (
        <p className="text-white/70">Nenhuma faixa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {playlist.faixas.map((f) => (
            <li key={f.id} className="rounded-lg bg-white/10 px-4 py-3">
              <Player trackId={f.id} title={f.title} />
            </li>
          ))}
        </ul>
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
