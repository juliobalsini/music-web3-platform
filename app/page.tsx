import { Suspense } from "react";

import { CabecalhoHome } from "@/components/cabecalho-home";
import { RadioCliente } from "@/components/radio-cliente";
import { PlayVazio } from "@/components/secoes-radio";
import { lerAba } from "@/lib/menu";
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

  // "Continue ouvindo" só existe para quem tem histórico (conta ou visitante com sessão).
  let continuar: Awaited<ReturnType<typeof continuarOuvindo>> = [];
  try {
    const sessao = await getSessaoAny();
    if (sessao) continuar = await continuarOuvindo(sessao.userId, radio.faixas);
  } catch {
    /* sem sessão */
  }

  return (
    <>
      <CabecalhoHome ouvindo={radio.ouvindo} />
      <RadioCliente radio={radio} continuar={continuar} stories={stories} faixasDosStories={faixasDosStories} agora={agora} abaInicial={lerAba(sp.aba)} />
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
