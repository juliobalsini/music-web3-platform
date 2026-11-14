import { Plus, X } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { botao, campo, Mensagem, Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

import { criarPrograma, removerPrograma } from "./actions";

export const metadata = { title: "Programação · radioOn" };

async function Conteudo({ searchParams }: Pick<PageProps<"/curador">, "searchParams">) {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/curador"));
  const ehCurador = sessao.role === "curator";
  const { erro } = await searchParams;
  const { supabase, userId } = sessao;

  if (!ehCurador) redirect("/biblioteca");
  const { data: playlists } = await supabase
    .from("playlists")
    .select("id,title")
    .eq("curator_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const { data: programas } = await supabase
    .from("programs")
    .select("id,title,start_hour,end_hour,playlist_id")
    .eq("curator_id", userId)
    .order("start_hour");
  const horas = Array.from({ length: 25 }, (_, h) => h);

  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Programação</h1>
      {erro && <Mensagem tipo="erro">Não deu certo. Tente de novo.</Mensagem>}
      <section aria-label="Programação" className="flex flex-col gap-3">
        
        <p className="text-sm text-white/70 text-pretty">Um bloco por horário (Brasília). O cartão &quot;No ar&quot; da Rádio toca a playlist do bloco atual.</p>
        {(programas ?? []).length > 0 && (
          <ul className="flex flex-col gap-2">
            {(programas ?? []).map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/10 pl-4">
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{g.title}</span>{" "}
                  <span className="text-sm text-white/70 tabular-nums">{String(g.start_hour).padStart(2, "0")}h–{String(g.end_hour % 24).padStart(2, "0")}h</span>
                </span>
                <form action={removerPrograma}>
                  <input type="hidden" name="programa" value={g.id} />
                  <button aria-label={`Remover bloco ${g.title}`} className="flex size-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {(playlists ?? []).length === 0 ? (
          <p className="text-sm text-white/70">Crie uma playlist para montar um bloco.</p>
        ) : (
          <form action={criarPrograma} className="flex flex-col gap-3">
            <input name="titulo" required maxLength={80} placeholder="Nome do bloco" aria-label="Nome do bloco" className={campo} />
            <select name="playlist" aria-label="Playlist do bloco" className={campo} defaultValue={playlists?.[0]?.id}>
              {(playlists ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select name="inicio" aria-label="Início" className={campo} defaultValue="18">
                {horas.slice(0, 24).map((h) => <option key={h} value={h}>Das {String(h).padStart(2, "0")}h</option>)}
              </select>
              <select name="fim" aria-label="Fim" className={campo} defaultValue="22">
                {horas.slice(1).map((h) => <option key={h} value={h}>Até {String(h % 24).padStart(2, "0")}h</option>)}
              </select>
            </div>
            <button className={botao}><Plus className="size-5" aria-hidden="true" /> Adicionar bloco</button>
          </form>
        )}
      </section>
    </>
  );
}

export default function CuradorPage({ searchParams }: PageProps<"/curador">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}
