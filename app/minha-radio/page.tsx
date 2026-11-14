import { BookOpen, Clock, Compass, Headphones, Play, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ConviteVisitante } from "@/components/convite-visitante";
import { botao, linha, Mensagem, Tela } from "@/components/ui";
import { listenConfig } from "@/lib/listen/config";
import { acoesMinhaRadio } from "@/lib/menu";
import { progressoMeta, resumirMinhaRadio } from "@/lib/radio/minha";
import { carregarRadio } from "@/lib/radio/queries";
import { rotuloGenero } from "@/lib/radio/generos";
import { resumoSemana } from "@/lib/radio/rules";
import { getSessaoAny } from "@/lib/session";
import { ativo, idsDaPlataforma, podePublicarStory } from "@/lib/stories/rules";
import { metricasDoArtista } from "@/lib/tracks/queries";

export const metadata = { title: "Perfil · radioOn" };

/** Título de seção do Perfil com o botão + (leva à criação). */
function SecaoTitulo({ titulo, href, rotulo }: { titulo: string; href: string; rotulo: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <Link href={href} aria-label={rotulo} className="foco-claro flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-night-900">
        <Plus className="size-5" aria-hidden="true" />
      </Link>
    </div>
  );
}

const motivos: Record<string, string> = { listen: "Escuta" };

async function Conteudo() {
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
  const cfg = listenConfig();
  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(0, 0, 0, 0); // dia de pontos em UTC (igual ao banco)

  // RLS: cada usuário só enxerga as próprias escutas e o próprio extrato.
  const [{ data: pontos, error: erroPontos }, { data: eventos }, radio] = await Promise.all([
    supabase.from("points_ledger").select("id,amount,reason,created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("listen_events").select("track_id,seconds_listened,is_valid,started_at").order("started_at", { ascending: false }).limit(5000),
    carregarRadio(),
  ]);
  const extrato = pontos ?? [];
  const total = extrato.reduce((s, l) => s + l.amount, 0);
  const hoje = extrato
    .filter((l) => l.reason === "listen" && new Date(l.created_at) >= inicioDoDia)
    .reduce((s, l) => s + l.amount, 0);
  const plays = new Map(radio.faixas.map((f) => [f.id, f.plays]));
  const resumo = resumirMinhaRadio(eventos ?? [], plays);
  const meta = progressoMeta(hoje, cfg.dailyLimit);
  const minhasFaixas = role === "artist" ? await metricasDoArtista(userId) : [];
  const semana = resumoSemana(eventos ?? [], radio.faixas, new Date().getTime());
  // RLS: o autor enxerga os próprios stories, inclusive os ocultos por denúncias.
  const { data: meusStories } = anonimo
    ? { data: [] }
    : await supabase.from("stories").select("id,body,created_at,hidden").eq("author_id", userId).order("created_at", { ascending: false }).limit(20);
  const publicaStory = podePublicarStory(role, userId, idsDaPlataforma(process.env.PLATFORM_STORY_IDS)).pode;
  const agoraMs = new Date().getTime();
  const { data: minhasPlaylists } = anonimo
    ? { data: [] }
    : await supabase.from("playlists").select("id,title,playlist_tracks(count)").eq("curator_id", userId).order("created_at", { ascending: false }).limit(20);

  const dados = [
    { Icone: Headphones, rotulo: "Escutas válidas", valor: resumo.escutas },
    { Icone: Clock, rotulo: "Minutos ouvidos", valor: resumo.minutos },
    { Icone: Compass, rotulo: "Descobertas", valor: resumo.descobertas },
    { Icone: BookOpen, rotulo: "Pontos no total", valor: total },
  ];

  return (
    <>
      <h1 className="text-2xl font-semibold text-balance">Perfil</h1>

      <section aria-label="Meta de hoje" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Meta de hoje</h2>
          <p className="text-sm text-white/70 tabular-nums" data-testid="meta">
            {hoje} de {cfg.dailyLimit} pontos
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Pontos de hoje"
          aria-valuemin={0}
          aria-valuemax={cfg.dailyLimit}
          aria-valuenow={Math.min(hoje, cfg.dailyLimit)}
          className="h-3 overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${meta}%` }} />
        </div>
        {erroPontos ? (
          <Mensagem>Pontos indisponíveis agora. Tente de novo em instantes.</Mensagem>
        ) : extrato.length === 0 ? (
          <p className="text-sm text-white/70 text-pretty">Sem pontos ainda. Ouça uma faixa por 30 segundos e ganhe os primeiros.</p>
        ) : hoje >= cfg.dailyLimit ? (
          <p className="text-sm text-white/70">Meta batida. Os pontos voltam amanhã.</p>
        ) : null}
      </section>

      <ul aria-label="Resumo" className="flex flex-col gap-2">
        {dados.map(({ Icone, rotulo, valor }) => (
          <li key={rotulo} className={linha}>
            <span className="flex items-center gap-3">
              <Icone className="size-5 text-brand" aria-hidden="true" />
              {rotulo}
            </span>
            <span className="font-semibold tabular-nums" data-testid={`dado-${rotulo.split(" ")[0].toLowerCase()}`}>{valor}</span>
          </li>
        ))}
      </ul>

      {resumo.minutos > 0 && total === 0 && (
        <p data-testid="regra-sem-pontos" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white/80 text-pretty">
          Você ouviu {resumo.minutos} min sem ganhar pontos. Pontos vêm de faixas de outros artistas, com 30 segundos seguidos, até 3 vezes por faixa ao dia, dentro do limite diário.
        </p>
      )}

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
          <section aria-label="Resumo da semana" className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">Resumo da semana</h2>
            {semana.escutas === 0 ? (
              <p className="text-sm text-white/70 text-pretty">Ouça algumas faixas e veja aqui seus artistas e gêneros da semana.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1 rounded-xl bg-white/10 p-3">
                  <h3 className="text-sm font-semibold text-brand">Artistas</h3>
                  <ol className="flex flex-col gap-0.5 text-sm">
                    {semana.artistas.map((a) => (
                      <li key={a.id} className="flex justify-between gap-2"><span className="truncate">{a.nome}</span><span className="tabular-nums text-white/70">{a.escutas}</span></li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-white/10 p-3">
                  <h3 className="text-sm font-semibold text-brand">Gêneros</h3>
                  {semana.generos.length === 0 ? (
                    <p className="text-sm text-white/70">Sem gênero informado.</p>
                  ) : (
                    <ol className="flex flex-col gap-0.5 text-sm">
                      {semana.generos.map((g) => (
                        <li key={g.id} className="flex justify-between gap-2"><span className="truncate">{rotuloGenero(g.id) ?? g.id}</span><span className="tabular-nums text-white/70">{g.escutas}</span></li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            )}
          </section>

          <section aria-label="Minhas faixas" className="flex flex-col gap-2">
            <SecaoTitulo titulo="Minhas faixas" href={role === "artist" ? "/enviar" : "/onboarding"} rotulo={role === "artist" ? "Enviar música" : "Escolher perfil de artista"} />
            {role !== "artist" ? (
              <p className="text-white/70 text-pretty">Artista? Escolha esse perfil e publique sua música.</p>
            ) : minhasFaixas === null ? (
              <Mensagem>Suas faixas estão indisponíveis agora. Tente de novo em instantes.</Mensagem>
            ) : minhasFaixas.length === 0 ? (
              <p className="text-white/70 text-pretty">Nenhuma faixa publicada ainda. Suas escutas aparecem aqui.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {minhasFaixas.map(({ faixa, metrica }) => (
                  <li key={faixa.id} className={`${linha} flex-wrap`}>
                    <span className="min-w-0 flex-1 basis-40 truncate font-medium">{faixa.title}</span>
                    <span className="shrink-0 text-sm text-white/70 tabular-nums">
                      {metrica.escutas} escutas · {metrica.ouvintes} ouvintes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Minhas playlists" className="flex flex-col gap-2">
            <SecaoTitulo titulo="Minhas playlists" href="/playlist/nova" rotulo="Criar playlist" />
            {(minhasPlaylists ?? []).length === 0 ? (
              <p className="text-white/70 text-pretty">Nenhuma playlist ainda. Toque em + para criar a primeira.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(minhasPlaylists ?? []).map((p) => (
                  <li key={p.id}>
                    <Link href={`/playlist/${p.id}`} className={`${linha} min-h-12`}>
                      <span className="truncate font-medium">{p.title}</span>
                      <span className="shrink-0 text-sm text-white/70 tabular-nums">{(p.playlist_tracks as unknown as { count: number }[])[0]?.count ?? 0} faixas</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Meus stories" className="flex flex-col gap-2">
            <SecaoTitulo titulo="Meus stories" href={publicaStory ? "/stories/novo" : "/onboarding"} rotulo={publicaStory ? "Novo story" : "Escolher perfil para publicar"} />
            {(meusStories ?? []).length === 0 ? (
              <p className="text-white/70 text-pretty">{publicaStory ? "Nenhum story ainda. Toque em + para publicar o primeiro." : "Artistas e playlisters publicam stories. Escolha um perfil para começar."}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(meusStories ?? []).map((st) => {
                  const estado = st.hidden ? "Oculto por denúncias" : ativo(st.created_at, agoraMs) ? "No ar" : "Arquivado";
                  const conteudo = (
                    <>
                      <span className="min-w-0 truncate font-medium">{st.body || "Story sem texto"}</span>
                      <span className="shrink-0 text-sm text-white/70">{estado}</span>
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
                  <time dateTime={l.created_at} className="text-sm text-white/70">
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
}

export default function MinhaRadioPage() {
  return (
    <Tela>
      <Suspense>
        <Conteudo />
      </Suspense>
    </Tela>
  );
}
