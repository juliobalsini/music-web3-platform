/* eslint-disable @next/next/no-img-element -- logo estático pequeno; sem otimizador de imagem (cota). */
type LogoProps = {
  className?: string;
};

/** Logo do gramofone (recortado do cartão da marca, fundo transparente). */
export function Logo({ className }: LogoProps) {
  return (
    <img
      src="/brand/logo.png"
      alt="radioOn"
      width={385}
      height={270}
      className={`h-auto w-auto select-none ${className ?? "h-24"}`}
    />
  );
}
