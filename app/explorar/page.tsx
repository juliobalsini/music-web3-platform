import Link from "next/link";
import { Suspense } from "react";

import { Busca } from "@/components/busca";
import { FaixaStories } from "@/components/faixa-stories";
import { Artistas, CartoesColoridos } from "@/components/cartoes-explorar";
import { CarrosselFaixas } from "@/components/carrossel-faixas";
import { ListaFaixas } from "@/components/lista-faixas";
import { EstadoVazio, PlaylistersEmAlta, PlaylistsDaSemana } from "@/components/secoes-radio";
import { Tela } from "@/components/ui";
import { carregarRadio, reacoesDoUsuario } from "@/lib/radio/queries";
import { lerClima, lerGenero, rotuloClima, rotuloGenero } from "@/lib/radio/generos";
import { carregarStories } from "@/lib/stories/queries";
import { storiesAtivos } from "@/lib/stories/rules";
import { buscar, contarCampo, lerBusca, recomendar } from "@/lib/radio/rules";

export const metadata = { title: "Explorar · radioOn" };

async function Conteudo({ q, genero, clima }: { q: string; genero: string | null; clima: string | null }) {
  const radio = await carregarRadio();
  if (radio.faixas.length === 0 && radio.playlists.length === 0) return <EstadoVazio />;
  if (genero || clima) {
    const rotulo = genero ? rotuloGenero(genero) : rotuloClima(clima);
    const faixas = radio.faixas.filter((f) => (genero ? f.genre === genero : f.mood === clima));
    return (
      <>
        <Link href="/explorar" className="flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-2">Voltar ao Explorar</Link>
        <h2 className="text-xl font-bold">{genero ? "Gênero" : "Clima"}: {rotulo}</h2>
        <ListaFaixas rotulo={`Faixas de ${rotulo}`} faixas={faixas} vazio="Nenhuma faixa aqui ainda." />
      </>
    );
  }
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
  const agora = new Date().getTime();
  const stories = storiesAtivos(await carregarStories().catch(() => []), agora);
  const faixasDosStories = Object.fromEntries(
    radio.faixas.filter((f) => stories.some((s) => s.trackId === f.id)).map((f) => [f.id, { id: f.id, title: f.title, artistName: f.artistName, durationSec: f.durationSec, hasCover: f.hasCover }]),
  );
  const curtidas = (await reacoesDoUsuario()).like;
  const paraVoce = recomendar(radio.faixas, curtidas);
  const artistas = contarCampo(radio.faixas, (f) => f.artistId).map(({ id, total }) => ({ id, nome: radio.faixas.find((f) => f.artistId === id)?.artistName ?? "Artista", faixas: total }));
  const generos = contarCampo(radio.faixas, (f) => f.genre).flatMap(({ id, total }) => (rotuloGenero(id) ? [{ id, rotulo: rotuloGenero(id)!, href: `/explorar?genero=${id}`, detalhe: `${total} ${total === 1 ? "faixa" : "faixas"}` }] : []));
  const climas = contarCampo(radio.faixas, (f) => f.mood).flatMap(({ id, total }) => (rotuloClima(id) ? [{ id, rotulo: rotuloClima(id)!, href: `/explorar?clima=${id}`, detalhe: `${total} ${total === 1 ? "faixa" : "faixas"}` }] : []));
  return (
    <>
      <FaixaStories stories={stories} faixas={faixasDosStories} agora={agora} modo="linha" />
      <CarrosselFaixas titulo="Para você" dica={curtidas.size > 0 ? "Com base nas faixas e gêneros que você curtiu" : "As mais curtidas e ouvidas, para começar"} faixas={paraVoce} />
      <CarrosselFaixas titulo="Descobertas" dica={radio.descobertasCuradas ? "Pouco ouvidas, escolhidas por playlisters" : "As faixas menos ouvidas"} faixas={radio.descobertas} />
      <CarrosselFaixas
        titulo="Em alta"
        dica={radio.emAlta.length > 0 ? "As mais ouvidas da semana" : "Ainda sem ranking: mais recentes"}
        faixas={radio.emAlta.length > 0 ? radio.emAlta.map((r) => r.faixa) : radio.novidades}
      />
      <CarrosselFaixas titulo="Novidades" dica="Acabaram de chegar" faixas={radio.novidades} />
      <Artistas lista={artistas} />
      <PlaylistersEmAlta lista={radio.playlisters} />
      <PlaylistsDaSemana titulo="Playlists" lista={radio.playlists} />
      <CartoesColoridos titulo="Gêneros" itens={generos} />
      <CartoesColoridos titulo="Climas" itens={climas} />
      <section aria-label="Todas as faixas" className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Todas as faixas</h2>
        <ListaFaixas rotulo="Todas as faixas" faixas={radio.faixas} />
      </section>
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
  const sp = await searchParams;
  const q = lerBusca(sp.q);
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const genero = lerGenero(um(sp.genero)) ?? null;
  const clima = lerClima(um(sp.clima)) ?? null;
  return (
    <>
      <Busca valor={q} />
      <Conteudo q={q} genero={genero} clima={clima} />
    </>
  );
}
