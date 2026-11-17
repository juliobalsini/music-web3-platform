import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PrimeirosGostos } from "@/components/primeiros-gostos";
import { Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { lerPreferenciasConta } from "@/lib/preferencias/conta";
import { destinoInicio } from "@/lib/preferencias/rules";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Seus gostos · radioOn" };

/** Primeiro acesso (#125, item 6): pulável; quem já tem gostos na conta segue direto. */
async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/onboarding/gostos"));
  const destino = destinoInicio(sessao.role);
  const prefs = await lerPreferenciasConta(sessao.supabase, sessao.userId).catch(() => ({}) as { gostos?: unknown[] });
  if (prefs.gostos && prefs.gostos.length > 0) redirect(destino);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">O que você curte ouvir?</h1>
        <p className="text-[var(--ds-texto-2)]">Escolha até 3 gêneros. A Home mostra esses primeiro.</p>
      </div>
      <PrimeirosGostos destino={destino} />
    </>
  );
}

export default function GostosInicioPage() {
  return (
    <Tela centro>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
