"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";

/**
 * Tela de abertura: logo inteiro, centralizado, no mesmo tamanho do ícone da splash do Android (transição contínua), por ~1,4 s na primeira visita da sessão.
 * Nunca bloqueia toque (pointer-events: none) e some sozinha.
 */
export function Abertura() {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("radioon_abertura")) return;
      sessionStorage.setItem("radioon_abertura", "1");
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de sessionStorage (só no cliente)
    setVisivel(true);
    const t = setTimeout(() => setVisivel(false), 1400);
    return () => clearTimeout(t);
  }, []);
  if (!visivel) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="abertura"
      className="abertura pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-night-900"
    >
      {/* Mesma posição e proporção da splash do Android (ícone "any": logo a 64% do lado, centrado em 12 rem). */}
      <Logo className="h-auto w-[7.68rem] object-contain" />
    </div>
  );
}
