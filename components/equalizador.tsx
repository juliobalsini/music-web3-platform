/** Equalizador de 3 barras na faixa que está tocando (parado quando reduz movimento). */
export function Equalizador({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex h-4 items-end gap-[2px] ${className}`}>
      {[0, 0.25, 0.5].map((atraso) => (
        <span
          key={atraso}
          className="h-full w-[3px] origin-bottom rounded-full bg-brand"
          style={{ animation: `eq 0.9s ease-in-out ${atraso}s infinite` }}
        />
      ))}
    </span>
  );
}
