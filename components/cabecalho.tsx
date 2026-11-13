import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/logo";
import { LogoCabecalho } from "@/components/logo-cabecalho";
import { MenuGaveta } from "@/components/menu-gaveta";
import { getResumoConta, type ResumoConta } from "@/lib/session";

const VISITANTE: ResumoConta = { logado: false, nome: null, foto: null };

async function Menu() {
  let conta = VISITANTE;
  try {
    conta = await getResumoConta();
  } catch {
    // Sem Supabase (testes/prévias): trata como visitante.
  }
  return <MenuGaveta conta={conta} />;
}

/** Topo de todas as telas: só a logo à esquerda e o menu ☰ à direita (a gaveta traz conta e links legais). */
export function Cabecalho() {
  const classe = "mx-auto flex min-h-14 w-full max-w-md items-center justify-between gap-4 px-4 pt-1";
  // Os hooks de rota (pathname) exigem fronteira de Suspense; o fallback é só a logo estática.
  return (
    <Suspense
      fallback={
        <header className={classe}>
          <Link href="/" aria-label="radioOn, início" className="inline-flex min-h-11 items-center">
            <Logo className="h-[62px] w-auto" />
          </Link>
        </header>
      }
    >
      <header role="banner" className={classe}>
        <LogoCabecalho />
        <Suspense fallback={<MenuGaveta conta={VISITANTE} />}>
          <Menu />
        </Suspense>
      </header>
    </Suspense>
  );
}
