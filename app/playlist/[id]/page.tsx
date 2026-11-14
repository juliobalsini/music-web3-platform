import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AcoesPlaylist } from "@/components/acoes-playlist";
import { Capa } from "@/components/capa";
import { EditorPlaylist } from "@/components/editor-playlist";
import { RegistrarVisita } from "@/components/registrar-visita";
import { ListaFaixas } from "@/components/lista-faixas";
import { Tela } from "@/components/ui";
import { obterPlaylist } from "@/lib/playlists/queries";
import { isUuid } from "@/lib/playlists/rules";
import { ehSelecao, PLATAFORMA_ID, PLATAFORMA_NOME, selecaoRadioOn } from "@/lib/radio/home";
import { getSessionRole } from "@/lib/session";
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
      <RegistrarVisita tipo="playlist" id={sel.id} titulo={sel.title} sub={PLATAFORMA_NOME} capaId={faixas[0]?.id ?? null} temCapa={faixas[0]?.hasCover ?? false} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{sel.title}</h1>
        <p className="text-white/70">Seleção de <Link href={`/perfil/${PLATAFORMA_ID}`} className="font-semibold text-brand underline-offset-2 hover:underline">{PLATAFORMA_NOME}</Link> · atualizada sozinha</p>
      </div>
      <ListaFaixas rotulo="Faixas da playlist" faixas={faixas} />
    </>
  );
}

async function Conteudo({ params, searchParams }: Pick<PageProps<"/playlist/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  if (ehSelecao(id)) return <SelecaoPagina id={id} />;
  if (!isUuid(id)) notFound();
  const playlist = await obterPlaylist(id);
  if (!playlist) notFound();
  const sp = await searchParams;
  const radio = await carregarRadio();
  const porId = new Map(radio.faixas.map((f) => [f.id, f]));

  // Dono: rascunho (ou ?editar=1) abre o editor, que é a própria página como será publicada.
  if (playlist.mine && (!playlist.isPublic || sp.editar === "1")) {
    const slim = (f: FaixaListada) => ({ id: f.id, title: f.title, artistName: f.artistName, hasCover: f.hasCover });
    return (
      <EditorPlaylist
        id={id}
        titulo={playlist.title}
        descricao={playlist.description ?? ""}
        faixas={playlist.faixas.map((i) => porId.get(i.id)).filter((f): f is FaixaListada => !!f).map(slim)}
        catalogo={radio.faixas.slice(0, 300).map(slim)}
        publicada={playlist.isPublic}
      />
    );
  }
  if (!playlist.isPublic) notFound();

  // A nota mostrada é a do curador desta playlist.
  const todas = playlist.faixas
    .map((i) => {
      const f = porId.get(i.id);
      return f ? { faixa: { ...f, note: i.note, playlister: playlist.curator } satisfies FaixaListada, destaque: i.featured } : null;
    })
    .filter((f): f is { faixa: FaixaListada; destaque: boolean } => !!f);
  const faixas = todas.map((x) => x.faixa);
  const destaques = todas.filter((x) => x.destaque).map((x) => x.faixa);
  const sessao = await getSessionRole().catch(() => null);
  return (
    <>
      <RegistrarVisita tipo="playlist" id={id} titulo={playlist.title} sub={playlist.curator ?? "Playlist"} capaId={faixas[0]?.id ?? null} temCapa={faixas[0]?.hasCover ?? false} />
      <div className="flex items-start gap-4">
        <div className="grid size-28 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-xl" aria-hidden="true">
          {faixas.slice(0, 4).map((f) => <Capa key={f.id} id={f.id} title={f.title} hasCover={f.hasCover} className="size-14 !rounded-none" />)}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-balance">{playlist.title}</h1>
          {playlist.curator && <p className="text-white/70">Playlist de <Link href={`/perfil/${playlist.curatorId}`} className="font-semibold text-brand underline-offset-2 hover:underline">{playlist.curator}</Link></p>}
        </div>
      </div>
      {playlist.description && <p className="text-white/80 text-pretty">{playlist.description}</p>}
      <AcoesPlaylist
        id={id}
        titulo={playlist.title}
        autor={playlist.curator}
        faixas={faixas}
        saves={playlist.saves}
        salva={playlist.saved}
        logado={!!sessao}
        dono={playlist.mine}
        abrirCompartilhar={sp.publicada === "1"}
      />
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

export default function PlaylistPage({ params, searchParams }: PageProps<"/playlist/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}
