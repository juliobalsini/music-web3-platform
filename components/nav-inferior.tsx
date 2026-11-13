"use client";

import { Compass, Library, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const abas = [
  { href: "/", label: "Rádio", Icone: Radio },
  { href: "/explorar", label: "Explorar", Icone: Compass },
  { href: "/biblioteca", label: "Biblioteca", Icone: Library },
] as const;

/** Navegação inferior de 3 abas, fixa; respeita a área segura do celular. */
export function NavInferior() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night-900 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {abas.map(({ href, label, Icone }) => {
          const ativa = href === "/" ? caminho === "/" : caminho.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold ${ativa ? "text-brand" : "text-white/70 hover:text-white"}`}
              >
                <Icone className="size-6" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
