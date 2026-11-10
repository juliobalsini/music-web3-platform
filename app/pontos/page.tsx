import { redirect } from "next/navigation";
import { Suspense } from "react";

import { linha, Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Meus pontos · radioOn" };

const motivos: Record<string, string> = { listen: "Escuta" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/pontos"));
  // RLS: cada usuário só enxerga o próprio extrato.
  const { data } = await sessao.supabase
    .from("points_ledger")
    .select("id,amount,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const linhas = data ?? [];
  const total = linhas.reduce((s, l) => s + l.amount, 0);
  return (
    <>
      <div className="flex flex-col">
        <h1 className="text-lg text-white/70">Pontos</h1>
        <p className="text-6xl font-bold text-brand tabular-nums" data-testid="saldo">{total}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {linhas.map((l) => (
          <li key={l.id} className={linha}>
            <span className="flex flex-col">
              <span>{motivos[l.reason] ?? l.reason}</span>
              <time dateTime={l.created_at} className="text-sm text-white/70">
                {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </time>
            </span>
            <span className="font-semibold text-brand tabular-nums">+{l.amount}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PontosPage() {
  return (
    <Tela>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
