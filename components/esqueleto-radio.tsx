import { Esqueleto } from "@/components/ds";

/**
 * Esqueleto da Rádio enquanto os dados chegam (toque na logo, primeira visita): mesma silhueta da Home
 * (stories, cartão No ar, filtros e uma prateleira), sem saltos de layout quando o conteúdo entra.
 */
export function EsqueletoRadio() {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando a rádio" data-testid="esqueleto-radio" className="flex flex-col gap-5 pt-1">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Esqueleto key={i} className="size-16 shrink-0 rounded-full" />
        ))}
      </div>
      <Esqueleto className="aspect-[4/3] w-full rounded-2xl" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Esqueleto key={i} className="h-9 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <Esqueleto className="h-5 w-40" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex w-32 shrink-0 flex-col gap-2">
            <Esqueleto className="aspect-square w-full rounded-xl" />
            <Esqueleto className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
