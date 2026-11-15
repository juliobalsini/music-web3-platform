import { Suspense } from "react";

import { EsqueletoRadio } from "@/components/esqueleto-radio";
import { RadioCliente } from "@/components/radio-cliente";
import { lerAba, lerFiltro } from "@/lib/menu";
import { PLATAFORMA_ID, selecaoRadioOn } from "@/lib/radio/home";
import { carregarRadio, continuarOuvindo } from "@/lib/radio/queries";
import { getSessaoAny } from "@/lib/session";
import { seguidosDe, seguidosDemo } from "@/lib/seguir/queries";
import { carregarBios } from "@/lib/stories/bio-queries";
import { faixasDosStories as mapaFaixas } from "@/lib/stories/faixas";
import { carregarStories } from "@/lib/stories/queries";
import { storiesAtivos } from "@/lib/stories/rules";

async function Conteudo({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const [radio, todosStories] = await Promise.all([carregarRadio(), carregarStories().catch(() => [])]);
  const agora = new Date().getTime();
  const stories = storiesAtivos(todosStories, agora);
  const bios = await carregarBios(radio.faixas);
  const faixasDosStories = mapaFaixas(radio.faixas, [...stories, ...bios]);

  // "Continue ouvindo" só existe para quem tem histórico (conta ou visitante com sessão).
  let continuar: Awaited<ReturnType<typeof continuarOuvindo>> = [];
  let seguidos: string[] = [];
  let visitante = true;
  try {
    const sessao = await getSessaoAny();
    if (sessao && !sessao.anonimo) {
      visitante = false;
      seguidos = await seguidosDe(sessao.supabase, sessao.userId);
    }
    if (sessao) continuar = await continuarOuvindo(sessao.userId, radio.faixas);
  } catch {
    /* sem sessão */
  }
  seguidos = [...new Set([...seguidos, ...(await seguidosDemo())])];

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
      <RadioCliente radio={radio} continuarServidor={continuar} validos={validos} stories={stories} bios={bios} seguidos={seguidos} visitante={visitante} faixasDosStories={faixasDosStories} agora={agora} filtroInicial={lerFiltro(sp.f)} abaInicial={lerAba(sp.aba)} />
    </>
  );
}

export default function Radio({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4">
      <h1 className="sr-only">radioOn · Rádio</h1>
      <Suspense fallback={<EsqueletoRadio />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
