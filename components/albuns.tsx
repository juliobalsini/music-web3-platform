import Link from "next/link";

import { Capa } from "@/components/capa";
import type { AlbumResumo } from "@/lib/radio/rules";

/** Carrossel de álbuns e EPs; a capa é a da primeira faixa (todas dividem a mesma capa). */
export function Albuns({ lista, titulo = "Álbuns e EPs" }: { lista: AlbumResumo[]; titulo?: string }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((a) => (
          <li key={a.id} className="w-36 shrink-0 snap-start">
            <Link href={`/album/${a.id}`} className="flex flex-col gap-1.5 rounded-xl">
              <Capa id={a.faixas[0].id} title={a.title} hasCover={a.faixas[0].hasCover} className="aspect-square w-full !rounded-xl" />
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{a.title}</span>
              <span className="truncate text-xs text-white/70">
                {a.kind === "ep" ? "EP" : "Álbum"} · {a.artistName}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
