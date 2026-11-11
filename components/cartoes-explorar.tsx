import Link from "next/link";

import { capaGerada } from "@/lib/radio/rules";

export type ItemCartao = { id: string; rotulo: string; href: string; detalhe?: string };

/** Cartões coloridos e navegáveis (gêneros e climas): o gradiente sai do nome, como nas capas. */
export function CartoesColoridos({ titulo, itens }: { titulo: string; itens: ItemCartao[] }) {
  if (itens.length === 0) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {itens.map((i) => (
          <li key={i.id}>
            <Link
              href={i.href}
              style={{ background: capaGerada(i.rotulo).fundo }}
              className="flex min-h-20 flex-col justify-end rounded-xl p-3 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            >
              <span className="font-bold [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">{i.rotulo}</span>
              {i.detalhe && <span className="text-xs text-white/85 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">{i.detalhe}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Artistas em carrossel de círculos (inicial sobre o gradiente do nome). */
export function Artistas({ lista }: { lista: { id: string; nome: string; faixas: number }[] }) {
  if (lista.length === 0) return null;
  return (
    <section aria-label="Artistas" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Artistas</h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((a) => (
          <li key={a.id} className="w-20 shrink-0">
            <Link href={`/perfil/${a.id}`} className="flex flex-col items-center gap-1 rounded-lg py-1 text-center">
              <span
                aria-hidden="true"
                style={{ background: capaGerada(a.nome).fundo }}
                className="flex size-16 items-center justify-center rounded-full text-2xl font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]"
              >
                {a.nome.charAt(0).toUpperCase()}
              </span>
              <span className="w-full truncate text-sm font-semibold">{a.nome}</span>
              <span className="text-xs text-white/70">{a.faixas} {a.faixas === 1 ? "faixa" : "faixas"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
