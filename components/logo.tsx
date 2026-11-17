/* eslint-disable @next/next/no-img-element -- logo estático pequeno; sem otimizador de imagem (cota). */
type LogoProps = {
  className?: string;
  alt?: string;
};

/**
 * Logo do gramofone (recortado do cartão da marca, fundo transparente). No tema claro troca para a variante com
 * "radio" em marinho (scripts/brand/gerar-logo-claro.mjs); a troca é só CSS (app/globals.css, `.logo-*`), e a
 * variante escondida usa `loading="lazy"` para não ser baixada à toa.
 */
export function Logo({ className, alt = "radioOn" }: LogoProps) {
  const cls = `${className ?? "h-24 w-auto"} select-none`;
  return (
    <>
      <img src="/brand/logo.png" alt={alt} width={385} height={270} className={`logo-escuro ${cls}`} />
      <img src="/brand/logo-claro.png" alt={alt} width={385} height={270} loading="lazy" className={`logo-claro ${cls}`} />
    </>
  );
}
