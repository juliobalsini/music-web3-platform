import { Bookmark, ListPlus, Plus } from "lucide-react";
import Link from "next/link";

import { Capa, CapaArte } from "@/components/capa";
import { CuradoresOficiais, SelecaoRadioOn } from "@/components/home-prateleiras";
import { LinkConta } from "@/components/login-contextual";
import { TemaDaSemana } from "@/components/tema-semana";
import { secaoVisivel, vezes } from "@/lib/playlists/hub";
import type { Selecao } from "@/lib/radio/home";
import type { Hub } from "@/lib/radio/queries";
import { capaGerada } from "@/lib/radio/rules";

function Cabeca({ id, titulo, apoio }: { id: string; titulo: string; apoio: string }) {
  return (
    <div className="flex flex-col">
      <h2 id={id} className="text-lg font-bold">{titulo}</h2>
      <p className="text-sm text-[var(--ds-texto-2)]">{apoio}</p>
    </div>
  );
}

/** Em alta: carrossel das playlists mais salvas na semana. */
function EmAlta({ lista }: { lista: Hub["emAlta"] }) {
  return (
    <section aria-labelledby="hub-em-alta" className="flex flex-col gap-2">
      <Cabeca id="hub-em-alta" titulo="Playlists em alta" apoio="As mais salvas nos últimos 7 dias" />
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((p) => (
          <li key={p.id} className="w-36 shrink-0 snap-start">
            <Link href={`/playlist/${p.id}`} className="flex flex-col gap-1.5 rounded-xl">
              {p.capa ? (
                <Capa id={p.capa.id} title={p.title} hasCover={p.capa.hasCover} className="aspect-square w-full !rounded-xl" />
              ) : (
                <CapaArte title={p.title} className="aspect-square w-full !rounded-xl" />
              )}
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{p.title}</span>
              <span className="flex items-center gap-1 text-xs text-[var(--ds-texto-2)] tabular-nums">
                <Bookmark className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{vezes(p.salvos, "salvamento", "salvamentos")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Playlisters em destaque: salvamentos das playlists + seguidores. */
function Playlisters({ lista }: { lista: Hub["playlisters"] }) {
  return (
    <section aria-labelledby="hub-playlisters" className="flex flex-col gap-2">
      <Cabeca id="hub-playlisters" titulo="Playlisters em destaque" apoio="Quem mais tem playlists salvas e seguidores" />
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {lista.map((p) => (
          <li key={p.id} className="w-24 shrink-0">
            <Link href={`/perfil/${p.id}`} className="flex flex-col items-center gap-1 rounded-lg py-1 text-center">
              <span aria-hidden="true" style={{ background: capaGerada(p.name).fundo }} className="flex size-16 items-center justify-center rounded-full text-2xl font-bold text-tinta">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="w-full truncate text-sm font-semibold">{p.name}</span>
              <span className="text-xs text-[var(--ds-texto-2)] tabular-nums">{vezes(p.seguidores, "seguidor", "seguidores")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Mais playlistados: ranking semanal de artistas com selo de posição. */
function Playlistados({ lista }: { lista: Hub["playlistados"] }) {
  return (
    <section aria-labelledby="hub-playlistados" className="flex flex-col gap-2">
      <Cabeca id="hub-playlistados" titulo="Mais playlistados" apoio="Artistas que mais entraram em playlists nesta semana" />
      <ol aria-label="Ranking de artistas" className="flex flex-col divide-y divide-[var(--ds-borda)] rounded-[var(--ds-raio)] bg-[var(--ds-surface)]">
        {lista.map((a) => (
          <li key={a.id}>
            <Link href={`/perfil/${a.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-tinta/5">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${a.posicao <= 3 ? "bg-brand text-sobre-destaque" : "border border-[var(--ds-borda)] text-[var(--ds-texto-2)]"}`}
              >
                {a.posicao}º
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.name}</span>
                <span className="block truncate text-sm text-[var(--ds-texto-2)]">entrou em {vezes(a.playlists, "playlist", "playlists")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Convite final do hub: criar a própria playlist (visitante vê o login contextual). */
export function MonteSuaPlaylist() {
  return (
    <LinkConta
      href="/playlist/nova"
      motivo="Entre para criar e publicar suas playlists."
      data-testid="criar-playlist"
      className="foco-claro flex min-h-20 items-center gap-4 rounded-[var(--ds-raio)] bg-gradient-to-br from-brand to-brand-2 px-4 py-3 text-sobre-destaque"
    >
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-fundo/15">
        <ListPlus className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Monte sua playlist</span>
        <span className="block text-sm">Junte faixas e publique na radioOn</span>
      </span>
      <Plus className="size-5 shrink-0" aria-hidden="true" />
    </LinkConta>
  );
}

/**
 * Hub de playlists (#122, fase 2): Seleção radioOn, Curadores oficiais, Tema da semana, Em alta, Playlisters em destaque, Mais playlistados
 * e "Monte sua playlist". Cada seção só aparece com o mínimo de itens (`secaoVisivel`).
 * `selecao` vazio esconde a Seleção (no Explorar ela já aparece na Rádio).
 */
export function HubPlaylists({ hub, selecao = [] }: { hub: Hub; selecao?: Selecao[] }) {
  return (
    <div data-testid="hub-playlists" className="flex flex-col gap-6">
      {selecao.length > 0 && <SelecaoRadioOn lista={selecao} />}
      {selecao.length > 0 && <CuradoresOficiais lista={selecao} />}
      <TemaDaSemana tema={hub.tema} />
      {secaoVisivel(hub.emAlta) && <EmAlta lista={hub.emAlta} />}
      {secaoVisivel(hub.playlisters) && <Playlisters lista={hub.playlisters} />}
      {secaoVisivel(hub.playlistados) && <Playlistados lista={hub.playlistados} />}
      <MonteSuaPlaylist />
    </div>
  );
}
