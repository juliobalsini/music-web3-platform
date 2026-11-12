import { Plus } from "lucide-react";
import Link from "next/link";

import { Capa } from "@/components/capa";
import { CapaArte } from "@/components/capa";
import { PLATAFORMA_NOME, type Selecao } from "@/lib/radio/home";
import type { PlaylistSemana } from "@/lib/radio/queries";
import type { AlbumResumo } from "@/lib/radio/rules";

/** Capa quadrada + título + linha de apoio, para playlists em grade. */
function CartaoPlaylist({ href, titulo, sub, capa }: { href: string; titulo: string; sub: string; capa: PlaylistSemana["capa"] }) {
  return (
    <Link href={href} className="flex flex-col gap-1.5 rounded-xl">
      {capa ? <Capa id={capa.id} title={titulo} hasCover={capa.hasCover} className="aspect-square w-full !rounded-xl" /> : <CapaArte title={titulo} className="aspect-square w-full !rounded-xl" />}
      <span className="line-clamp-2 text-sm font-semibold leading-tight">{titulo}</span>
      <span className="truncate text-xs text-white/70">{sub}</span>
    </Link>
  );
}

const faixasTxt = (n: number) => `${n} ${n === 1 ? "faixa" : "faixas"}`;

/** Filtro Playlists: Seleção radioOn no topo, depois as dos playlisters; "Criar playlist" (login se preciso). */
export function GradePlaylists({ selecao, playlists }: { selecao: Selecao[]; playlists: PlaylistSemana[] }) {
  return (
    <div className="flex flex-col gap-5">
      <Link href="/curador" data-testid="criar-playlist" className="foco-claro flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-5 font-semibold text-night-900">
        <Plus className="size-5" aria-hidden="true" /> Criar playlist
      </Link>
      {selecao.length > 0 && (
        <section aria-label="Seleção radioOn" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Seleção radioOn</h2>
          <ul className="grid grid-cols-2 gap-3">
            {selecao.map((s) => (
              <li key={s.id}>
                <CartaoPlaylist href={`/playlist/${s.id}`} titulo={s.title} sub={`${PLATAFORMA_NOME} · ${faixasTxt(s.faixas.length)}`} capa={null} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label="Playlists dos playlisters" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Dos playlisters</h2>
        {playlists.length === 0 ? (
          <p className="text-white/70">Nenhuma playlist de playlister ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {playlists.map((p) => (
              <li key={p.id}>
                <CartaoPlaylist href={`/playlist/${p.id}`} titulo={p.title} sub={`${p.curator ?? "Playlister"} · ${faixasTxt(p.trackCount)}`} capa={p.capa} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Filtro Álbuns: grade com capa, artista e ano. */
export function GradeAlbuns({ lista }: { lista: AlbumResumo[] }) {
  return (
    <section aria-label="Álbuns e EPs" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Álbuns e EPs</h2>
      <ul className="grid grid-cols-2 gap-3">
        {lista.map((a) => (
          <li key={a.id}>
            <Link href={`/album/${a.id}`} className="flex flex-col gap-1.5 rounded-xl">
              <Capa id={a.faixas[0].id} title={a.title} hasCover={a.faixas[0].hasCover} className="aspect-square w-full !rounded-xl" />
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{a.title}</span>
              <span className="truncate text-xs text-white/70">
                {a.artistName} · {new Date(a.createdAt).getUTCFullYear()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
