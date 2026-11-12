import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListaFaixas } from "@/components/lista-faixas";
import { PlaylistsDaSemana } from "@/components/secoes-radio";
import { RegistrarVisita } from "@/components/registrar-visita";
import { Tela } from "@/components/ui";
import { isUuid } from "@/lib/playlists/rules";
import Link from "next/link";

import { PLATAFORMA_ID, selecaoRadioOn } from "@/lib/radio/home";
import { carregarRadio } from "@/lib/radio/queries";
import { carregarStories } from "@/lib/stories/queries";
import { ativo } from "@/lib/stories/rules";

export const metadata = { title: "Perfil · radioOn" };

/** Perfil público de artista e/ou curador: só nome, faixas publicadas e playlists públicas. */
async function Conteudo({ params }: Pick<PageProps<"/perfil/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [radio, todosStories] = await Promise.all([carregarRadio(), carregarStories().catch(() => [])]);
  const stories = todosStories.filter((s) => s.authorId === id);
  const agora = new Date().getTime();
  const faixas = radio.faixas.filter((f) => f.artistId === id);
  const playlists = radio.todasPlaylists.filter((p) => p.curatorId === id);
  if (faixas.length === 0 && playlists.length === 0 && stories.length === 0) notFound();
  const nome = faixas[0]?.artistName ?? playlists[0]?.curator ?? stories[0]?.authorName ?? "Perfil";
  const plays = faixas.reduce((n, f) => n + f.plays, 0);
  return (
    <>
      <RegistrarVisita tipo="perfil" id={id} titulo={nome} sub={id === PLATAFORMA_ID ? "Perfil oficial" : "Perfil"} />
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-2xl font-bold text-night-900">
          {nome.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{nome}</h1>
          {id === PLATAFORMA_ID && <p className="text-sm font-semibold text-brand">Perfil oficial</p>}
          <p className="text-sm text-white/70">
            {[faixas.length > 0 && `${faixas.length} ${faixas.length === 1 ? "faixa" : "faixas"}`, faixas.length > 0 && `${plays} escutas`, playlists.length > 0 && `${playlists.length} ${playlists.length === 1 ? "playlist" : "playlists"}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {faixas.length > 0 && (
        <section aria-label="Faixas do artista" className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Faixas</h2>
          <ListaFaixas rotulo="Faixas do artista" faixas={faixas} />
        </section>
      )}
      <PlaylistsDaSemana titulo="Playlists" lista={playlists} />
      {id === PLATAFORMA_ID && (
        <section aria-label="Seleção radioOn" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Seleção radioOn</h2>
          <ul className="flex flex-col gap-2">
            {selecaoRadioOn(radio.faixas, agora).map((s) => (
              <li key={s.id}>
                <Link href={`/playlist/${s.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/15">
                  <span className="truncate font-semibold">{s.title}</span>
                  <span className="shrink-0 text-sm text-white/70 tabular-nums">{s.faixas.length} faixas</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {stories.length > 0 && (
        <section aria-label="Stories do perfil" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Stories</h2>
          <ul className="flex flex-col gap-2">
            {stories.map((st) => (
              <li key={st.id}>
                <Link href={`/story/${st.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-3 hover:bg-white/15">
                  <span className="min-w-0 truncate font-medium">{st.body || "Story sem texto"}</span>
                  <span className="shrink-0 text-sm text-white/70">{ativo(st.createdAt, agora) ? "No ar" : "Arquivado"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function PerfilPage({ params }: PageProps<"/perfil/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
