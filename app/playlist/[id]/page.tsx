import { BadgeCheck, CalendarHeart } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AcoesPlaylist } from "@/components/acoes-playlist";
import { CapaPlaylist } from "@/components/capa-playlist";
import { ChipStatus } from "@/components/ds";
import { EditorPlaylist } from "@/components/editor-playlist";
import { RegistrarVisita } from "@/components/registrar-visita";
import { ListaFaixas } from "@/components/lista-faixas";
import { Tela } from "@/components/ui";
import { obterPlaylist } from "@/lib/playlists/queries";
import { isUuid } from "@/lib/playlists/rules";
import { curadorDaSelecao } from "@/lib/radio/curadores";
import { temaAtual, temaDa } from "@/lib/playlists/tema";
import { ehSelecao, selecaoRadioOn } from "@/lib/radio/home";
import { getSessionRole } from "@/lib/session";
import { carregarRadio } from "@/lib/radio/queries";
import type { FaixaListada } from "@/lib/radio/rules";

/** Playlist automática da Seleção radioOn (virtual; assina o curador oficial do gênero ou o perfil radioOn; recalculada a cada leitura). */
async function SelecaoPagina({ id }: { id: string }) {
  const radio = await carregarRadio();
  const sel = selecaoRadioOn(radio.faixas, new Date().getTime()).find((s) => s.id === id);
  if (!sel) notFound();
  const porId = new Map(radio.faixas.map((f) => [f.id, f]));
  const faixas = sel.faixas.map((i) => porId.get(i)).filter((f): f is FaixaListada => !!f);
  const curador = curadorDaSelecao(sel);
  return (
    <>
      <RegistrarVisita tipo="playlist" id={sel.id} titulo={sel.title} sub={curador.nome} capaId={faixas[0]?.id ?? null} temCapa={faixas[0]?.hasCover ?? false} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{sel.title}</h1>
        <p className="text-white/70">
          Seleção de{" "}
          <Link data-testid="selecao-curador" href={`/perfil/${curador.id}`} className="inline-flex items-center gap-1 font-semibold text-brand underline-offset-2 hover:underline">
            {curador.nome}
            <BadgeCheck aria-hidden="true" className="size-4" />
          </Link>{" "}
          · atualizada sozinha
        </p>
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

  const tema = temaAtual(new Date().getTime());
  // Dono: rascunho (ou ?editar=1) abre o editor, que é a própria página como será publicada.
  if (playlist.mine && (!playlist.isPublic || sp.editar === "1")) {
    return (
      <EditorPlaylist
        id={id}
        titulo={playlist.title}
        descricao={playlist.description ?? ""}
        faixas={playlist.faixas.map((i) => porId.get(i.id)).filter((f): f is FaixaListada => !!f)}
        catalogo={radio.faixas.slice(0, 300)}
        publicada={playlist.isPublic}
        capa={playlist.capa}
        curadoria={Object.fromEntries(playlist.faixas.map((i) => [i.id, { note: i.note, featured: i.featured, hidden: i.hidden }]))}
        tema={tema}
        marcadaNoTema={playlist.temaSemana === tema.semana}
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
        <CapaPlaylist titulo={playlist.title} faixas={faixas} capa={playlist.capa} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-balance">{playlist.title}</h1>
          {playlist.temaSemana && (
            <span data-testid="chip-tema">
              <ChipStatus tom="destaque" icone={<CalendarHeart className="size-3.5" aria-hidden="true" />}>
                {playlist.temaSemana === tema.semana ? "Tema da semana" : "Tema"}: {temaDa(playlist.temaSemana).titulo}
              </ChipStatus>
            </span>
          )}
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
