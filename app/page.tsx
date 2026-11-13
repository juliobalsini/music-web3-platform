import { Suspense } from "react";

import { CabecalhoHome } from "@/components/cabecalho-home";
import { RadioCliente } from "@/components/radio-cliente";
import { PlayVazio } from "@/components/secoes-radio";
import { lerAba, lerFiltro } from "@/lib/menu";
import { PLATAFORMA_ID, selecaoRadioOn } from "@/lib/radio/home";
import { carregarRadio, continuarOuvindo } from "@/lib/radio/queries";
import { getSessaoAny } from "@/lib/session";
import { carregarStories } from "@/lib/stories/queries";
import { idsDaPlataforma, podePublicarStory, storiesAtivos } from "@/lib/stories/rules";

async function Conteudo({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const [radio, todosStories] = await Promise.all([carregarRadio(), carregarStories().catch(() => [])]);
  const agora = new Date().getTime();
  const stories = storiesAtivos(todosStories, agora);
  const faixasDosStories = Object.fromEntries(
    radio.faixas.filter((f) => stories.some((s) => s.trackId === f.id)).map((f) => [f.id, { id: f.id, title: f.title, artistName: f.artistName, durationSec: f.durationSec, hasCover: f.hasCover }]),
  );

  // "Continue ouvindo" só existe para quem tem histórico (conta ou visitante com sessão).
  let continuar: Awaited<ReturnType<typeof continuarOuvindo>> = [];
  let podePublicar = false;
  try {
    const sessao = await getSessaoAny();
    if (sessao && !sessao.anonimo) podePublicar = podePublicarStory(sessao.role, sessao.userId, idsDaPlataforma(process.env.PLATFORM_STORY_IDS)).pode;
    if (sessao) continuar = await continuarOuvindo(sessao.userId, radio.faixas);
  } catch {
    /* sem sessão */
  }

  // Ids que existem (playlists, seleção, álbuns, perfis): validam os atalhos locais do "Continue ouvindo".
  const validos = [
    ...radio.todasPlaylists.map((p) => p.id),
    ...selecaoRadioOn(radio.faixas, agora).map((s) => s.id),
    ...radio.albuns.map((a) => a.id),
    ...radio.faixas.map((f) => f.artistId),
    ...radio.todasPlaylists.map((p) => p.curatorId),
    PLATAFORMA_ID,
  ];

  return (
    <>
      <CabecalhoHome ouvindo={radio.ouvindo} />
      <RadioCliente radio={radio} continuarServidor={continuar} validos={validos} podePublicar={podePublicar} stories={stories} faixasDosStories={faixasDosStories} agora={agora} filtroInicial={lerFiltro(sp.f)} abaInicial={lerAba(sp.aba)} />
    </>
  );
}

export default function Radio({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4">
      <h1 className="sr-only">radioOn · Rádio</h1>
      <Suspense
        fallback={
          <>
            <CabecalhoHome ouvindo={1} />
            <div className="flex justify-center py-16">
              <PlayVazio />
            </div>
          </>
        }
      >
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
