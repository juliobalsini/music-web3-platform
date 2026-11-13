import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

import { linha, Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

export const metadata = { title: "Meus envios · radioOn" };

type Item = { id: string; titulo: string; href: string; info?: string };

function Secao({ titulo, itens, vazio }: { titulo: string; itens: Item[]; vazio: string }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-white/70 text-pretty">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((i) => (
            <li key={i.id}>
              <Link href={i.href} className={`${linha} min-h-12`}>
                <span className="min-w-0 truncate font-medium">{i.titulo}</span>
                {i.info && <span className="shrink-0 text-sm text-white/70">{i.info}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function Conteudo() {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/meus-envios"));
  const { supabase, userId } = sessao;
  const [faixas, albuns, playlists, stories] = await Promise.all([
    supabase.from("tracks").select("id,title,status").eq("artist_id", userId).neq("status", "removed").order("created_at", { ascending: false }).limit(100),
    supabase.from("albums").select("id,title,kind").eq("artist_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("playlists").select("id,title").eq("curator_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("stories").select("id,body").eq("author_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Meus envios</h1>
      <Secao titulo="Faixas" vazio="Nenhuma faixa enviada." itens={(faixas.data ?? []).map((t) => ({ id: t.id, titulo: t.title, href: `/faixa/${t.id}`, info: t.status === "published" ? undefined : "Em processamento" }))} />
      <Secao titulo="Álbuns e EPs" vazio="Nenhum álbum ou EP." itens={(albuns.data ?? []).map((a) => ({ id: a.id, titulo: a.title, href: `/album/${a.id}`, info: a.kind === "ep" ? "EP" : "Álbum" }))} />
      <Secao titulo="Playlists" vazio="Nenhuma playlist." itens={(playlists.data ?? []).map((p) => ({ id: p.id, titulo: p.title, href: `/playlist/${p.id}` }))} />
      <Secao titulo="Stories" vazio="Nenhum story." itens={(stories.data ?? []).map((s) => ({ id: s.id, titulo: s.body || "Story sem texto", href: `/story/${s.id}` }))} />
    </>
  );
}

export default function MeusEnviosPage() {
  return (
    <Tela>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
