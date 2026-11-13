"use client";

import { useMemo, useSyncExternalStore } from "react";

import { CHAVE_VISTOS, lerVistos, marcarVisto } from "@/lib/stories/viewer";

const EVENTO = "radioon:stories-vistos";

function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}
const ler = () => {
  try {
    return localStorage.getItem(CHAVE_VISTOS) ?? "";
  } catch {
    return "";
  }
};

/** Ids de stories já vistos neste aparelho (localStorage; o servidor guarda a visualização por usuário/sessão à parte). */
export function useVistos(): ReadonlySet<string> {
  const bruto = useSyncExternalStore(assinar, ler, () => "");
  return useMemo(() => new Set(lerVistos(bruto || null)), [bruto]);
}

export function marcarVistoLocal(id: string) {
  try {
    localStorage.setItem(CHAVE_VISTOS, marcarVisto(localStorage.getItem(CHAVE_VISTOS), id));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    /* armazenamento indisponível */
  }
}
