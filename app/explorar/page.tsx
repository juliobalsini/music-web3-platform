import { Suspense } from "react";

import { Busca } from "@/components/busca";
import { ListaFaixas } from "@/components/lista-faixas";
import { EstadoVazio, PlaylistersEmAlta, PlaylistsDaSemana } from "@/components/secoes-radio";
import { Tela } from "@/components/ui";
import { carregarRadio } from "@/lib/radio/queries";
import { buscar, lerBusca } from "@/lib/radio/rules";

export const metadata = { title: "Explorar · radioOn" };

async function Conteudo({ q }: { q: string }) {
  const radio = await carregarRadio();
  if (radio.faixas.length === 0 && radio.playlists.length === 0) return <EstadoVazio />;
  if (q) {
    const faixas = buscar(radio.faixas, q, (f) => [f.title, f.artistName, f.album, f.performers, f.composer]);
    const playlists = buscar(radio.playlists, q, (p) => [p.title, p.curator]);
    const playlisters = buscar(radio.playlisters, q, (p) => [p.name]);
    if (faixas.length + playlists.length + playlisters.length === 0) {
      return <p role="status" className="text-white/70">Nada encontrado para “{q}”. Tente outro nome.</p>;
    }
    return (
      <>
        {faixas.length > 0 && (
          <section aria-label="Faixas encontradas" className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">Faixas</h2>
            <ListaFaixas rotulo="Faixas encontradas" faixas={faixas} />
          </section>
        )}
        {playlists.length > 0 && <PlaylistsDaSemana titulo="Playlists" lista={playlists} />}
        {playlisters.length > 0 && <PlaylistersEmAlta lista={playlisters} />}
      </>
    );
  }
  return (
    <>
      <section aria-label="Todas as faixas" className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Todas as faixas</h2>
        <ListaFaixas rotulo="Todas as faixas" faixas={radio.faixas} />
      </section>
      <PlaylistsDaSemana titulo="Playlists" lista={radio.playlists} />
      <PlaylistersEmAlta lista={radio.playlisters} />
    </>
  );
}

export default function ExplorarPage({ searchParams }: PageProps<"/explorar">) {
  return (
    <Tela>
      <h1 className="text-2xl font-semibold text-balance">Explorar</h1>
      <Suspense>
        <Resultado searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}

async function Resultado({ searchParams }: Pick<PageProps<"/explorar">, "searchParams">) {
  const q = lerBusca((await searchParams).q);
  return (
    <>
      <Busca valor={q} />
      <Conteudo q={q} />
    </>
  );
}
