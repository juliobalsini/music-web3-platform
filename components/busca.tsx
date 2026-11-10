import { Search } from "lucide-react";

import { campo } from "@/components/ui";

/** Busca por GET: funciona sem JavaScript e mantém o termo na URL (`/explorar?q=`). */
export function Busca({ valor = "" }: { valor?: string }) {
  return (
    <form action="/explorar" role="search" className="relative">
      <label htmlFor="busca" className="sr-only">Buscar faixas, artistas, playlists e curadores</label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/60" />
      <input id="busca" name="q" type="search" defaultValue={valor} maxLength={60} placeholder="Buscar faixa, artista ou playlist" className={`${campo} pl-12`} />
    </form>
  );
}
