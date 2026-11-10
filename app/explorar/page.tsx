import { Suspense } from "react";

import { ListaFaixas } from "@/components/lista-faixas";
import { EstadoVazio, PlaylistersEmAlta, PlaylistsDaSemana } from "@/components/secoes-radio";
import { Tela } from "@/components/ui";
import { carregarRadio } from "@/lib/radio/queries";

export const metadata = { title: "Explorar · radioOn" };

async function Conteudo() {
  const radio = await carregarRadio();
  if (radio.faixas.length === 0) return <EstadoVazio />;
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

export default function ExplorarPage() {
  return (
    <Tela>
      <h1 className="text-2xl font-semibold text-balance">Explorar</h1>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
