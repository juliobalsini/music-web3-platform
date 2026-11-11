import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Plus, Star, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { botao, campo, Mensagem, Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

import { adicionarFaixa, alternarMarca, criarPlaylist, moverFaixa, criarPrograma, removerFaixa, removerPrograma, salvarNota } from "./actions";

export const metadata = { title: "Minhas playlists · radioOn" };

async function Conteudo({ searchParams }: Pick<PageProps<"/curador">, "searchParams">) {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/curador"));
  const ehCurador = sessao.role === "curator";
  const { erro } = await searchParams;
  const { supabase, userId } = sessao;

  type Item = { position: number; note: string | null; hidden?: boolean | null; featured?: boolean | null; tracks: { id: string; title: string } | { id: string; title: string }[] | null };
  type Lista = { id: string; title: string; playlist_tracks: Item[] };
  // Colunas hidden/featured vêm de migration nova: sem elas (ainda não aplicada) cai para a leitura antiga.
  let lido: { data: unknown; error: unknown } = await supabase
    .from("playlists")
    .select("id,title,playlist_tracks(position,note,hidden,featured,tracks(id,title))")
    .eq("curator_id", userId)
    .order("created_at", { ascending: false });
  if (lido.error) {
    lido = await supabase
      .from("playlists")
      .select("id,title,playlist_tracks(position,note,tracks(id,title))")
      .eq("curator_id", userId)
      .order("created_at", { ascending: false });
  }
  const erroLista = lido.error;
  const playlists = lido.data as unknown as Lista[] | null;
  const { data: publicadas } = await supabase
    .from("tracks")
    .select("id,title")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: programas } = await supabase
    .from("programs")
    .select("id,title,start_hour,end_hour,playlist_id")
    .eq("curator_id", userId)
    .order("start_hour");
  const horas = Array.from({ length: 25 }, (_, h) => h);

  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Minhas playlists</h1>
      {erro && <Mensagem tipo="erro">Não deu certo. Confira o título e tente de novo.</Mensagem>}
      {erroLista && <Mensagem tipo="erro">Não foi possível carregar suas playlists. Recarregue a página.</Mensagem>}
      <form action={criarPlaylist} className="flex gap-3">
        <input name="titulo" required maxLength={200} placeholder="Nova playlist" aria-label="Título" className={campo} />
        <button className={`${botao} shrink-0`} aria-label="Criar playlist"><Plus className="size-5" aria-hidden="true" /></button>
      </form>
      {(playlists ?? []).length === 0 && (
        <p className="text-white/70 text-pretty">Nenhuma playlist ainda. Dê um nome à primeira acima.</p>
      )}
      <ul className="flex flex-col gap-6">
        {(playlists ?? []).map((p) => {
          const itens = [...(p.playlist_tracks ?? [])].sort((a, b) => a.position - b.position);
          return (
            <li key={p.id} className="flex flex-col gap-3 rounded-xl bg-white/5 p-3 sm:p-4">
              <Link href={`/playlist/${p.id}`} className="rounded text-lg font-semibold hover:text-brand-2">{p.title}</Link>
              {itens.length === 0 && <p className="text-sm text-white/70">Playlist vazia. Adicione faixas abaixo.</p>}
              <ul className="flex flex-col gap-1">
                {itens.map((i, pos) => {
                  const t = Array.isArray(i.tracks) ? i.tracks[0] : i.tracks;
                  if (!t) return null;
                  const oculta = !!i.hidden;
                  const destaque = !!i.featured;
                  const acao = "flex size-11 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30";
                  const marca = (campo: "hidden" | "featured", ligado: boolean, rotulo: string, Icone: typeof Star) => (
                    <form action={alternarMarca}>
                      <input type="hidden" name="playlist" value={p.id} />
                      <input type="hidden" name="faixa" value={t.id} />
                      <input type="hidden" name="campo" value={campo} />
                      <input type="hidden" name="valor" value={ligado ? "0" : "1"} />
                      <button aria-label={`${rotulo} ${t.title}`} aria-pressed={ligado} className={`${acao} ${ligado ? "text-brand" : ""}`}>
                        <Icone className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  );
                  const mover = (dir: "up" | "down", rotulo: string, Icone: typeof ArrowUp, desligado: boolean) => (
                    <form action={moverFaixa}>
                      <input type="hidden" name="playlist" value={p.id} />
                      <input type="hidden" name="faixa" value={t.id} />
                      <input type="hidden" name="dir" value={dir} />
                      <button disabled={desligado} aria-label={`${rotulo} ${t.title}`} className={acao}>
                        <Icone className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  );
                  return (
                    <li key={t.id} className="flex flex-col gap-1 pl-1 text-white/80">
                     <div className="flex items-center justify-between gap-2">
                      <span className={`min-w-0 flex-1 truncate ${oculta ? "text-white/50 line-through" : ""}`}>{t.title}{oculta && <span className="sr-only"> (oculta)</span>}</span>
                      {mover("up", "Subir", ArrowUp, pos === 0)}
                      {mover("down", "Descer", ArrowDown, pos === itens.length - 1)}
                      {marca("featured", destaque, destaque ? "Tirar destaque de" : "Destacar", Star)}
                      {marca("hidden", oculta, oculta ? "Mostrar" : "Ocultar", oculta ? EyeOff : Eye)}
                      <form action={removerFaixa}>
                        <input type="hidden" name="playlist" value={p.id} />
                        <input type="hidden" name="faixa" value={t.id} />
                        <button aria-label={`Remover ${t.title}`} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </form>
                     </div>
                     <form action={salvarNota} className="flex gap-2">
                       <input type="hidden" name="playlist" value={p.id} />
                       <input type="hidden" name="faixa" value={t.id} />
                       <input name="nota" maxLength={280} defaultValue={i.note ?? ""} placeholder="Nota do playlister (opcional)" aria-label={`Nota sobre ${t.title}`} className={`${campo} min-h-11 text-sm`} />
                       <button aria-label={`Salvar nota de ${t.title}`} className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15">
                         <Check className="size-4" aria-hidden="true" />
                       </button>
                     </form>
                    </li>
                  );
                })}
              </ul>
              <form action={adicionarFaixa} className="flex gap-2">
                <input type="hidden" name="playlist" value={p.id} />
                <select name="faixa" aria-label="Faixa" className={campo} defaultValue="">
                  <option value="" disabled>{(publicadas ?? []).length === 0 ? "Sem faixas publicadas ainda" : "Adicionar faixa…"}</option>
                  {(publicadas ?? [])
                    .filter((t) => !itens.some((i) => (Array.isArray(i.tracks) ? i.tracks[0] : i.tracks)?.id === t.id))
                    .map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <button className={`${botao} shrink-0`} aria-label="Adicionar"><Plus className="size-5" aria-hidden="true" /></button>
              </form>
            </li>
          );
        })}
      </ul>
      {ehCurador && (
      <section aria-label="Programação" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Programação</h2>
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
      )}
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
