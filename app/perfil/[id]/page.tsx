import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListaFaixas } from "@/components/lista-faixas";
import { PlaylistsDaSemana } from "@/components/secoes-radio";
import { Tela } from "@/components/ui";
import { isUuid } from "@/lib/playlists/rules";
import { carregarRadio } from "@/lib/radio/queries";

export const metadata = { title: "Perfil · radioOn" };

/** Perfil público de artista e/ou curador: só nome, faixas publicadas e playlists públicas. */
async function Conteudo({ params }: Pick<PageProps<"/perfil/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const radio = await carregarRadio();
  const faixas = radio.faixas.filter((f) => f.artistId === id);
  const playlists = radio.todasPlaylists.filter((p) => p.curatorId === id);
  if (faixas.length === 0 && playlists.length === 0) notFound();
  const nome = faixas[0]?.artistName ?? playlists[0]?.curator ?? "Perfil";
  const plays = faixas.reduce((n, f) => n + f.plays, 0);
  return (
    <>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-2xl font-bold text-night-900">
          {nome.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{nome}</h1>
          <p className="text-sm text-white/70">
            {[faixas.length > 0 && `${faixas.length} ${faixas.length === 1 ? "faixa" : "faixas"}`, faixas.length > 0 && `${plays} escutas`, playlists.length > 0 && `${playlists.length} ${playlists.length === 1 ? "playlist" : "playlists"}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {faixas.length > 0 && (
        <section aria-label="Faixas do artista" className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Faixas</h2>
          <ListaFaixas rotulo="Faixas do artista" faixas={faixas} />
        </section>
      )}
      <PlaylistsDaSemana titulo="Playlists" lista={playlists} />
    </>
  );
}

export default function PerfilPage({ params }: PageProps<"/perfil/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
