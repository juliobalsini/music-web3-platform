"use client";

import { dbParaLinear, ganhoDb } from "../audio/transcode.ts";
import { gravarPreferencias, lerPreferencias } from "../preferencias/cliente.ts";
import { BANDAS_EQ, FREQ_EQ, preGanhoEq, type Eq } from "../preferencias/rules.ts";

/** "Normalizar volume": ligado por padrão (preferência do aparelho; sincroniza com a conta). */
export function definirNormalizar(v: boolean) {
  gravarPreferencias({ normalizar: v });
}

/**
 * Ganho no player, nunca no arquivo. Web Audio só com origem que responde CORS (o Worker): com
 * `crossOrigin` numa origem sem CORS o navegador recusaria a faixa. Sem Web Audio, só atenuação
 * (ganho < 1) via `volume`. Um limitador (compressor) impede clipping nos reforços de até +6 dB.
 * Equalizador (3 bandas, BiquadFilterNode) no mesmo grafo: fonte → grave → médio → agudo → ganho → limitador.
 */
export function criarGanho(el: HTMLAudioElement) {
  let ctx: AudioContext | null = null;
  let no: GainNode | null = null;
  let bandas: { grave: BiquadFilterNode; medio: BiquadFilterNode; agudo: BiquadFilterNode } | null = null;
  const equalizar = (eq: Eq) => {
    if (!bandas) return;
    const g = BANDAS_EQ[eq];
    bandas.grave.gain.value = g.grave;
    bandas.medio.gain.value = g.medio;
    bandas.agudo.gain.value = g.agudo;
  };
  const montar = () => {
    if (no) return no;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const fonte = ctx.createMediaElementSource(el);
    const filtro = (type: BiquadFilterType, frequency: number) => {
      const f = ctx!.createBiquadFilter();
      f.type = type;
      f.frequency.value = frequency;
      f.Q.value = 0.9;
      return f;
    };
    bandas = { grave: filtro("lowshelf", FREQ_EQ.grave), medio: filtro("peaking", FREQ_EQ.medio), agudo: filtro("highshelf", FREQ_EQ.agudo) };
    no = ctx.createGain();
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -1;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.003;
    lim.release.value = 0.1;
    fonte.connect(bandas.grave).connect(bandas.medio).connect(bandas.agudo).connect(no).connect(lim).connect(ctx.destination);
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
      const prefs = lerPreferencias();
      const db = prefs.normalizar ? ganhoDb(lufs) : 0;
      const lin = dbParaLinear(db);
      if (ehProxy && (no || lin !== 1 || prefs.eq !== "plano")) {
        const g = montar();
        if (g) {
          void ctx?.resume();
          equalizar(prefs.eq);
          g.gain.value = lin * dbParaLinear(preGanhoEq(prefs.eq));
          el.volume = 1;
          return;
        }
      }
      // Origem sem CORS (ou sem Web Audio): só atenuar, sem equalizador. Se o grafo já existe, fica neutro.
      equalizar("plano");
      if (no) no.gain.value = 1;
      el.volume = Math.min(1, lin);
    },
  };
}
