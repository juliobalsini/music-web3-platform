import { BadgeCheck, ListMusic, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BotaoSeguir } from "@/components/botao-seguir";
import { ChipStatus } from "@/components/ds";
import { ListaFaixas } from "@/components/lista-faixas";
import { PlaylistsDaSemana } from "@/components/secoes-radio";
import { RegistrarVisita } from "@/components/registrar-visita";
import { Tela } from "@/components/ui";
import { presencaEmPlaylists } from "@/lib/playlists/queries";
import { isUuid, textoPresenca } from "@/lib/playlists/rules";
import Link from "next/link";

import { curadoresAtivos, curadorOficial, IDS_OFICIAIS, selecoesDoCurador } from "@/lib/radio/curadores";
import { PLATAFORMA_ID, selecaoRadioOn, type Selecao } from "@/lib/radio/home";
import { carregarRadio } from "@/lib/radio/queries";
import { carregarStories } from "@/lib/stories/queries";
import { ativo } from "@/lib/stories/rules";
import { podeSeguir } from "@/lib/seguir/rules";
import { perfilEhPublico } from "@/lib/preferencias/conta";
import { getSessionRole } from "@/lib/session";

/** O usuário (com conta) segue este perfil? Visitante/anônimo: false (o botão leva ao login). */
async function seguindoPerfil(id: string): Promise<{ mostrar: boolean; seguindo: boolean; eu: string | null }> {
  const sessao = await getSessionRole().catch(() => null);
  const eu = sessao?.userId ?? null;
  if (!podeSeguir(eu, id, IDS_OFICIAIS)) return { mostrar: false, seguindo: false, eu };
  if (!sessao) return { mostrar: true, seguindo: false, eu };
  const { data } = await sessao.supabase.from("follows").select("followed_id").eq("follower_id", sessao.userId).eq("followed_id", id).maybeSingle();
  return { mostrar: true, seguindo: !!data, eu };
}

export const metadata = { title: "Perfil · radioOn" };

/** Lista das playlists da Seleção radioOn (virtuais, recalculadas a cada leitura). */
function ListaSelecao({ lista, titulo }: { lista: Selecao[]; titulo: string }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      <ul className="flex flex-col gap-2">
        {lista.map((s) => (
          <li key={s.id}>
            <Link href={`/playlist/${s.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-tinta/10 px-4 py-2 hover:bg-tinta/15">
              <span className="truncate font-semibold">{s.title}</span>
              <span className="shrink-0 text-sm text-tinta/70 tabular-nums">{s.faixas.length} {s.faixas.length === 1 ? "faixa" : "faixas"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Curador oficial (virtual, criado pela conta radioOn): nome, selo, frase e as playlists da Seleção que assina. */
async function PerfilCurador({ id }: { id: string }) {
  const curador = curadorOficial(id);
  if (!curador) notFound();
  const radio = await carregarRadio();
  const lista = selecoesDoCurador(selecaoRadioOn(radio.faixas, new Date().getTime()), id);
  // Sem playlist no momento (gênero ainda sem faixas suficientes): nada de perfil vazio.
  if (lista.length === 0) notFound();
  return (
    <>
      <RegistrarVisita tipo="perfil" id={id} titulo={curador.nome} sub="Curador oficial" />
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-2xl font-bold text-sobre-destaque">
          {curador.nome.split(" ").at(-1)?.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{curador.nome}</h1>
          <p data-testid="selo-curador-oficial" className="flex items-center gap-1 text-sm font-semibold text-brand">
            <BadgeCheck aria-hidden="true" className="size-4" /> Curador oficial
          </p>
          <p className="text-sm text-tinta/70">{curador.bio}</p>
        </div>
      </div>
      <ListaSelecao titulo="Playlists" lista={lista} />
      <p className="text-sm text-tinta/70">
        Da equipe <Link href={`/perfil/${PLATAFORMA_ID}`} className="font-semibold text-brand underline-offset-2 hover:underline">radioOn</Link>
      </p>
    </>
  );
}

/** No perfil radioOn: a Seleção e os curadores oficiais criados por ele. */
function OficialSelecao({ lista }: { lista: Selecao[] }) {
  const curadores = curadoresAtivos(lista);
  return (
    <>
      <ListaSelecao titulo="Seleção radioOn" lista={lista} />
      {curadores.length > 0 && (
        <section aria-label="Curadores oficiais" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Curadores oficiais</h2>
          <ul className="flex flex-col gap-2">
            {curadores.map((c) => (
              <li key={c.id}>
                <Link href={`/perfil/${c.id}`} className="flex min-h-12 items-center gap-2 rounded-lg bg-tinta/10 px-4 py-2 font-semibold hover:bg-tinta/15">
                  <BadgeCheck aria-hidden="true" className="size-4 shrink-0 text-brand" />
                  <span className="truncate">{c.nome}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Perfil público de artista e/ou curador: só nome, faixas publicadas e playlists públicas. */
async function Conteudo({ params }: Pick<PageProps<"/perfil/[id]">, "params">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  if (curadorOficial(id)) return <PerfilCurador id={id} />;
  const [radio, todosStories, seguir, publico, presenca] = await Promise.all([carregarRadio(), carregarStories().catch(() => []), seguindoPerfil(id), perfilEhPublico(id), presencaEmPlaylists(id)]);
  const stories = todosStories.filter((s) => s.authorId === id);
  const agora = new Date().getTime();
  const faixas = radio.faixas.filter((f) => f.artistId === id);
  const playlists = radio.todasPlaylists.filter((p) => p.curatorId === id);
  if (faixas.length === 0 && playlists.length === 0 && stories.length === 0) notFound();
  const nome = faixas[0]?.artistName ?? playlists[0]?.curator ?? stories[0]?.authorName ?? "Perfil";
  const plays = faixas.reduce((n, f) => n + f.plays, 0);
  // Configurações › Perfil público desligado: quem visita vê só o nome (o dono vê tudo). As faixas e playlists
  // publicadas seguem tocando no resto da radioOn.
  if (!publico && seguir.eu !== id) {
    return (
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-tinta/10 text-tinta/70">
          <Lock className="size-7" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{nome}</h1>
          <p data-testid="perfil-privado" className="text-sm text-tinta/70">Perfil privado</p>
        </div>
      </div>
    );
  }
  return (
    <>
      <RegistrarVisita tipo="perfil" id={id} titulo={nome} sub={id === PLATAFORMA_ID ? "Perfil oficial" : "Perfil"} />
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-2xl font-bold text-sobre-destaque">
          {nome.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{nome}</h1>
          {id === PLATAFORMA_ID && <p className="text-sm font-semibold text-brand">Perfil oficial</p>}
          {id !== PLATAFORMA_ID && playlists.length > 0 && <p data-testid="selo-playlister" className="text-sm font-semibold text-brand">Playlister</p>}
          <p className="text-sm text-tinta/70">
            {[faixas.length > 0 && `${faixas.length} ${faixas.length === 1 ? "faixa" : "faixas"}`, faixas.length > 0 && `${plays} escutas`, playlists.length > 0 && `${playlists.length} ${playlists.length === 1 ? "playlist" : "playlists"}`].filter(Boolean).join(" · ")}
          </p>
          {faixas.length > 0 && presenca.total > 0 && (
            <p data-testid="presenca-playlists" className="mt-1">
              <ChipStatus tom="destaque" icone={<ListMusic aria-hidden="true" className="size-3.5" />}>
                {seguir.eu === id ? textoPresenca(presenca.total, faixas.length) : `Em ${presenca.total} ${presenca.total === 1 ? "playlist" : "playlists"}`}
              </ChipStatus>
            </p>
          )}
        </div>
      </div>
      {seguir.mostrar && <BotaoSeguir id={id} seguindo={seguir.seguindo} />}
      {faixas.length > 0 && (
        <section aria-label="Faixas do artista" className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Faixas</h2>
          <ListaFaixas rotulo="Faixas do artista" faixas={faixas} />
        </section>
      )}
      <PlaylistsDaSemana titulo="Playlists" lista={playlists} />
      {id === PLATAFORMA_ID && <OficialSelecao lista={selecaoRadioOn(radio.faixas, agora)} />}
      {stories.length > 0 && (
        <section aria-label="Stories do perfil" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Stories</h2>
          <ul className="flex flex-col gap-2">
            {stories.map((st) => (
              <li key={st.id}>
                <Link href={`/story/${st.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-tinta/10 px-4 py-3 hover:bg-tinta/15">
                  <span className="min-w-0 truncate font-medium">{st.body || "Story sem texto"}</span>
                  <span className="shrink-0 text-sm text-tinta/70">{ativo(st.createdAt, agora) ? "No ar" : "Arquivado"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function PerfilPage({ params }: PageProps<"/perfil/[id]">) {
  return (
    <Tela>
      <Suspense>
        <Conteudo params={params} />
      </Suspense>
    </Tela>
  );
}
