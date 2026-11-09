import { Play } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { listarPlaylistsPublicas } from "@/lib/playlists/queries";

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

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <Logo className="text-5xl sm:text-7xl" />

      <div
        aria-hidden="true"
        data-testid="play"
        className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 shadow-[0_0_60px_-10px_#ff6b35]"
      >
        <Play className="ml-1 size-12 fill-white text-white" strokeWidth={0} />
      </div>

      <p className="text-lg text-white/70">
        <span className="sr-only">radioOn — </span>em construção
      </p>

      <Suspense>
        <Playlists />
      </Suspense>
    </main>
  );
}
