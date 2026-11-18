import { Copy, LoaderCircle, RotateCw } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";

import { Capa, CapaArte } from "@/components/capa";
import { CartaoCapa, ChipStatus, EstadoVazio, Esqueleto } from "@/components/ds";
import { Ajuda } from "@/components/ds/interativos";
import { AvisoApagado, BotaoDesfazer, MenuEnvio } from "@/components/envios";
import { AbasEnvios, AtualizarEnquantoPrepara } from "@/components/meus-envios";
import { Tela } from "@/components/ui";
import { loginPath } from "@/lib/auth/roles";
import { listarApagados } from "@/lib/envios/apagar";
import { numerosDosEnvios } from "@/lib/envios/numeros";
import {
  ABAS_ENVIOS,
  acharDuplicatas,
  DIAS_DESFAZER,
  isAbaEnvios,
  isTipoEnvio,
  ROTULO_TIPO,
  statusFaixa,
  statusPlaylist,
  textoNumeros,
  type AbaEnvios,
  type StatusEnvio,
  type TipoEnvio,
} from "@/lib/envios/rules";
import { urlCapaPlaylist } from "@/lib/playlists/capa";
import { presencaEmPlaylists } from "@/lib/playlists/queries";
import { isUuid, rotuloEmPlaylists, textoPresenca } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { reconciliarEnvios } from "@/lib/tracks/reconciliar";

export const metadata = { title: "Meus envios · radioOn" };

type Item = {
  id: string;
  titulo: string;
  href: string;
  capa: ReactNode;
  status?: StatusEnvio;
  numeros?: string;
  duplicata?: boolean;
  compartilhavel: boolean;
};

const linhaItem = "flex min-h-12 items-center gap-1 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] pl-4 pr-1";
const capa = "size-14";

/** Item: capa, título, chip de status e números; o cartão inteiro abre o item e o ⋯ fica por cima. */
function LinhaEnvio({ tipo, item }: { tipo: TipoEnvio; item: Item }) {
  const s = item.status;
  return (
    <li className="relative" data-testid="item-envio">
      <CartaoCapa
        horizontal
        capa={item.capa}
        titulo={item.titulo}
        apoio={
          <span className="flex flex-col gap-1.5 whitespace-normal pt-1">
            {(s || item.duplicata) && (
              <span className="flex flex-wrap gap-1.5">
                {s && (
                  <ChipStatus tom={s.tom} icone={s.preparando ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : undefined}>
                    {s.rotulo}
                  </ChipStatus>
                )}
                {item.duplicata && <ChipStatus tom="aviso" icone={<Copy className="size-3.5" aria-hidden="true" />}>Duplicada?</ChipStatus>}
              </span>
            )}
            {s?.motivo && <span className="block text-pretty text-[var(--ds-erro)]">{s.motivo}</span>}
            {item.numeros && <span className="block tabular-nums">{item.numeros}</span>}
          </span>
        }
        acao={
          <span className="relative z-10 flex shrink-0 items-center gap-1">
            {s?.tentarDeNovo && (
              <Link href="/enviar" className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--ds-surface-2)] px-3 text-sm font-semibold text-[var(--ds-destaque)] transition-colors hover:bg-[var(--ds-surface)]">
                <RotateCw className="size-4" aria-hidden="true" /> Tentar de novo
              </Link>
            )}
            <MenuEnvio tipo={tipo} id={item.id} titulo={item.titulo} compartilhavel={item.compartilhavel} />
          </span>
        }
      />
      <Link href={item.href} aria-label={item.titulo} className="absolute inset-0 rounded-[var(--ds-raio)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-destaque)] transition-colors hover:bg-[var(--ds-surface)]" />
    </li>
  );
}

function Lista({ tipo, itens, vazio }: { tipo: TipoEnvio; itens: Item[]; vazio: ReactNode }) {
  if (itens.length === 0) return <>{vazio}</>;
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((i) => <LinhaEnvio key={i.id} tipo={tipo} item={i} />)}
    </ul>
  );
}

function Vazio({ titulo, href, acao }: { titulo: string; href: string; acao: string }) {
  return <EstadoVazio titulo={titulo} acao={<Link href={href} className="inline-flex min-h-11 items-center rounded-full bg-[var(--ds-destaque)] px-5 font-semibold text-[var(--ds-sobre-destaque)] transition-opacity hover:opacity-90">{acao}</Link>} />;
}

/** Aviso de duplicatas: sugere manter a mais ouvida e apagar as outras pelo ⋯. */
function AvisoDuplicatas({ grupos, reproducoes }: { grupos: { id: string; title: string }[][]; reproducoes: Map<string, number> }) {
  if (grupos.length === 0) return null;
  return (
    <div data-testid="aviso-duplicatas" className="flex gap-3 rounded-[var(--ds-raio)] border border-[var(--ds-borda)] p-4">
      <Copy className="mt-0.5 size-5 shrink-0 text-[var(--ds-aviso)]" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">{grupos.length === 1 ? "Possível duplicata" : `${grupos.length} possíveis duplicatas`}</p>
        <ul className="flex flex-col gap-1 text-sm text-[var(--ds-texto-2)]">
          {grupos.map((g) => {
            const manter = [...g].sort((a, b) => (reproducoes.get(b.id) ?? 0) - (reproducoes.get(a.id) ?? 0))[0];
            return (
              <li key={g[0].id} className="text-pretty">
                <strong className="font-semibold text-[var(--ds-texto)]">{manter.title}</strong> aparece {g.length} vezes com a mesma duração. Mantenha a mais ouvida e apague as outras pelo ⋯.
              </li>
            );
          })}
        </ul>
      </div>
    </div>
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
  const [faixasR, albunsR, playlistsR, storiesR, apagados, presenca] = await Promise.all([
    supabase.from("tracks").select("id,title,status,failure_reason,duration_sec,cover_key,album_id").eq("artist_id", userId).neq("status", "removed").order("created_at", { ascending: false }).limit(100),
    supabase.from("albums").select("id,title,kind").eq("artist_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("playlists").select("id,title,is_public,cover_path,playlist_tracks(count)").eq("curator_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("stories").select("id,body,image_key").eq("author_id", userId).order("created_at", { ascending: false }).limit(50),
    listarApagados(userId),
    presencaEmPlaylists(userId),
  ]);
  const faixas = (faixasR.data ?? []) as { id: string; title: string; status: string; failure_reason: string | null; duration_sec: number | null; cover_key: string | null; album_id: string | null }[];
  const albuns = (albunsR.data ?? []) as { id: string; title: string; kind: string }[];
  const playlists = (playlistsR.data ?? []) as unknown as { id: string; title: string; is_public: boolean; cover_path: string | null; playlist_tracks: { count: number }[] | null }[];
  const stories = (storiesR.data ?? []) as { id: string; body: string | null; image_key: string | null }[];
  const n = await numerosDosEnvios({ faixas: faixas.map((f) => f.id), playlists: playlists.map((p) => p.id), stories: stories.map((s) => s.id) });

  const publicadas = faixas.filter((t) => t.status === "published").length;
  const grupos = acharDuplicatas(faixas);
  const duplicadas = new Set(grupos.flat().map((f) => f.id));
  const porAlbum = new Map<string, typeof faixas>();
  for (const f of faixas) if (f.album_id) porAlbum.set(f.album_id, [...(porAlbum.get(f.album_id) ?? []), f]);
  const preparando = faixas.some((f) => f.status === "processing");

  const itensFaixas: Item[] = faixas.map((t) => {
    const status = statusFaixa(t.status, t.failure_reason);
    const publicada = t.status === "published";
    const emPlaylists = publicada ? presenca.porFaixa.get(t.id) ?? 0 : 0;
    const numeros = publicada ? [textoNumeros("faixa", { reproducoes: n.reproducoes.get(t.id), salvamentos: n.salvamentosFaixa.get(t.id) }), emPlaylists ? rotuloEmPlaylists(emPlaylists) : ""].filter(Boolean).join(" · ") : undefined;
    return { id: t.id, titulo: t.title, href: `/faixa/${t.id}`, capa: <Capa id={t.id} title={t.title} hasCover={!!t.cover_key} className={capa} />, status, numeros, duplicata: duplicadas.has(t.id), compartilhavel: publicada };
  });
  const itensAlbuns: Item[] = albuns.map((a) => {
    const fs = porAlbum.get(a.id) ?? [];
    const comCapa = fs.find((f) => f.cover_key) ?? fs[0];
    const reproducoes = fs.reduce((t, f) => t + (n.reproducoes.get(f.id) ?? 0), 0);
    return {
      id: a.id,
      titulo: a.title,
      href: `/album/${a.id}`,
      capa: comCapa ? <Capa id={comCapa.id} title={a.title} hasCover={!!comCapa.cover_key} className={capa} /> : <CapaArte title={a.title} className={capa} />,
      status: { rotulo: a.kind === "ep" ? "EP" : "Álbum", tom: "neutro" },
      numeros: textoNumeros("album", { faixas: fs.length, reproducoes }),
      compartilhavel: true,
    };
  });
  const itensPlaylists: Item[] = playlists.map((p) => {
    const url = urlCapaPlaylist(p.id, p.cover_path);
    return {
      id: p.id,
      titulo: p.title,
      href: `/playlist/${p.id}`,
      // eslint-disable-next-line @next/next/no-img-element -- capa do bucket por redirecionamento (sem otimizador: cota)
      capa: url ? <img src={url} alt="" width={56} height={56} loading="lazy" decoding="async" className={`${capa} shrink-0 rounded-md object-cover`} /> : <CapaArte title={p.title} className={capa} />,
      status: statusPlaylist(p.is_public),
      numeros: textoNumeros("playlist", { faixas: p.playlist_tracks?.[0]?.count ?? 0, salvamentos: n.salvamentosPlaylist.get(p.id) }),
      compartilhavel: p.is_public,
    };
  });
  const itensStories: Item[] = stories.map((s) => {
    const titulo = s.body || "Story sem texto";
    return {
      id: s.id,
      titulo,
      href: `/story/${s.id}`,
      // eslint-disable-next-line @next/next/no-img-element -- imagem do story por URL assinada (sem otimizador: cota)
      capa: s.image_key ? <img src={`/api/stories/${s.id}/imagem`} alt="" width={56} height={56} loading="lazy" decoding="async" className={`${capa} shrink-0 rounded-md object-cover`} /> : <CapaArte title={titulo} className={capa} />,
      numeros: textoNumeros("story", { visualizacoes: n.visualizacoes.get(s.id) }),
      compartilhavel: true,
    };
  });

  const nada = [faixas, albuns, playlists, stories].every((l) => l.length === 0) && apagados.length === 0;
  const sp = await searchParams;
  const pedida = typeof sp.aba === "string" ? sp.aba : undefined;
  // Sem aba pedida: a primeira que tem conteúdo (quem só faz playlists cai direto nelas).
  const contagens: Record<AbaEnvios, number> = { faixas: faixas.length, albuns: albuns.length, playlists: playlists.length, stories: stories.length };
  const inicial: AbaEnvios = isAbaEnvios(pedida) ? pedida : (ABAS_ENVIOS.find((a) => contagens[a] > 0) ?? "faixas");
  const rotulo = (r: string, q: number) => (q > 0 ? `${r} ${q}` : r);
  const apoio = textoPresenca(presenca.total, publicadas);

  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Meus envios</h1>
      {nada ? (
        <EstadoVazio titulo="Nada enviado ainda" texto="Suas faixas, álbuns, playlists e stories aparecem aqui." acao={<Link href="/enviar" className="inline-flex min-h-11 items-center rounded-full bg-[var(--ds-destaque)] px-5 font-semibold text-[var(--ds-sobre-destaque)] transition-opacity hover:opacity-90">Enviar música</Link>} />
      ) : (
        <AbasEnvios
          inicial={inicial}
          paineis={{
            faixas: {
              rotulo: rotulo("Faixas", faixas.length),
              conteudo: (
                <>
                  {apoio && <p data-testid="presenca-playlists" className="text-sm font-semibold text-[var(--ds-destaque)]">{apoio}</p>}
                  <AvisoDuplicatas grupos={grupos} reproducoes={n.reproducoes} />
                  <Lista tipo="faixa" itens={itensFaixas} vazio={<Vazio titulo="Nenhuma faixa ainda" href="/enviar" acao="Enviar música" />} />
                  <AtualizarEnquantoPrepara ativo={preparando} />
                </>
              ),
            },
            albuns: { rotulo: rotulo("Álbuns", albuns.length), conteudo: <Lista tipo="album" itens={itensAlbuns} vazio={<Vazio titulo="Nenhum álbum ou EP" href="/enviar" acao="Enviar álbum" />} /> },
            playlists: { rotulo: rotulo("Playlists", playlists.length), conteudo: <Lista tipo="playlist" itens={itensPlaylists} vazio={<Vazio titulo="Nenhuma playlist" href="/playlist/nova" acao="Criar playlist" />} /> },
            stories: { rotulo: rotulo("Stories", stories.length), conteudo: <Lista tipo="story" itens={itensStories} vazio={<Vazio titulo="Nenhum story" href="/stories/novo" acao="Criar story" />} /> },
          }}
        />
      )}
      {!nada && apagados.length > 0 && (
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
