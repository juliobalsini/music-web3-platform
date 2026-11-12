import Link from "next/link";

import { Capa } from "@/components/capa";
import type { ArtistaConhecer } from "@/lib/radio/home";
import type { PlaylistSemana, SelecaoRadioOn } from "@/lib/radio/queries";
import { capaGerada } from "@/lib/radio/rules";

const faixasTxt = (n: number) => `${n} ${n === 1 ? "faixa" : "faixas"}`;

/** Seleção radioOn: playlists automáticas da plataforma (carrossel). */
export function SelecaoPrateleira({ lista, titulo = "Seleção radioOn" }: { lista: SelecaoRadioOn[]; titulo?: string }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label={titulo} data-testid="selecao" className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-sm text-white/70">Playlists automáticas, atualizadas sozinhas</p>
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((s) => (
          <li key={s.id} className="w-36 shrink-0 snap-start">
            <CartaoPlaylist href={`/selecao/${s.id}`} titulo={s.title} sub={`radioOn · ${faixasTxt(s.trackCount)}`} capa={s.capa} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Capa quadrada + título + linha de apoio, para playlists (usada em carrossel e em grade). */
export function CartaoPlaylist({ href, titulo, sub, capa }: { href: string; titulo: string; sub: string; capa: PlaylistSemana["capa"] }) {
  return (
    <Link href={href} className="flex flex-col gap-1.5 rounded-xl">
      {capa ? (
        <Capa id={capa.id} title={titulo} hasCover={capa.hasCover} className="aspect-square w-full !rounded-xl" />
      ) : (
        <span aria-hidden="true" style={{ background: capaGerada(titulo).fundo }} className="block aspect-square w-full rounded-xl" />
      )}
      <span className="line-clamp-2 text-sm font-semibold leading-tight">{titulo}</span>
      <span className="truncate text-xs text-white/70">{sub}</span>
    </Link>
  );
}

/** Artistas para conhecer: avatares com nº de faixas, link para o perfil. */
export function ArtistasParaConhecer({ lista }: { lista: ArtistaConhecer[] }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label="Artistas para conhecer" data-testid="artistas" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Artistas para conhecer</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((a) => (
          <li key={a.id} className="w-20 shrink-0">
            <Link href={`/perfil/${a.id}`} className="flex flex-col items-center gap-1 rounded-lg py-1 text-center">
              <span aria-hidden="true" style={{ background: capaGerada(a.nome).fundo }} className="flex size-16 items-center justify-center rounded-full text-2xl font-bold text-white">
                {a.nome.charAt(0).toUpperCase()}
              </span>
              <span className="w-full truncate text-sm font-semibold">{a.nome}</span>
              <span className="text-xs text-white/70">{faixasTxt(a.faixas)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
