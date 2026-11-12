"use client";

import { dbParaLinear, ganhoDb } from "../audio/transcode.ts";

const CHAVE = "radioon:normalizar";

/** "Normalizar volume": ligado por padrão (guardado só neste aparelho). */
export function normalizarLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== "0";
  } catch {
    return true;
  }
}
export function definirNormalizar(v: boolean) {
  try {
    localStorage.setItem(CHAVE, v ? "1" : "0");
    window.dispatchEvent(new Event("radioon:normalizar"));
  } catch {
    /* sem armazenamento: vale a sessão */
  }
}

/**
 * Ganho no player, nunca no arquivo. Web Audio só com origem que responde CORS (o Worker): com
 * `crossOrigin` numa origem sem CORS o navegador recusaria a faixa. Sem Web Audio, só atenuação
 * (ganho < 1) via `volume`. Um limitador (compressor) impede clipping nos reforços de até +6 dB.
 */
export function criarGanho(el: HTMLAudioElement) {
  let ctx: AudioContext | null = null;
  let no: GainNode | null = null;
  const montar = () => {
    if (no) return no;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const fonte = ctx.createMediaElementSource(el);
    no = ctx.createGain();
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -1;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.003;
    lim.release.value = 0.1;
    fonte.connect(no).connect(lim).connect(ctx.destination);
    return no;
  };
  return {
    /** Chamar antes de definir `src`: prepara CORS quando a origem é o proxy. */
    preparar(url: string, ehProxy: boolean) {
      if (ehProxy) el.crossOrigin = "anonymous";
      else if (!no) el.removeAttribute("crossorigin");
      return url;
    },
    aplicar(lufs: number | null | undefined, ehProxy: boolean) {
      const db = normalizarLigado() ? ganhoDb(lufs) : 0;
      const lin = dbParaLinear(db);
      if (ehProxy && (no || lin !== 1)) {
        const g = montar();
        if (g) {
          void ctx?.resume();
          g.gain.value = lin;
          el.volume = 1;
          return;
        }
      }
      // Origem sem CORS (ou sem Web Audio): só atenuar. Se o grafo já existe, o ganho dele vale.
      if (no) no.gain.value = 1;
      el.volume = Math.min(1, lin);
    },
  };
}
