import { LogIn } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { SeloNoAr } from "@/components/selo-no-ar";
import { LogoCabecalho } from "@/components/logo-cabecalho";
import { getSessionRole } from "@/lib/session";

async function Entrar() {
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
  return (
    <header className="mx-auto flex min-h-14 w-full max-w-md items-center justify-between gap-4 px-4 py-2">
      <LogoCabecalho />
      <div className="flex items-center gap-2">
        <Suspense>
          <SeloNoAr />
        </Suspense>
        <Suspense>
          <Entrar />
        </Suspense>
      </div>
    </header>
  );
}
