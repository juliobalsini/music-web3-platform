import { Suspense } from "react";

import { RadioCliente } from "@/components/radio-cliente";
import { PlayVazio } from "@/components/secoes-radio";
import { lerAba, lerFiltro } from "@/lib/menu";
import { artistasParaConhecer, climaAgora, faixasDoClima, RADIOON_ID } from "@/lib/radio/home";
import { rotuloClima } from "@/lib/radio/generos";
import { carregarRadio, continuarOuvindo } from "@/lib/radio/queries";
import { getSessaoAny } from "@/lib/session";
import { carregarStories } from "@/lib/stories/queries";
import { storiesAtivos } from "@/lib/stories/rules";

async function Conteudo({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const [radio, todosStories] = await Promise.all([carregarRadio(), carregarStories().catch(() => [])]);
  const agora = new Date().getTime();
  const stories = storiesAtivos(todosStories, agora);
  const faixasDosStories = Object.fromEntries(
    radio.faixas.filter((f) => stories.some((s) => s.trackId === f.id)).map((f) => [f.id, { id: f.id, title: f.title, artistName: f.artistName, durationSec: f.durationSec }]),
  );

  // Escutas da conta completam o "Continue ouvindo" local (sem posição); sem sessão, só o histórico do aparelho.
  let continuarServidor: Awaited<ReturnType<typeof continuarOuvindo>> = [];
  try {
    const sessao = await getSessaoAny();
    if (sessao) continuarServidor = await continuarOuvindo(sessao.userId, radio.faixas);
  } catch {
    /* sem sessão */
  }

  const climaId = climaAgora(agora);
  const doClima = faixasDoClima(radio.faixas, climaId);
  const validos = [
    ...radio.todasPlaylists.map((p) => p.id),
    ...radio.selecao.map((s) => `sel:${s.id}`),
    ...radio.albuns.map((a) => a.id),
    ...radio.faixas.map((f) => f.artistId),
    ...radio.todasPlaylists.map((p) => p.curatorId),
    RADIOON_ID,
  ];

  return (
    <RadioCliente
      radio={radio}
      continuarServidor={continuarServidor}
      validos={validos}
      clima={{ id: climaId, label: rotuloClima(climaId) ?? climaId, ...doClima }}
      artistas={artistasParaConhecer(radio.faixas)}
      stories={stories}
      faixasDosStories={faixasDosStories}
      agora={agora}
      filtroInicial={lerFiltro(sp.f)}
      abaInicial={lerAba(sp.aba)}
    />
  );
}

export default function Radio({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-2">
      <h1 className="sr-only">radioOn · Rádio</h1>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <PlayVazio />
          </div>
        }
      >
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
