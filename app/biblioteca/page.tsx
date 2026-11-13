import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ConviteVisitante } from "@/components/convite-visitante";
import { ContinueOuvindo } from "@/components/continue-ouvindo";
import { ListaFaixas } from "@/components/lista-faixas";
import { linha, Tela } from "@/components/ui";
import { carregarRadio, continuarOuvindo, reacoesDoUsuario } from "@/lib/radio/queries";
import { getSessaoAny } from "@/lib/session";

export const metadata = { title: "Biblioteca · radioOn" };

async function Conteudo() {
  const sessao = await getSessaoAny().catch(() => null);
  const conta = sessao && !sessao.anonimo ? sessao : null;
  const [radio, reacoes] = await Promise.all([carregarRadio(), conta ? reacoesDoUsuario() : Promise.resolve(null)]);
  const curtidas = reacoes ? radio.faixas.filter((f) => reacoes.like.has(f.id)) : [];
  const continuar = sessao ? await continuarOuvindo(sessao.userId, radio.faixas) : [];
  const { data: playlists } = conta
    ? await conta.supabase.from("playlists").select("id,title,is_public,playlist_tracks(count)").eq("curator_id", conta.userId).order("created_at", { ascending: false }).limit(30)
    : { data: [] };
  const validos = [...radio.todasPlaylists.map((p) => p.id), ...radio.albuns.map((a) => a.id), ...radio.faixas.map((f) => f.artistId)];

  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Biblioteca</h1>
      {!conta && (
        <div className="rounded-2xl bg-white/10 p-4">
          <ConviteVisitante compacto />
        </div>
      )}
      <ContinueOuvindo faixas={radio.faixas} servidor={continuar} validos={validos} />
      {conta && (
        <>
          <ListaFaixas faixas={curtidas} rotulo="Curtidas" vazio="Toque no coração de uma faixa para guardá-la aqui." />
          <section aria-label="Playlists" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Playlists</h2>
              <Link href="/playlist/nova" aria-label="Criar playlist" className="foco-claro flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900">
                <Plus className="size-5" aria-hidden="true" />
              </Link>
            </div>
            {(playlists ?? []).length === 0 ? (
              <p className="text-white/70 text-pretty">Nenhuma playlist ainda. Toque em + para criar a primeira.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(playlists ?? []).map((p) => (
                  <li key={p.id}>
                    <Link href={`/playlist/${p.id}`} className={`${linha} min-h-12`}>
                      <span className="truncate font-medium">{p.title}{!p.is_public && <span className="ml-2 text-xs font-normal text-white/60">Rascunho</span>}</span>
                      <span className="shrink-0 text-sm text-white/70 tabular-nums">{(p.playlist_tracks as unknown as { count: number }[])[0]?.count ?? 0} faixas</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Link href="/meus-envios" className={`${linha} min-h-12 font-semibold`}>
            <span className="flex items-center gap-3"><FolderOpen className="size-5 text-brand" aria-hidden="true" />Meus envios</span>
            <span aria-hidden="true">›</span>
          </Link>
        </>
      )}
    </>
  );
}

export default function BibliotecaPage() {
  return (
    <Tela>
      <Suspense fallback={<h1 className="text-2xl font-semibold">Biblioteca</h1>}>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
