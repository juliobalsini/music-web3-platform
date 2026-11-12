"use client";

import Link from "next/link";

import { CapaArte } from "@/components/capa";
import { PLATAFORMA_NOME, type ArtistaResumo, type Selecao } from "@/lib/radio/home";
import { capaGerada } from "@/lib/radio/rules";

/** Seleção radioOn: playlists automáticas da plataforma. */
export function SelecaoRadioOn({ lista }: { lista: Selecao[] }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label="Seleção radioOn" className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold">Seleção radioOn</h2>
        <p className="text-sm text-white/70">Playlists que se atualizam sozinhas</p>
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((s) => (
          <li key={s.id} className="w-36 shrink-0 snap-start">
            <Link href={`/playlist/${s.id}`} className="flex flex-col gap-1.5 rounded-xl">
              <CapaArte title={s.title} className="aspect-square w-full !rounded-xl" />
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{s.title}</span>
              <span className="truncate text-xs text-white/70">{PLATAFORMA_NOME} · {s.faixas.length} {s.faixas.length === 1 ? "faixa" : "faixas"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Artistas para conhecer: avatar, nome e nº de faixas; leva ao perfil. */
export function ArtistasParaConhecer({ lista }: { lista: ArtistaResumo[] }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label="Artistas para conhecer" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Artistas para conhecer</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((a) => (
          <li key={a.id} className="w-20 shrink-0">
            <Link href={`/perfil/${a.id}`} className="flex flex-col items-center gap-1 rounded-lg py-1 text-center">
              <span aria-hidden="true" style={{ background: capaGerada(a.name).fundo }} className="flex size-16 items-center justify-center rounded-full text-2xl font-bold text-white">
                {a.name.charAt(0).toUpperCase()}
              </span>
              <span className="w-full truncate text-sm font-semibold">{a.name}</span>
              <span className="text-xs text-white/70">{a.faixas} {a.faixas === 1 ? "faixa" : "faixas"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
