import { redirect } from "next/navigation";
import { Suspense } from "react";

import { linha, Mensagem, Tela } from "@/components/ui";
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
      <h1 className="text-2xl font-semibold text-balance">Métricas</h1>
      {linhas === null ? (
        <Mensagem>Métricas indisponíveis agora.</Mensagem>
      ) : linhas.length === 0 ? (
        <p className="text-white/70">Nenhuma faixa publicada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map(({ faixa, metrica }) => (
            <li key={faixa.id} className={`${linha} flex-wrap`}>
              <span className="min-w-0 flex-1 basis-40 truncate font-medium">{faixa.title}</span>
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
    <Tela>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
