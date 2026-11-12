import { Suspense } from "react";

import { Entrar } from "@/components/cabecalho";
import { LogoCabecalho } from "@/components/logo-cabecalho";
import { SeloNoAr } from "@/components/selo-no-ar";

/** Cabeçalho da Home: logo e selo na mesma linha; Entrar à direita (só deslogado). */
export function CabecalhoHome({ ouvindo }: { ouvindo: number }) {
  return (
    <header role="banner" className="flex min-h-14 items-center justify-between gap-2">
      <LogoCabecalho />
      <div className="flex items-center gap-2">
        <SeloNoAr ouvindo={ouvindo} />
        <Suspense>
          <Entrar />
        </Suspense>
      </div>
    </header>
  );
}
