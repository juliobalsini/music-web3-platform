import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Meus pontos · radioOn" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect("/login");
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
      <p className="text-6xl font-bold text-brand" data-testid="saldo">{total}</p>
      <h1 className="text-lg text-white/70">pontos</h1>
      <ul className="flex flex-col gap-2">
        {linhas.map((l) => (
          <li key={l.id} className="flex justify-between rounded-lg bg-white/10 px-4 py-2">
            <span className="text-white/70">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
            <span className="font-semibold">+{l.amount}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PontosPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <Suspense>
        <Conteudo />
      </Suspense>
    </main>
  );
}
