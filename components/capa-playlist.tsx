import { Capa, CapaArte } from "@/components/capa";
import { capaMosaico } from "@/lib/playlists/sugestoes";

type FaixaCapa = { id: string; title: string; hasCover: boolean };

/**
 * Capa da playlist: a foto própria (`capa`, URL da rota do app) quando houver; senão o mosaico 2×2 das 4 primeiras
 * faixas; com 1–3, a capa da primeira; vazia, arte do título.
 */
export function CapaPlaylist({ titulo, faixas, capa, className = "size-28" }: { titulo: string; faixas: FaixaCapa[]; capa?: string | null; className?: string }) {
  if (capa) {
    // eslint-disable-next-line @next/next/no-img-element -- imagem do bucket via redirecionamento (sem otimizador da Vercel: cota)
    return <img src={capa} alt="" width={1000} height={1000} decoding="async" className={`${className} shrink-0 rounded-xl bg-tinta/5 object-cover`} data-testid="capa-propria" />;
  }
  const c = capaMosaico(faixas);
  if (c.tipo === "arte") return <CapaArte title={titulo} className={`${className} !rounded-xl`} />;
  if (c.tipo === "unica") return <Capa id={c.faixa.id} title={c.faixa.title} hasCover={c.faixa.hasCover} className={`${className} !rounded-xl`} />;
  return (
    <div className={`${className} grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-xl`} aria-hidden="true" data-testid="capa-mosaico">
      {c.faixas.map((f) => <Capa key={f.id} id={f.id} title={f.title} hasCover={f.hasCover} className="size-full !rounded-none" />)}
    </div>
  );
}
