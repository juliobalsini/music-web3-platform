// Trilha do artista no aparelho: o passo "compartilhar" fica no localStorage (não há registro de compartilhamento no banco).

import { CHAVE_COMPARTILHOU } from "./trilha";

const ouvintes = new Set<() => void>();

export function marcarCompartilhou() {
  try {
    localStorage.setItem(CHAVE_COMPARTILHOU, "1");
  } catch {
    /* modo privado: o passo só não fica salvo */
  }
  for (const f of ouvintes) f();
}

export function jaCompartilhou(): boolean {
  try {
    return localStorage.getItem(CHAVE_COMPARTILHOU) === "1";
  } catch {
    return false;
  }
}

/** Para `useSyncExternalStore`: muda nesta aba (marcarCompartilhou) e em outras (evento storage). */
export function assinarCompartilhou(f: () => void) {
  ouvintes.add(f);
  const aoMudar = (e: StorageEvent) => e.key === CHAVE_COMPARTILHOU && f();
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintes.delete(f);
    window.removeEventListener("storage", aoMudar);
  };
}
