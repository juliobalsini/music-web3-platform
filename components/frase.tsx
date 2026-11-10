/** Frase da marca (cartão da marca). */
export const FRASE_DA_MARCA = "Música para os melhores ouvintes.";

export function Frase({ className = "" }: { className?: string }) {
  return <p className={`text-pretty text-brand ${className}`}>{FRASE_DA_MARCA}</p>;
}
