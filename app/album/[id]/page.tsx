import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BotaoAlbum } from "@/components/botao-album";
import { RegistrarVisita } from "@/components/registrar-visita";
import { Capa } from "@/components/capa";
import { ListaFaixas } from "@/components/lista-faixas";
import { Tela } from "@/components/ui";
import { isUuid } from "@/lib/playlists/rules";
import { carregarRadio } from "@/lib/radio/queries";

export const metadata: Metadata = { title: "Álbum · radioOn" };

async function Conteudo({ params }: Pick<PageProps<"/album/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const album = (await carregarRadio()).albuns.find((a) => a.id === id);
  if (!album) notFound();
  const primeira = album.faixas[0];
  return (
    <>
      <RegistrarVisita tipo="album" id={album.id} titulo={album.title} sub={`${album.kind === "ep" ? "EP" : "Álbum"} · ${album.artistName}`} capaId={primeira.id} temCapa={primeira.hasCover} />
      <div className="flex flex-col items-center gap-4 text-center">
        <Capa id={primeira.id} title={album.title} hasCover={primeira.hasCover} className="size-56 !rounded-xl" />
        <div>
          <h1 className="text-2xl font-bold text-balance">{album.title}</h1>
          <p className="text-white/70">
            {album.kind === "ep" ? "EP" : "Álbum"} ·{" "}
            <Link href={`/perfil/${album.artistId}`} className="underline underline-offset-2">{album.artistName}</Link>
          </p>
        </div>
        <BotaoAlbum faixas={album.faixas} />
      </div>
      <ListaFaixas rotulo={`Faixas de ${album.title}`} faixas={album.faixas} numerar />
    </>
  );
}

export default function AlbumPage({ params }: PageProps<"/album/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
