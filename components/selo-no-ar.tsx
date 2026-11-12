/** Selo "No ar · N ouvindo". N inclui quem está vendo; nunca aparece só "No ar". */
export function SeloNoAr({ ouvindo }: { ouvindo: number }) {
  const n = Math.max(1, ouvindo);
  return (
    <p data-testid="selo-no-ar" className="flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full bg-white/10 px-3 text-sm font-bold text-brand">
      <span aria-hidden="true" className="size-2 rounded-full bg-brand" style={{ animation: "eq 1.4s ease-in-out infinite" }} />
      No ar
      <span data-testid="ouvindo" className="font-semibold text-white/80">· {n} ouvindo</span>
    </p>
  );
}
