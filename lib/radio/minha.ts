import { DESCOBERTA_MAX_ESCUTAS } from "./rules.ts";

export type EventoPessoal = { track_id: string; seconds_listened: number; is_valid: boolean };

export type ResumoMinhaRadio = { escutas: number; minutos: number; descobertas: number };

/**
 * Resumo pessoal. Descoberta = faixa com escuta válida sua que ainda é pouco ouvida
 * (até DESCOBERTA_MAX_ESCUTAS escutas válidas no total).
 */
export function resumirMinhaRadio(eventos: EventoPessoal[], escutasTotais: Map<string, number>): ResumoMinhaRadio {
  let segundos = 0;
  let escutas = 0;
  const descobertas = new Set<string>();
  for (const e of eventos) {
    segundos += Math.max(0, e.seconds_listened);
    if (e.is_valid) {
      escutas += 1;
      if ((escutasTotais.get(e.track_id) ?? 0) <= DESCOBERTA_MAX_ESCUTAS) descobertas.add(e.track_id);
    }
  }
  return { escutas, minutos: Math.floor(segundos / 60), descobertas: descobertas.size };
}

/** Progresso da meta diária de pontos, entre 0 e 100. */
export function progressoMeta(pontosHoje: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((pontosHoje / meta) * 100)));
}
