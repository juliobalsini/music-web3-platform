import { Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { botao, linha, Mensagem, Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";
import { metricasDoArtista } from "@/lib/tracks/queries";

export const metadata = { title: "Métricas · radioOn" };

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/metricas"));
  if (sessao.role !== "artist") redirect("/");
  const linhas = await metricasDoArtista(sessao.userId);
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Métricas</h1>
      {linhas === null ? (
        <Mensagem>Métricas indisponíveis agora. Tente de novo em instantes.</Mensagem>
      ) : linhas.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-white/70 text-pretty">Nenhuma faixa publicada ainda. Suas escutas aparecem aqui.</p>
          <Link href="/enviar" className={botao}>
            <Upload className="size-5" aria-hidden="true" /> Enviar faixa
          </Link>
        </div>
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
