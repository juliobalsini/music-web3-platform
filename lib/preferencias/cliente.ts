"use client";

import { useSyncExternalStore } from "react";

import { mesclar, PADRAO, type Preferencias } from "./rules.ts";

const CHAVE = "radioon:prefs";
/** Chave antiga do "Normalizar volume" (antes das Configurações); lida uma vez como reserva. */
const CHAVE_NORMALIZAR = "radioon:normalizar";
const EVENTO = "radioon:prefs";

let cache: { bruto: string | null; prefs: Preferencias } | null = null;

/** Preferências deste aparelho (padrão quando não há armazenamento). Objeto estável entre leituras iguais. */
export function lerPreferencias(): Preferencias {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (cache && cache.bruto === bruto) return cache.prefs;
    const antigo = localStorage.getItem(CHAVE_NORMALIZAR);
    const legado = antigo === null ? {} : { normalizar: antigo !== "0" };
    let salvo: unknown = {};
    try {
      salvo = bruto ? JSON.parse(bruto) : {};
    } catch {
      salvo = {};
    }
    cache = { bruto, prefs: mesclar(legado, salvo) };
    return cache.prefs;
  } catch {
    return PADRAO;
  }
}

/** Grava no aparelho e avisa quem estiver ouvindo (mesma aba). */
export function gravarPreferencias(parcial: Partial<Preferencias>): Preferencias {
  const novas = mesclar(lerPreferencias(), parcial);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(novas));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    /* sem armazenamento: vale a sessão */
  }
  return novas;
}

function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Hook: preferências atuais deste aparelho (no servidor, o padrão). */
export function usePreferencias(): Preferencias {
  return useSyncExternalStore(assinar, lerPreferencias, () => PADRAO);
}
