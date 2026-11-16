import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

import { ChipStatus, EstadoVazio, Esqueleto } from "@/components/ds";
import { Ajuda } from "@/components/ds/interativos";
import { AvisoApagado, BotaoDesfazer, MenuEnvio } from "@/components/envios";
import { Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { listarApagados } from "@/lib/envios/apagar";
import { DIAS_DESFAZER, isTipoEnvio, ROTULO_TIPO, type TipoEnvio } from "@/lib/envios/rules";
import { presencaEmPlaylists } from "@/lib/playlists/queries";
import { isUuid, rotuloEmPlaylists, textoPresenca } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { reconciliarEnvios } from "@/lib/tracks/reconciliar";
import { rotuloStatus } from "@/lib/tracks/envios";

export const metadata = { title: "Meus envios · radioOn" };

type Item = { id: string; titulo: string; href: string; info?: string; tom?: "neutro" | "aviso" | "erro" | "destaque" };

const linhaItem = "flex min-h-12 items-center gap-1 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] pl-4 pr-1";

function Secao({ titulo, tipo, itens, vazio, apoio }: { titulo: string; tipo: TipoEnvio; itens: Item[]; vazio: string; apoio?: string | null }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {apoio && <p data-testid="presenca-playlists" className="text-sm font-semibold text-[var(--ds-destaque)]">{apoio}</p>}
      {itens.length === 0 ? (
        <p className="text-[var(--ds-texto-2)] text-pretty">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((i) => (
            <li key={i.id} className={linhaItem}>
              <Link href={i.href} className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{i.titulo}</span>
                {i.info && <ChipStatus tom={i.tom ?? "neutro"}>{i.info}</ChipStatus>}
              </Link>
              <MenuEnvio tipo={tipo} id={i.id} titulo={i.titulo} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** `?apagado=tipo.id` (vindo da página do item): mostra o aviso com Desfazer. */
function lerApagado(v: string | string[] | undefined): { tipo: TipoEnvio; id: string } | null {
  const [tipo, id] = (typeof v === "string" ? v : "").split(".");
  return isTipoEnvio(tipo) && isUuid(id) ? { tipo, id } : null;
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath("/meus-envios"));
  const { supabase, userId } = sessao;
  const aviso = lerApagado((await searchParams).apagado);
  // Toda faixa em processamento termina: publicada (arquivo no bucket) ou falhou (com motivo).
  await reconciliarEnvios(userId).catch(() => {});
  // Leituras comuns já não veem itens apagados (policy restritiva); os apagados vêm do servidor.
  const [faixas, albuns, playlists, stories, apagados, presenca] = await Promise.all([
    supabase.from("tracks").select("id,title,status,failure_reason").eq("artist_id", userId).neq("status", "removed").order("created_at", { ascending: false }).limit(100),
    supabase.from("albums").select("id,title,kind").eq("artist_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("playlists").select("id,title").eq("curator_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("stories").select("id,body").eq("author_id", userId).order("created_at", { ascending: false }).limit(50),
    listarApagados(userId),
    presencaEmPlaylists(userId),
  ]);
  const publicadas = (faixas.data ?? []).filter((t) => t.status === "published").length;
  const nada = [faixas, albuns, playlists, stories].every((r) => (r.data ?? []).length === 0) && apagados.length === 0;
  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Meus envios</h1>
      {nada ? (
        <EstadoVazio titulo="Nada enviado ainda" texto="Suas faixas, álbuns, playlists e stories aparecem aqui." acao={<Link href="/enviar" className="font-semibold text-[var(--ds-destaque)]">Enviar música</Link>} />
      ) : (
        <>
          <Secao titulo="Faixas" tipo="faixa" vazio="Nenhuma faixa enviada." apoio={textoPresenca(presenca.total, publicadas)} itens={(faixas.data ?? []).map((t) => {
            const status = rotuloStatus(t.status, t.failure_reason);
            if (status) return { id: t.id, titulo: t.title, href: `/faixa/${t.id}`, info: status, tom: t.status === "failed" ? "erro" : "aviso" };
            return { id: t.id, titulo: t.title, href: `/faixa/${t.id}`, info: rotuloEmPlaylists(presenca.porFaixa.get(t.id) ?? 0), tom: "destaque" };
          })} />
          <Secao titulo="Álbuns e EPs" tipo="album" vazio="Nenhum álbum ou EP." itens={(albuns.data ?? []).map((a) => ({ id: a.id, titulo: a.title, href: `/album/${a.id}`, info: a.kind === "ep" ? "EP" : undefined }))} />
          <Secao titulo="Playlists" tipo="playlist" vazio="Nenhuma playlist." itens={(playlists.data ?? []).map((p) => ({ id: p.id, titulo: p.title, href: `/playlist/${p.id}` }))} />
          <Secao titulo="Stories" tipo="story" vazio="Nenhum story." itens={(stories.data ?? []).map((s) => ({ id: s.id, titulo: s.body || "Story sem texto", href: `/story/${s.id}` }))} />
          {apagados.length > 0 && (
            <section aria-label="Apagados" className="flex flex-col gap-2">
              <h2 className="text-lg font-bold">Apagados</h2>
              <Ajuda titulo="Como funciona">
                Itens apagados somem na hora para todos, inclusive das playlists de outras pessoas. Você pode desfazer por {DIAS_DESFAZER} dias.
              </Ajuda>
              <ul className="flex flex-col gap-2">
                {apagados.map((a) => (
                  <li key={`${a.tipo}.${a.id}`} className={linhaItem}>
                    <span className="flex min-h-12 min-w-0 flex-1 flex-col justify-center">
                      <span className="truncate font-medium text-[var(--ds-texto-2)]">{a.titulo}</span>
                      <span className="text-xs text-[var(--ds-texto-2)]">
                        {ROTULO_TIPO[a.tipo]} · {a.dias} {a.dias === 1 ? "dia" : "dias"} para desfazer
                      </span>
                    </span>
                    <BotaoDesfazer tipo={a.tipo} id={a.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {aviso && <AvisoApagado tipo={aviso.tipo} id={aviso.id} />}
    </>
  );
}

function Carregando() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Esqueleto className="h-8 w-48" />
      {[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-12 w-full" />)}
    </div>
  );
}

export default function MeusEnviosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Tela>
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}
