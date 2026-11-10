import { Play, Upload } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { Player } from "@/components/player";
import { botao } from "@/components/ui";
import { listarPlaylistsPublicas } from "@/lib/playlists/queries";
import { listarFaixasRecentes } from "@/lib/tracks/queries";

async function Playlists() {
  const lista = await listarPlaylistsPublicas();
  if (lista.length === 0) return null;
  return (
    <nav aria-label="Playlists" className="w-full max-w-md">
      <h2 className="mb-3 text-left text-lg font-semibold">Playlists</h2>
      <ul className="flex flex-col gap-2 text-left">
        {lista.map((p) => (
          <li key={p.id}>
            <Link href={`/playlist/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-3 transition-colors hover:bg-white/15">
              <span className="truncate font-medium">{p.title}</span>
              <span className="shrink-0 text-sm text-white/70 tabular-nums">{p.trackCount} faixas</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PlayVazio() {
  // Sem faixa não há o que tocar: o círculo é só marca, sem brilho, hover nem botão.
  return (
    <div className="flex flex-col items-center gap-5">
      <div
        aria-hidden="true"
        data-testid="play-vazio"
        className="flex size-28 select-none items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15"
      >
        <Play className="ml-1 size-12 fill-white/30 text-white/30" strokeWidth={0} />
      </div>
    </div>
  );
}

function EstadoVazio() {
  return (
    <section aria-labelledby="vazio" className="flex max-w-sm flex-col items-center gap-5">
      <PlayVazio />
      <div className="flex flex-col gap-2">
        <h2 id="vazio" className="text-xl font-semibold text-balance">Nenhuma faixa ainda</h2>
        <p className="text-white/70 text-pretty">Artista? Envie a primeira música e abra a rádio.</p>
      </div>
      <Link
        href="/enviar"
        className={botao}
      >
        <Upload className="size-5" aria-hidden="true" /> Enviar primeira faixa
      </Link>
    </section>
  );
}

async function Destaque() {
  const faixas = await listarFaixasRecentes();
  if (faixas.length === 0) return <EstadoVazio />;
  const [primeira, ...resto] = faixas;
  return (
    <>
      <Player trackId={primeira.id} title={primeira.title} grande />
      {resto.length > 0 && (
        <ul aria-label="Mais faixas" className="flex w-full max-w-md flex-col gap-3 text-left">
          {resto.map((f) => (
            <li key={f.id} className="rounded-lg bg-white/10 px-4 py-3">
              <Player trackId={f.id} title={f.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10 text-center sm:py-16">
      <Logo className="h-28 sm:h-40" />
      <h1 className="sr-only">radioOn</h1>

      <Suspense fallback={<PlayVazio />}>
        <Destaque />
      </Suspense>

      <Suspense>
        <Playlists />
      </Suspense>
    </main>
  );
}
