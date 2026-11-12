import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BotaoAlbum } from "@/components/botao-album";
import { Capa } from "@/components/capa";
import { ListaFaixas } from "@/components/lista-faixas";
import { RegistrarVisita } from "@/components/registrar-visita";
import { Tela } from "@/components/ui";
import { RADIOON_ID } from "@/lib/radio/home";
import { carregarRadio } from "@/lib/radio/queries";
import { capaGerada, type FaixaListada } from "@/lib/radio/rules";

export const metadata: Metadata = { title: "Seleção radioOn" };

/** Playlist automática da plataforma (Seleção radioOn): recalculada a cada requisição, sem tabela própria. */
async function Conteudo({ params }: Pick<PageProps<"/selecao/[id]">, "params">) {
  const { id } = await params;
  const radio = await carregarRadio();
  const sel = radio.selecao.find((s) => s.id === id);
  if (!sel) notFound();
  const porId = new Map(radio.faixas.map((f) => [f.id, f]));
  const faixas = sel.faixaIds.map((i) => porId.get(i)).filter((f): f is FaixaListada => !!f);
  return (
    <>
      <RegistrarVisita tipo="playlist" id={`sel:${sel.id}`} titulo={sel.title} sub="radioOn" capaId={sel.capa?.id ?? null} temCapa={sel.capa?.hasCover ?? false} />
      <div className="flex flex-col items-center gap-4 text-center">
        {sel.capa ? (
          <Capa id={sel.capa.id} title={sel.title} hasCover={sel.capa.hasCover} className="size-56 !rounded-xl" />
        ) : (
          <span aria-hidden="true" style={{ background: capaGerada(sel.title).fundo }} className="block size-56 rounded-xl" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-balance">{sel.title}</h1>
          <p className="text-white/70">
            Seleção radioOn · <Link href={`/perfil/${RADIOON_ID}`} className="underline underline-offset-2">radioOn</Link> · atualizada sozinha
          </p>
        </div>
        <BotaoAlbum faixas={faixas} rotulo="seleção" />
      </div>
      <ListaFaixas rotulo={`Faixas de ${sel.title}`} faixas={faixas} numerar />
    </>
  );
}

export default function SelecaoPage({ params }: PageProps<"/selecao/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
