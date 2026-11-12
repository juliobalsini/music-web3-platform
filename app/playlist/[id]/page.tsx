import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListaFaixas } from "@/components/lista-faixas";
import { Tela } from "@/components/ui";
import { obterPlaylist } from "@/lib/playlists/queries";
import { isUuid } from "@/lib/playlists/rules";
import { ehSelecao, PLATAFORMA_ID, PLATAFORMA_NOME, selecaoRadioOn } from "@/lib/radio/home";
import { carregarRadio } from "@/lib/radio/queries";
import type { FaixaListada } from "@/lib/radio/rules";

/** Playlist automática da Seleção radioOn (virtual, dono: perfil oficial radioOn; recalculada a cada leitura). */
async function SelecaoPagina({ id }: { id: string }) {
  const radio = await carregarRadio();
  const sel = selecaoRadioOn(radio.faixas, new Date().getTime()).find((s) => s.id === id);
  if (!sel) notFound();
  const porId = new Map(radio.faixas.map((f) => [f.id, f]));
  const faixas = sel.faixas.map((i) => porId.get(i)).filter((f): f is FaixaListada => !!f);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{sel.title}</h1>
        <p className="text-white/70">Seleção de <Link href={`/perfil/${PLATAFORMA_ID}`} className="font-semibold text-brand underline-offset-2 hover:underline">{PLATAFORMA_NOME}</Link> · atualizada sozinha</p>
      </div>
      <ListaFaixas rotulo="Faixas da playlist" faixas={faixas} />
    </>
  );
}

async function Conteudo({ params }: Pick<PageProps<"/playlist/[id]">, "params">) {
  const { id } = await params;
  if (ehSelecao(id)) return <SelecaoPagina id={id} />;
  if (!isUuid(id)) notFound();
  const playlist = await obterPlaylist(id);
  if (!playlist) notFound();
  const radio = await carregarRadio();
  const porId = new Map(radio.faixas.map((f) => [f.id, f]));
  // A nota mostrada é a do curador desta playlist.
  const todas = playlist.faixas
    .map((i) => {
      const f = porId.get(i.id);
      return f ? { faixa: { ...f, note: i.note, playlister: playlist.curator } satisfies FaixaListada, destaque: i.featured } : null;
    })
    .filter((f): f is { faixa: FaixaListada; destaque: boolean } => !!f);
  const faixas = todas.map((x) => x.faixa);
  const destaques = todas.filter((x) => x.destaque).map((x) => x.faixa);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{playlist.title}</h1>
        {playlist.curator && <p className="text-white/70">Playlist de <Link href={`/perfil/${playlist.curatorId}`} className="font-semibold text-brand underline-offset-2 hover:underline">{playlist.curator}</Link></p>}
      </div>
      {faixas.length === 0 ? (
        <p className="text-white/70 text-pretty">Esta playlist ainda não tem faixas. Volte em breve.</p>
      ) : (
        <>
          {destaques.length > 0 && (
            <section aria-label="Em destaque" className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">Em destaque</h2>
              <ListaFaixas rotulo="Faixas em destaque" faixas={destaques} />
            </section>
          )}
          <ListaFaixas rotulo="Faixas da playlist" faixas={faixas} />
        </>
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
