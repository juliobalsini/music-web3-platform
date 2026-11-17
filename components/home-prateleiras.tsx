"use client";

import { BadgeCheck } from "lucide-react";
import Link from "next/link";

import { CapaArte } from "@/components/capa";
import { curadorDaSelecao, curadoresAtivos } from "@/lib/radio/curadores";
import { type ArtistaResumo, type Selecao } from "@/lib/radio/home";
import { capaGerada } from "@/lib/radio/rules";

/** Seleção radioOn: playlists automáticas da plataforma. */
export function SelecaoRadioOn({ lista }: { lista: Selecao[] }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label="Seleção radioOn" className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h2 className="text-lg font-bold">Seleção radioOn</h2>
        <p className="text-sm text-tinta/70">Playlists que se atualizam sozinhas</p>
      </div>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((s) => (
          <li key={s.id} className="w-36 shrink-0 snap-start">
            <Link href={`/playlist/${s.id}`} className="relative flex flex-col gap-1.5 rounded-xl">
              <CapaArte title={s.title} className="aspect-square w-full !rounded-xl" />
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{s.title}</span>
              <span className="flex items-center gap-1 text-xs text-tinta/70">
                <span className="truncate">{curadorDaSelecao(s).nome}</span>
                <BadgeCheck aria-hidden="true" className="size-3.5 shrink-0 text-brand" />
                <span className="sr-only">, {s.faixas.length} {s.faixas.length === 1 ? "faixa" : "faixas"}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Curadores oficiais com playlist na Seleção (só aparece com 3 ou mais): avatar com selo e nome; leva ao perfil. */
export function CuradoresOficiais({ lista }: { lista: Selecao[] }) {
  const curadores = curadoresAtivos(lista);
  if (curadores.length < 3) return null;
  return (
    <section aria-labelledby="curadores-oficiais" data-testid="curadores-oficiais" className="flex flex-col gap-2">
      <div className="flex flex-col">
        <h2 id="curadores-oficiais" className="text-lg font-bold">Curadores oficiais</h2>
        <p className="text-sm text-tinta/70">A curadoria da radioOn por gênero</p>
      </div>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {curadores.map((c) => (
          <li key={c.id} className="w-24 shrink-0">
            <Link href={`/perfil/${c.id}`} className="flex flex-col items-center gap-1 rounded-lg py-1 text-center">
              <span className="relative">
                <span aria-hidden="true" style={{ background: capaGerada(c.nome).fundo }} className="flex size-16 items-center justify-center rounded-full text-2xl font-bold text-tinta">
                  {c.nome.split(" ").at(-1)?.charAt(0).toUpperCase()}
                </span>
                <BadgeCheck aria-hidden="true" className="absolute -right-1 -bottom-1 size-6 rounded-full bg-fundo text-brand" />
              </span>
              <span className="w-full truncate text-sm font-semibold">{c.nome}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Artistas sem story de bio ainda: avatar, nome e nº de faixas; leva ao perfil. */
export function ListaArtistas({ lista }: { lista: ArtistaResumo[] }) {
  if (lista.length === 0) return null;
  return (
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((a) => (
          <li key={a.id} className="w-20 shrink-0">
            <Link href={`/perfil/${a.id}`} className="flex flex-col items-center gap-1 rounded-lg py-1 text-center">
              <span aria-hidden="true" style={{ background: capaGerada(a.name).fundo }} className="flex size-16 items-center justify-center rounded-full text-2xl font-bold text-tinta">
                {a.name.charAt(0).toUpperCase()}
              </span>
              <span className="w-full truncate text-sm font-semibold">{a.name}</span>
              <span className="text-xs text-tinta/70">{a.faixas} {a.faixas === 1 ? "faixa" : "faixas"}</span>
            </Link>
          </li>
        ))}
      </ul>
  );
}
