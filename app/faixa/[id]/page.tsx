import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BotaoFaixa } from "@/components/botao-faixa";
import { Capa } from "@/components/capa";
import { Tela } from "@/components/ui";
import { isUuid } from "@/lib/playlists/rules";
import { carregarRadio } from "@/lib/radio/queries";

// Página de compartilhamento: capa, título, artista e play.
async function Conteudo({ params }: Pick<PageProps<"/faixa/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const radio = await carregarRadio();
  const faixa = radio.faixas.find((f) => f.id === id);
  if (!faixa) notFound();
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Capa id={faixa.id} title={faixa.title} hasCover={faixa.hasCover} className="size-60" />
      <div>
        <h1 className="text-2xl font-bold text-balance">{faixa.title}</h1>
        <p className="text-white/70">{faixa.artistName}</p>
      </div>
      <BotaoFaixa faixa={faixa} />
      <p className="text-sm text-white/70">Ouça 30s e ganhe pontos.</p>
    </div>
  );
}

export default function FaixaPage({ params }: PageProps<"/faixa/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
