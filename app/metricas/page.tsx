import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSessionRole } from "@/lib/session";
import { metricasDoArtista } from "@/lib/tracks/queries";

export const metadata = { title: "Métricas · radioOn" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect("/login");
  if (sessao.role !== "artist") redirect("/");
  const linhas = await metricasDoArtista(sessao.userId);
  return (
    <>
      <h1 className="text-2xl font-semibold">Métricas</h1>
      {linhas === null ? (
        <p role="status" className="text-white/70">Métricas indisponíveis agora.</p>
      ) : linhas.length === 0 ? (
        <p className="text-white/70">Nenhuma faixa publicada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map(({ faixa, metrica }) => (
            <li key={faixa.id} className="flex items-baseline justify-between gap-3 rounded-lg bg-white/10 px-4 py-3">
              <span className="truncate font-medium">{faixa.title}</span>
              <span className="shrink-0 text-sm text-white/70 tabular-nums">
                {metrica.escutas} escutas · {metrica.ouvintes} ouvintes
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function MetricasPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <Suspense>
        <Conteudo />
      </Suspense>
    </main>
  );
}
