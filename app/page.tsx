import { Play } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { Player } from "@/components/player";
import { listarPlaylistsPublicas } from "@/lib/playlists/queries";
import { listarFaixasRecentes } from "@/lib/tracks/queries";

async function Playlists() {
  const lista = await listarPlaylistsPublicas();
  if (lista.length === 0) return null;
  return (
    <nav aria-label="Playlists" className="w-full max-w-md">
      <ul className="flex flex-col gap-2 text-left">
        {lista.map((p) => (
          <li key={p.id}>
            <Link href={`/playlist/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-3 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-brand">
              <span className="truncate font-medium">{p.title}</span>
              <span className="shrink-0 text-sm text-white/60">{p.trackCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PlayVazio({ aviso }: { aviso?: string }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div
        aria-hidden="true"
        data-testid="play"
        className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 shadow-[0_8px_24px_-8px_#ff6b35] opacity-80"
      >
        <Play className="ml-1 size-12 fill-white text-white" strokeWidth={0} />
      </div>
      {aviso && <p className="text-white/70">{aviso}</p>}
    </div>
  );
}

async function Destaque() {
  const faixas = await listarFaixasRecentes();
  if (faixas.length === 0) return <PlayVazio aviso="Nenhuma faixa ainda" />;
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
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <Logo className="text-5xl sm:text-7xl" />
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
