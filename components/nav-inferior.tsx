"use client";

import { Compass, Library, ListMusic, MessageCircle, Plus, Radio, Upload, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const abas = [
  { href: "/", label: "Rádio", Icone: Radio },
  { href: "/explorar", label: "Explorar", Icone: Compass },
  { href: "/biblioteca", label: "Biblioteca", Icone: Library },
] as const;

const criar = [
  { href: "/playlist/nova", label: "Playlist", Icone: ListMusic },
  { href: "/stories/novo", label: "Story", Icone: MessageCircle },
  { href: "/enviar", label: "Enviar música", Icone: Upload },
] as const;

const aba = "flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-semibold";

/** Navegação inferior de 4 abas (Rádio, Explorar, Biblioteca, Criar); "Criar" abre um painel inferior. */
export function NavInferior() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      {aberto && (
        <div role="dialog" aria-modal="true" aria-label="Criar" className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setAberto(false)}>
          <div className="mx-auto flex w-full max-w-md flex-col gap-1 rounded-t-2xl bg-night-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-base font-bold">Criar</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {criar.map(({ href, label, Icone }) => (
              <Link key={href} href={href} onClick={() => setAberto(false)} className="flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold hover:bg-white/10">
                <Icone className="size-5 text-brand" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night-900 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
          {abas.map(({ href, label, Icone }) => {
            const ativa = href === "/" ? caminho === "/" : caminho.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativa ? "page" : undefined}
                  className={`${aba} ${ativa ? "text-brand" : "text-white/70 hover:text-white"}`}
                >
                  <Icone className="size-6" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setAberto(true)} aria-haspopup="dialog" className={`${aba} text-white/70 hover:text-white`}>
              <Plus className="size-6" aria-hidden="true" />
              Criar
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
