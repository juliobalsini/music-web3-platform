import { Play, Upload } from "lucide-react";
import Link from "next/link";

import { botao } from "@/components/ui";
import type { PlaylisterResumo, PlaylistSemana } from "@/lib/radio/queries";

export function PlayVazio() {
  // Sem faixa não há o que tocar: o círculo é só marca, sem brilho nem botão.
  return (
    <div
      aria-hidden="true"
      data-testid="play-vazio"
      className="flex size-24 select-none items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15"
    >
      <Play className="ml-1 size-10 fill-white/30 text-white/30" strokeWidth={0} />
    </div>
  );
}

export function EstadoVazio() {
  return (
    <section aria-labelledby="vazio" className="flex flex-col items-center gap-5 py-10 text-center">
      <PlayVazio />
      <div className="flex flex-col gap-2">
        <h2 id="vazio" className="text-xl font-semibold text-balance">Nenhuma faixa ainda</h2>
        <p className="text-white/70 text-pretty">Artista? Envie a primeira música e abra a rádio.</p>
      </div>
      <Link href="/enviar" className={botao}>
        <Upload className="size-5" aria-hidden="true" /> Enviar primeira faixa
      </Link>
    </section>
  );
}

export function PlaylistersEmAlta({ lista }: { lista: PlaylisterResumo[] }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label="Playlisters em alta" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Playlisters em alta</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((p) => (
          <li key={p.id} className="w-20 shrink-0">
            <Link href={`/perfil/${p.id}`} className="flex flex-col items-center gap-1 rounded-lg py-1 text-center">
              <span
                aria-hidden="true"
                className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-2xl font-bold text-night-900"
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="w-full truncate text-sm font-semibold">{p.name}</span>
              <span className="text-xs text-white/70">{p.playlists} {p.playlists === 1 ? "playlist" : "playlists"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlaylistsDaSemana({ lista, titulo = "Playlists da semana" }: { lista: PlaylistSemana[]; titulo?: string }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <ul className="flex flex-col gap-2">
        {lista.map((p) => (
          <li key={p.id}>
            <Link href={`/playlist/${p.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/15">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.title}</span>
                {p.curator && <span className="block truncate text-sm text-white/70">por {p.curator}</span>}
              </span>
              <span className="shrink-0 text-sm text-white/70 tabular-nums">{p.trackCount} faixas</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
