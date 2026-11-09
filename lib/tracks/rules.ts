export type FaixaResumo = { id: string; title: string };

export type EscutaLinha = { track_id: string; is_valid: boolean; user_id: string };

export type MetricaFaixa = { trackId: string; escutas: number; ouvintes: number };

/** Escutas válidas e ouvintes únicos por faixa (só conta is_valid). */
export function agregarMetricas(linhas: EscutaLinha[]): Map<string, MetricaFaixa> {
  const mapa = new Map<string, MetricaFaixa>();
  const vistos = new Map<string, Set<string>>();
  for (const l of linhas) {
    if (!l.is_valid) continue;
    const m = mapa.get(l.track_id) ?? { trackId: l.track_id, escutas: 0, ouvintes: 0 };
    m.escutas += 1;
    const s = vistos.get(l.track_id) ?? new Set<string>();
    s.add(l.user_id);
    vistos.set(l.track_id, s);
    m.ouvintes = s.size;
    mapa.set(l.track_id, m);
  }
  return mapa;
}
