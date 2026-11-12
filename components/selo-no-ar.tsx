"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Selo "No ar · N ouvindo" (N inclui o próprio ouvinte; nunca só "No ar"). Atualiza a cada 60 s. */
export function SeloNoAr() {
  const naHome = usePathname() === "/";
  const [n, setN] = useState(1);
  useEffect(() => {
    if (!naHome) return;
    let vivo = true;
    const ler = () =>
      fetch("/api/ouvindo", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { n?: number } | null) => {
          if (vivo && j && Number.isInteger(j.n) && j.n! > 0) setN(j.n!);
        })
        .catch(() => {});
    void ler();
    const t = setInterval(() => void ler(), 60_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [naHome]);
  if (!naHome) return null;
  return (
    <p data-testid="selo-no-ar" className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-brand">
      <span aria-hidden="true" className="size-2 rounded-full bg-brand" style={{ animation: "eq 1.4s ease-in-out infinite" }} />
      <span>No ar</span>
      <span data-testid="ouvindo" className="font-semibold text-white/80">
        · {n} ouvindo
      </span>
    </p>
  );
}
