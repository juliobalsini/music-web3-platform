import { Suspense } from "react";

import { Busca } from "@/components/busca";
import { RadioCliente } from "@/components/radio-cliente";
import { PlayVazio } from "@/components/secoes-radio";
import { lerAba, lerFiltro } from "@/lib/menu";
import { carregarRadio, continuarOuvindo } from "@/lib/radio/queries";
import { getSessaoAny } from "@/lib/session";

async function Conteudo({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const sp = await searchParams;
  const radio = await carregarRadio();

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
      <Busca />
      <RadioCliente radio={radio} continuar={continuar} filtroInicial={lerFiltro(sp.f)} abaInicial={lerAba(sp.aba)} />
    </>
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
