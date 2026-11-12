// Histórico local do "Continue ouvindo" (localStorage do aparelho). Só guarda título, posição e ids:
// nada de pontos, permissões ou validação (isso é sempre do servidor).

import { lerAtalhos, registrarAtalho, type Atalho } from "./home.ts";

const CHAVE = "radioon:continuar:v1";
export const EVENTO = "radioon:continuar";

export function lerLocal(): Atalho[] {
  try {
    return lerAtalhos(localStorage.getItem(CHAVE));
  } catch {
    return [];
  }
}

function gravar(lista: Atalho[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    /* armazenamento cheio ou bloqueado: o atalho só não aparece */
  }
}

export function registrarLocal(novo: Omit<Atalho, "pos" | "dur" | "ts"> & Partial<Pick<Atalho, "pos" | "dur">>) {
  gravar(registrarAtalho(lerLocal(), { ...novo, ts: Date.now() }));
}

/** Posição exata de uma faixa (segundos). */
export function salvarPosicao(f: { id: string; title: string; artistName: string; hasCover: boolean }, pos: number, dur: number) {
  if (!Number.isFinite(pos) || !Number.isFinite(dur)) return;
  registrarLocal({ tipo: "faixa", id: f.id, titulo: f.title, sub: f.artistName, capaId: f.id, temCapa: f.hasCover, pos, dur });
}
