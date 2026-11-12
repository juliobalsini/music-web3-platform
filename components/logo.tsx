/* eslint-disable @next/next/no-img-element -- logo estático pequeno; sem otimizador de imagem (cota). */
type LogoProps = {
  className?: string;
  alt?: string;
};

/** Logo do gramofone (recortado do cartão da marca, fundo transparente). */
export function Logo({ className, alt = "radioOn" }: LogoProps) {
  return (
    <img
      src="/brand/logo.png"
      alt={alt}
      width={385}
      height={270}
      className={`${className ?? "h-24 w-auto"} select-none`}
    />
  );
}
