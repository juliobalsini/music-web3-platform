import { Bookmark, CalendarHeart, ListPlus, Trophy } from "lucide-react";
import Link from "next/link";

import { Capa, CapaArte } from "@/components/capa";
import { Ajuda } from "@/components/ds/interativos";
import { LinkConta } from "@/components/login-contextual";
import { secaoVisivel, vezes } from "@/lib/playlists/hub";
import type { Tema } from "@/lib/playlists/tema";
import type { Hub, PlaylistSemana } from "@/lib/radio/queries";

/** Faixa do tema: título grande do tema e a chamada (usada no hub e no editor). */
export function BannerTema({ tema, children }: { tema: Tema; children?: React.ReactNode }) {
  return (
    <div
      data-testid="banner-tema"
      className="relative overflow-hidden rounded-[var(--ds-raio)] bg-night-800 px-4 py-4 shadow-[0_2px_10px_rgb(0_0_0/0.25)]"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-brand/25 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <CalendarHeart className="mt-1 size-6 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight text-balance">{tema.titulo}</p>
          <p className="mt-1 text-sm text-[var(--ds-texto-2)] text-pretty">{tema.chamada}</p>
        </div>
      </div>
      {children && <div className="relative mt-3">{children}</div>}
    </div>
  );
}

function CartaoPlaylist({ p, apoio }: { p: PlaylistSemana; apoio: React.ReactNode }) {
  return (
    <Link href={`/playlist/${p.id}`} className="flex flex-col gap-1.5 rounded-xl">
      {p.capa ? (
        <Capa id={p.capa.id} title={p.title} hasCover={p.capa.hasCover} className="aspect-square w-full !rounded-xl" />
      ) : (
        <CapaArte title={p.title} className="aspect-square w-full !rounded-xl" />
      )}
      <span className="line-clamp-2 text-sm font-semibold leading-tight">{p.title}</span>
      <span className="flex items-center gap-1 truncate text-xs text-[var(--ds-texto-2)] tabular-nums">{apoio}</span>
    </Link>
  );
}

/**
 * Tema da semana no hub (#122, fase 2, item 3): o tema sempre aparece (é editorial, não é dado de uso);
 * as playlists marcadas só com o mínimo do hub; os destaques da semana passada com pelo menos 1 salvamento.
 */
export function TemaDaSemana({ tema }: { tema: Hub["tema"] }) {
  return (
    <section aria-labelledby="hub-tema" data-testid="hub-tema" className="flex flex-col gap-3">
      <h2 id="hub-tema" className="text-lg font-bold">Tema da semana</h2>
      <BannerTema tema={tema.atual}>
        <LinkConta
          href="/playlist/nova"
          motivo="Entre para criar uma playlist com o tema da semana."
          className="foco-claro inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 text-sm font-bold text-night-900 transition-colors hover:bg-brand-2"
        >
          <ListPlus className="size-4" aria-hidden="true" /> Monte a sua
        </LinkConta>
      </BannerTema>
      {secaoVisivel(tema.marcadas) && (
        <ul aria-label="Playlists com o tema" className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
          {tema.marcadas.map((p) => (
            <li key={p.id} className="w-36 shrink-0 snap-start">
              <CartaoPlaylist p={p} apoio={<span className="truncate">{p.curator ?? "Playlist"}</span>} />
            </li>
          ))}
        </ul>
      )}
      {tema.destaques.length > 0 && (
        <div className="flex flex-col gap-2" data-testid="tema-destaques">
          <h3 className="flex items-center gap-1.5 font-semibold">
            <Trophy className="size-4 text-brand" aria-hidden="true" /> Destaques do tema passado
          </h3>
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
            {tema.destaques.map((p) => (
              <li key={p.id} className="w-36 shrink-0 snap-start">
                <CartaoPlaylist
                  p={p}
                  apoio={
                    <>
                      <Bookmark className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{vezes(p.salvos, "salvamento", "salvamentos")}</span>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <Ajuda titulo="Como funciona">
        Toda semana a radioOn escolhe um tema. Publique uma playlist e marque &quot;Tema da semana&quot; no editor. As mais salvas
        durante a semana viram destaque na semana seguinte.
      </Ajuda>
    </section>
  );
}
