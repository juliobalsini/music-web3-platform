/* eslint-disable @next/next/no-img-element -- fotos de perfil (Google ou rota própria), sem otimizador (cota). */
import { Flame, Pencil, Play, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AbasPerfil } from "@/components/abas-perfil";
import { ConviteVisitante } from "@/components/convite-visitante";
import { AnelProgresso, BarrasLeves, ChipStatus, GraficoCircular, LinhaEstatistica } from "@/components/ds";
import { Ajuda } from "@/components/ds/interativos";
import { botao, linha, Mensagem, Tela } from "@/components/ui";
import { contagem } from "@/lib/envios/rules";
import { listenConfig } from "@/lib/listen/config";
import { acoesMinhaRadio } from "@/lib/menu";
import { resumirMinhaRadio } from "@/lib/radio/minha";
import { descobertasDaSemana, diasSeguidos, escutasProprias, fatiasDeGeneros, minutosPorDia, perfilSonoro } from "@/lib/radio/perfil";
import { carregarRadio } from "@/lib/radio/queries";
import { rotuloGenero } from "@/lib/radio/generos";
import { resumoSemana } from "@/lib/radio/rules";
import { getResumoConta, getSessaoAny } from "@/lib/session";
import { fotosDePerfis } from "@/lib/stories/bio-queries";
import { ativo, idsDaPlataforma, podePublicarStory } from "@/lib/stories/rules";
import { presencaEmPlaylists } from "@/lib/playlists/queries";
import { metricasDoArtista, type PainelArtista } from "@/lib/tracks/queries";
import { variacaoSemana } from "@/lib/tracks/rules";

export const metadata = { title: "Perfil · radioOn" };

/** Título de seção do Perfil com o botão + (leva à criação). */
function SecaoTitulo({ titulo, href, rotulo }: { titulo: string; href: string; rotulo: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <Link href={href} aria-label={rotulo} className="foco-claro flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-sobre-destaque">
        <Plus className="size-5" aria-hidden="true" />
      </Link>
    </div>
  );
}

const motivos: Record<string, string> = { listen: "Escuta" };

/** Foto redonda do perfil (ou a inicial do nome, sem foto). */
function Avatar({ foto, nome, tamanho }: { foto: string | null; nome: string; tamanho: "g" | "p" }) {
  const cls = tamanho === "g" ? "size-16 text-2xl" : "size-10 text-base";
  return foto ? (
    <img src={foto} alt="" width={tamanho === "g" ? 64 : 40} height={tamanho === "g" ? 64 : 40} loading={tamanho === "p" ? "lazy" : undefined} referrerPolicy="no-referrer" className={`${cls} shrink-0 rounded-full bg-[var(--ds-surface-2)] object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-2)] font-bold text-[var(--ds-destaque)]`}>
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}

/** Cabeçalho do próprio perfil: foto, nome, selos, seguidores/seguindo e editar. */
function Cabecalho({ nome, foto, selos, seguidores, seguindo }: { nome: string; foto: string | null; selos: string[]; seguidores: number; seguindo: number }) {
  return (
    <header className="flex items-center gap-4">
      <Avatar foto={foto} nome={nome} tamanho="g" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 translate="no" className="truncate text-2xl font-semibold">{nome}</h1>
        {selos.length > 0 && (
          <ul aria-label="Selos" className="flex flex-wrap gap-1.5">
            {selos.map((s) => <li key={s}><ChipStatus tom="destaque">{s}</ChipStatus></li>)}
          </ul>
        )}
        <p className="text-sm text-[var(--ds-texto-2)] tabular-nums" data-testid="seguidores">
          {contagem(seguidores, "seguidor", "seguidores")} · {seguindo.toLocaleString("pt-BR")} seguindo
        </p>
      </div>
      <Link href="/ajustes" aria-label="Editar perfil" className="foco-claro flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface)] text-[var(--ds-texto)] hover:bg-[var(--ds-surface-2)]">
        <Pencil className="size-5" aria-hidden="true" />
      </Link>
    </header>
  );
}

/** Aba Artista: ouvintes, reproduções, faixa mais tocada, presença em playlists, 7 dias e faixas. Privada. */
function PainelDoArtista({ painel, emPlaylists }: { painel: PainelArtista; emPlaylists: number }) {
  const r = painel.resumo;
  const variacao = variacaoSemana(r.semana, r.semanaAnterior);
  return (
    <>
      <section aria-label="Seus números" className="flex flex-col rounded-[var(--ds-raio)] bg-[var(--ds-surface)] px-4 py-1">
        <LinhaEstatistica rotulo="Ouvintes" valor={r.ouvintes.toLocaleString("pt-BR")} apoio="Pessoas diferentes que ouviram" />
        <LinhaEstatistica rotulo="Reproduções" valor={r.reproducoes.toLocaleString("pt-BR")} apoio="Escutas válidas, de 30 s ou mais" />
        <LinhaEstatistica rotulo="Em playlists" valor={emPlaylists.toLocaleString("pt-BR")} apoio="Playlists públicas de outras pessoas" />
        {r.maisTocada && (
          <LinhaEstatistica
            rotulo="Mais tocada"
            apoio={r.maisTocada.title}
            valor={<Link href={`/faixa/${r.maisTocada.id}`} className="underline-offset-4 hover:underline">{contagem(r.maisTocada.reproducoes, "vez", "vezes")}</Link>}
          />
        )}
      </section>

      <section aria-label="Últimos 7 dias" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-bold">Últimos 7 dias</h2>
          <p className="text-sm text-[var(--ds-texto-2)] tabular-nums">
            {contagem(r.semana, "reprodução", "reproduções")}
            {variacao ? ` · ${variacao}` : ""}
          </p>
        </div>
        <BarrasLeves rotulo="Reproduções por dia" dados={r.dias} />
      </section>

      <section aria-label="Minhas faixas" className="flex flex-col gap-2">
        <SecaoTitulo titulo="Minhas faixas" href="/enviar" rotulo="Enviar música" />
        <ul className="flex flex-col gap-2">
          {painel.faixas.map(({ faixa, metrica }) => (
            <li key={faixa.id}>
              <Link href={`/faixa/${faixa.id}`} className={`${linha} min-h-12 flex-wrap`}>
                <span className="min-w-0 flex-1 basis-40 truncate font-medium">{faixa.title}</span>
                <span className="shrink-0 text-sm text-[var(--ds-texto-2)] tabular-nums">
                  {contagem(metrica.escutas, "reprodução", "reproduções")} · {contagem(metrica.ouvintes, "ouvinte", "ouvintes")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/meus-envios" className="self-start py-2 text-sm font-semibold text-[var(--ds-destaque)] underline-offset-4 hover:underline">
          Ver todos os envios
        </Link>
      </section>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sessao = await getSessaoAny();
  if (!sessao) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-balance">Perfil</h1>
        <ConviteVisitante />
      </>
    );
  }
  const { supabase, userId, role, anonimo } = sessao;
  const abaPedida = (await searchParams).aba;
  const cfg = listenConfig();
  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(0, 0, 0, 0); // dia de pontos em UTC (igual ao banco)

  // RLS: cada usuário só enxerga as próprias escutas, o próprio extrato e as linhas de follows em que aparece.
  const contarFollows = (coluna: "followed_id" | "follower_id") =>
    anonimo ? Promise.resolve(0) : Promise.resolve(supabase.from("follows").select("followed_id", { count: "exact", head: true }).eq(coluna, userId)).then((r) => r.count ?? 0).catch(() => 0);
  const [{ data: pontos, error: erroPontos }, { data: eventos }, radio, conta, seguidores, seguindo] = await Promise.all([
    supabase.from("points_ledger").select("id,amount,reason,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("listen_events").select("track_id,seconds_listened,is_valid,started_at").order("started_at", { ascending: false }).limit(5000),
    carregarRadio(),
    anonimo ? null : getResumoConta().catch(() => null),
    contarFollows("followed_id"),
    contarFollows("follower_id"),
  ]);
  const extrato = pontos ?? [];
  const escutas = eventos ?? [];
  const total = extrato.reduce((s, l) => s + l.amount, 0);
  const hoje = extrato
    .filter((l) => l.reason === "listen" && new Date(l.created_at) >= inicioDoDia)
    .reduce((s, l) => s + l.amount, 0);
  const plays = new Map(radio.faixas.map((f) => [f.id, f.plays]));
  const resumo = resumirMinhaRadio(escutas, plays);
  const painel = role === "artist" ? await metricasDoArtista(userId) : null;
  const minhasFaixas = role !== "artist" ? [] : painel === null ? null : painel.faixas;
  // Aba Artista: só para quem tem faixas publicadas (as métricas são privadas, só do dono).
  const temAba = !anonimo && role === "artist" && !!painel && painel.faixas.length > 0;
  const presenca = temAba ? await presencaEmPlaylists(userId) : null;
  const agoraMs = new Date().getTime();
  // Estatísticas privadas da aba "Você" (só o dono lê as próprias escutas).
  const semana = resumoSemana(escutas, radio.faixas, agoraMs, 50);
  const topArtistas = semana.artistas.slice(0, 3);
  const generos = fatiasDeGeneros(semana.generos, (id) => rotuloGenero(id) ?? id);
  const descobertas = descobertasDaSemana(escutas, radio.faixas, agoraMs);
  const sonoro = perfilSonoro(generos, semana.escutas, descobertas);
  const sequencia = diasSeguidos(escutas, agoraMs);
  const minutosDia = minutosPorDia(escutas, agoraMs);
  const proprias = escutasProprias(escutas, radio.faixas, userId);
  const [fotos, { data: meusStories }, { data: minhasPlaylists }] = await Promise.all([
    topArtistas.length > 0 ? fotosDePerfis(topArtistas.map((a) => a.id)).catch(() => new Map<string, string>()) : new Map<string, string>(),
    // RLS: o autor enxerga os próprios stories, inclusive os ocultos por denúncias.
    anonimo
      ? { data: [] }
      : supabase.from("stories").select("id,body,created_at,hidden").eq("author_id", userId).order("created_at", { ascending: false }).limit(20),
    anonimo
      ? { data: [] }
      : supabase.from("playlists").select("id,title,is_public,playlist_tracks(count)").eq("curator_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  const publicaStory = podePublicarStory(role, userId, idsDaPlataforma(process.env.PLATFORM_STORY_IDS)).pode;
  const selos = [
    ...(role === "artist" ? ["Artista"] : []),
    ...((minhasPlaylists ?? []).some((p) => (p as { is_public?: boolean }).is_public) ? ["Playlister"] : []),
  ];

  const voce = (
    <>
      <section aria-label="Meta de hoje" className="flex flex-col gap-3 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] p-4">
        <div className="flex items-center gap-4">
          <AnelProgresso valor={cfg.dailyLimit > 0 ? hoje / cfg.dailyLimit : 0} tamanho={88} espessura={8} rotulo="Pontos de hoje">
            <span className="flex flex-col items-center leading-tight">
              <span className="text-lg">{hoje}</span>
              <span className="text-xs font-medium text-[var(--ds-texto-2)]">de {cfg.dailyLimit}</span>
            </span>
          </AnelProgresso>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-semibold">Meta de hoje</h2>
            <p className="text-sm text-[var(--ds-texto-2)] tabular-nums" data-testid="meta">
              {hoje} de {cfg.dailyLimit} pontos
            </p>
            <p className="flex items-center gap-1.5 text-sm font-semibold tabular-nums" data-testid="sequencia">
              <Flame className="size-4 text-[var(--ds-destaque)]" aria-hidden="true" />
              {sequencia === 0 ? "Ouça hoje para começar uma sequência" : sequencia === 1 ? "1 dia ouvindo" : `${sequencia} dias seguidos ouvindo`}
            </p>
          </div>
        </div>
        {erroPontos ? (
          <Mensagem>Pontos indisponíveis agora. Tente de novo em instantes.</Mensagem>
        ) : extrato.length === 0 ? (
          <p className="text-sm text-[var(--ds-texto-2)] text-pretty">Sem pontos ainda. Ouça uma faixa por 30 segundos e ganhe os primeiros.</p>
        ) : hoje >= cfg.dailyLimit ? (
          <p className="text-sm text-[var(--ds-texto-2)]">Meta batida. Os pontos voltam amanhã.</p>
        ) : null}
        {proprias > 0 && (
          <p data-testid="regra-sem-pontos" className="text-sm text-[var(--ds-texto-2)]">Faixas suas não contam pontos.</p>
        )}
      </section>

      <Ajuda titulo="Como ganhar pontos">
        Ouça 30 segundos seguidos de uma faixa de outro artista. Cada faixa pontua até 3 vezes por dia, dentro da meta diária
        de {cfg.dailyLimit} pontos. Faixas suas não contam. A meta recomeça à meia-noite (UTC).
      </Ajuda>

      <section aria-label="Seus números" className="flex flex-col rounded-[var(--ds-raio)] bg-[var(--ds-surface)] px-4 py-1">
        <LinhaEstatistica rotulo="Escutas válidas" valor={resumo.escutas.toLocaleString("pt-BR")} />
        <LinhaEstatistica rotulo="Minutos ouvidos" valor={resumo.minutos.toLocaleString("pt-BR")} />
        <LinhaEstatistica rotulo="Pontos no total" valor={total.toLocaleString("pt-BR")} />
      </section>

      <section aria-labelledby="som-da-semana" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 id="som-da-semana" className="text-lg font-bold">Seu som da semana</h2>
          {sonoro && (
            <p className="text-sm text-[var(--ds-texto-2)]" data-testid="perfil-sonoro">
              Seu perfil sonoro: <span className="font-semibold text-[var(--ds-destaque)]">{sonoro}</span>
            </p>
          )}
        </div>
        {semana.escutas === 0 ? (
          <p className="text-sm text-[var(--ds-texto-2)] text-pretty">Ouça algumas faixas e veja aqui seus gêneros, artistas e minutos da semana.</p>
        ) : (
          <>
            {generos.length > 0 && <GraficoCircular rotulo="Gêneros da semana" dados={generos} tamanho={112} />}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--ds-texto-2)]">Artistas mais ouvidos</h3>
              <ol className="flex flex-col gap-1">
                {topArtistas.map((a) => (
                  <li key={a.id}>
                    <Link href={`/perfil/${a.id}`} className="foco-claro flex min-h-12 items-center gap-3 rounded-lg px-1 hover:bg-[var(--ds-surface)]">
                      <Avatar foto={fotos.get(a.id) ?? null} nome={a.nome} tamanho="p" />
                      <span translate="no" className="min-w-0 flex-1 truncate font-medium">{a.nome}</span>
                      <span className="shrink-0 text-sm text-[var(--ds-texto-2)] tabular-nums">{contagem(a.escutas, "escuta", "escutas")}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            {descobertas !== null && (
              <p className="text-sm text-[var(--ds-texto-2)] text-pretty" data-testid="descobertas">
                <span className="font-semibold text-[var(--ds-texto)] tabular-nums">Descobertas: {descobertas}%</span> da sua escuta foi em artistas novos para você.
              </p>
            )}
          </>
        )}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-[var(--ds-texto-2)]">Minutos por dia</h3>
          <BarrasLeves rotulo="Minutos ouvidos por dia" dados={minutosDia} />
        </div>
      </section>

      {extrato.length === 0 && (
        <Link href="/" className={botao}>
          <Play className="size-5" aria-hidden="true" /> Ouvir agora
        </Link>
      )}

      {anonimo && <ConviteVisitante compacto />}

      {!anonimo && acoesMinhaRadio(role).filter((a) => a.icone === "perfil").map(({ href, label }) => (
        <Link key={href} href={href} className={botao}>
          <UserRound className="size-5" aria-hidden="true" /> {label}
        </Link>
      ))}

      {!anonimo && (
        <>
          {!temAba && <section aria-label="Minhas faixas" className="flex flex-col gap-2">
            <SecaoTitulo titulo="Minhas faixas" href="/enviar" rotulo="Enviar música" />
            {role !== "artist" ? (
              <p className="text-tinta/70 text-pretty">Artista? Envie sua primeira música: o perfil de artista é ativado na hora.</p>
            ) : minhasFaixas === null ? (
              <Mensagem>Suas faixas estão indisponíveis agora. Tente de novo em instantes.</Mensagem>
            ) : minhasFaixas.length === 0 ? (
              <p className="text-tinta/70 text-pretty">Nenhuma faixa publicada ainda. Suas escutas aparecem aqui.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {minhasFaixas.map(({ faixa, metrica }) => (
                  <li key={faixa.id} className={`${linha} flex-wrap`}>
                    <span className="min-w-0 flex-1 basis-40 truncate font-medium">{faixa.title}</span>
                    <span className="shrink-0 text-sm text-tinta/70 tabular-nums">
                      {metrica.escutas} escutas · {metrica.ouvintes} ouvintes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>}

          <section aria-label="Minhas playlists" className="flex flex-col gap-2">
            <SecaoTitulo titulo="Minhas playlists" href="/playlist/nova" rotulo="Criar playlist" />
            {(minhasPlaylists ?? []).length === 0 ? (
              <p className="text-tinta/70 text-pretty">Nenhuma playlist ainda. Toque em + para criar a primeira.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(minhasPlaylists ?? []).map((p) => (
                  <li key={p.id}>
                    <Link href={`/playlist/${p.id}`} className={`${linha} min-h-12`}>
                      <span className="truncate font-medium">{p.title}</span>
                      <span className="shrink-0 text-sm text-tinta/70 tabular-nums">{(p.playlist_tracks as unknown as { count: number }[])[0]?.count ?? 0} faixas</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Meus stories" className="flex flex-col gap-2">
            <SecaoTitulo titulo="Meus stories" href={publicaStory ? "/stories/novo" : "/onboarding"} rotulo={publicaStory ? "Novo story" : "Escolher perfil para publicar"} />
            {(meusStories ?? []).length === 0 ? (
              <p className="text-tinta/70 text-pretty">{publicaStory ? "Nenhum story ainda. Toque em + para publicar o primeiro." : "Artistas e playlisters publicam stories. Escolha um perfil para começar."}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(meusStories ?? []).map((st) => {
                  const estado = st.hidden ? "Oculto por denúncias" : ativo(st.created_at, agoraMs) ? "No ar" : "Arquivado";
                  const conteudo = (
                    <>
                      <span className="min-w-0 truncate font-medium">{st.body || "Story sem texto"}</span>
                      <span className="shrink-0 text-sm text-tinta/70">{estado}</span>
                    </>
                  );
                  return (
                    <li key={st.id}>
                      {st.hidden ? <div className={`${linha} min-h-12`}>{conteudo}</div> : <Link href={`/story/${st.id}`} className={`${linha} min-h-12`}>{conteudo}</Link>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {extrato.length > 0 && (
        <section aria-label="Últimos pontos" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Últimos pontos</h2>
          <ul className="flex flex-col gap-2">
            {extrato.slice(0, 5).map((l) => (
              <li key={l.id} className={linha}>
                <span className="flex flex-col">
                  <span>{motivos[l.reason] ?? l.reason}</span>
                  <time dateTime={l.created_at} className="text-sm text-tinta/70">
                    {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </time>
                </span>
                <span className="font-semibold text-brand tabular-nums">+{l.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );

  const nome = conta?.nome ?? "Você";
  return (
    <>
      {anonimo || !conta ? (
        <h1 className="text-2xl font-semibold text-balance">Perfil</h1>
      ) : (
        <Cabecalho nome={nome} foto={conta.foto} selos={selos} seguidores={seguidores} seguindo={seguindo} />
      )}
      {temAba && painel ? (
        <AbasPerfil
          inicial={abaPedida === "artista" ? "artista" : "voce"}
          voce={voce}
          artista={<PainelDoArtista painel={painel} emPlaylists={presenca?.total ?? 0} />}
        />
      ) : (
        voce
      )}
    </>
  );
}

export default function MinhaRadioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Tela>
      <Suspense>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </Tela>
  );
}
