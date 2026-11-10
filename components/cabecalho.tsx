import { BarChart3, ListMusic, LogIn, Sparkles, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LogoCabecalho } from "@/components/logo-cabecalho";
import { itensDoCabecalho } from "@/lib/menu";
import { getSessionRole } from "@/lib/session";

const icones = {
  entrar: LogIn,
  enviar: Upload,
  metricas: BarChart3,
  playlists: ListMusic,
  perfil: UserRound,
  pontos: Sparkles,
} as const;

const base =
  "foco-claro inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold";

async function Menu() {
  let sessao: Awaited<ReturnType<typeof getSessionRole>> = null;
  try {
    sessao = await getSessionRole();
  } catch {
    // Sem Supabase (testes/prévias): trata como deslogado.
  }
  return (
    <ul className="flex flex-wrap items-center justify-end gap-1">
      {itensDoCabecalho(sessao).map(({ href, label, icone, destaque }) => {
        const Icon = icones[icone];
        return (
        <li key={href}>
          <Link
            href={href}
            className={`${base} ${destaque ? "bg-brand text-night-900 hover:bg-brand-2" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        </li>
        );
      })}
    </ul>
  );
}

export function Cabecalho() {
  return (
    <header className="flex min-h-14 items-center justify-between gap-4 px-4 py-2 sm:px-6">
      <Suspense fallback={<span />}>
        <LogoCabecalho />
      </Suspense>
      <nav aria-label="Principal">
        <Suspense>
          <Menu />
        </Suspense>
      </nav>
    </header>
  );
}
