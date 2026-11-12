import { LogIn } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LogoCabecalho } from "@/components/logo-cabecalho";
import { OcultarNaHome } from "@/components/ocultar-na-home";
import { getSessionRole } from "@/lib/session";

export async function Entrar() {
  let sessao: Awaited<ReturnType<typeof getSessionRole>> = null;
  try {
    sessao = await getSessionRole();
  } catch {
    // Sem Supabase (testes/prévias): trata como deslogado.
  }
  if (sessao) return null;
  return (
    <Link
      href="/login"
      className="foco-claro inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-night-900 hover:bg-brand-2"
    >
      <LogIn className="size-4" aria-hidden="true" />
      Entrar
    </Link>
  );
}

export function Cabecalho() {
  const cabecalho = (
    <header className="mx-auto flex min-h-14 w-full max-w-md items-center justify-between gap-4 px-4 py-2">
      <LogoCabecalho />
      <Suspense>
        <Entrar />
      </Suspense>
    </header>
  );
  return (
    <Suspense fallback={cabecalho}>
      <OcultarNaHome>{cabecalho}</OcultarNaHome>
    </Suspense>
  );
}
