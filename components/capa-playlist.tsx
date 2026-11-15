import { Capa, CapaArte } from "@/components/capa";
import { capaMosaico } from "@/lib/playlists/sugestoes";

type FaixaCapa = { id: string; title: string; hasCover: boolean };

/** Capa automática da playlist: mosaico 2×2 das 4 primeiras faixas; com 1–3, a capa da primeira; vazia, arte do título. */
export function CapaPlaylist({ titulo, faixas, className = "size-28" }: { titulo: string; faixas: FaixaCapa[]; className?: string }) {
  const c = capaMosaico(faixas);
  if (c.tipo === "arte") return <CapaArte title={titulo} className={`${className} !rounded-xl`} />;
  if (c.tipo === "unica") return <Capa id={c.faixa.id} title={c.faixa.title} hasCover={c.faixa.hasCover} className={`${className} !rounded-xl`} />;
  return (
    <div className={`${className} grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-xl`} aria-hidden="true" data-testid="capa-mosaico">
      {c.faixas.map((f) => <Capa key={f.id} id={f.id} title={f.title} hasCover={f.hasCover} className="size-full !rounded-none" />)}
    </div>
  );
}
