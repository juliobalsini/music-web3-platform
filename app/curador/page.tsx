import { Plus, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getSessionRole } from "@/lib/session";

import { adicionarFaixa, criarPlaylist, removerFaixa } from "./actions";

export const metadata = { title: "Minhas playlists · radioOn" };

const campo =
  "w-full rounded-lg bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-brand";
const botao =
  "flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-4 py-3 font-semibold text-white";

async function Conteudo({ searchParams }: Pick<PageProps<"/curador">, "searchParams">) {
  const sessao = await getSessionRole();
  if (!sessao) redirect("/login");
  if (sessao.role !== "curator") redirect("/onboarding");
  const { erro } = await searchParams;
  const { supabase, userId } = sessao;

  const { data: playlists } = await supabase
    .from("playlists")
    .select("id,title,playlist_tracks(position,tracks(id,title))")
    .eq("curator_id", userId)
    .order("created_at", { ascending: false });
  const { data: publicadas } = await supabase
    .from("tracks")
    .select("id,title")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="text-2xl font-semibold">Minhas playlists</h1>
      {erro && <p role="alert" className="text-sm text-brand-2">Não deu certo. Tente de novo.</p>}
      <form action={criarPlaylist} className="flex gap-3">
        <input name="titulo" required maxLength={200} placeholder="Nova playlist" aria-label="Título" className={campo} />
        <button className={botao} aria-label="Criar playlist"><Plus className="size-5" aria-hidden="true" /></button>
      </form>
      <ul className="flex flex-col gap-6">
        {(playlists ?? []).map((p) => {
          const itens = [...(p.playlist_tracks ?? [])].sort((a, b) => a.position - b.position);
          return (
            <li key={p.id} className="flex flex-col gap-3 rounded-xl bg-white/5 p-4">
              <Link href={`/playlist/${p.id}`} className="text-lg font-semibold hover:text-brand-2">{p.title}</Link>
              <ul className="flex flex-col gap-1">
                {itens.map((i) => {
                  const t = Array.isArray(i.tracks) ? i.tracks[0] : i.tracks;
                  if (!t) return null;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-2 text-white/80">
                      <span className="truncate">{t.title}</span>
                      <form action={removerFaixa}>
                        <input type="hidden" name="playlist" value={p.id} />
                        <input type="hidden" name="faixa" value={t.id} />
                        <button aria-label={`Remover ${t.title}`} className="p-1 text-white/60 hover:text-white">
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
              <form action={adicionarFaixa} className="flex gap-2">
                <input type="hidden" name="playlist" value={p.id} />
                <select name="faixa" aria-label="Faixa" className={campo} defaultValue="">
                  <option value="" disabled>Adicionar faixa…</option>
                  {(publicadas ?? [])
                    .filter((t) => !itens.some((i) => (Array.isArray(i.tracks) ? i.tracks[0] : i.tracks)?.id === t.id))
                    .map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <button className={botao} aria-label="Adicionar"><Plus className="size-5" aria-hidden="true" /></button>
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function CuradorPage({ searchParams }: PageProps<"/curador">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <Suspense>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
