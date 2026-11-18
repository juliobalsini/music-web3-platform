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

// ---------- Aba Artista no próprio perfil (#125, item 3) ----------

export type EscutaDatada = EscutaLinha & { started_at: string };
export type DiaArtista = { rotulo: string; valor: number };
export type ResumoArtista = {
  ouvintes: number;
  reproducoes: number;
  maisTocada: { id: string; title: string; reproducoes: number } | null;
  dias: DiaArtista[];
  /** Reproduções nos últimos 7 dias e nos 7 anteriores (para "↑/↓ em relação à semana passada"). */
  semana: number;
  semanaAnterior: number;
};

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * Resumo do artista: ouvintes únicos e reproduções válidas no total, faixa mais tocada e as reproduções
 * de cada um dos últimos 7 dias (UTC, de 6 dias atrás até hoje). Só conta `is_valid`.
 */
export function resumoArtista(linhas: readonly EscutaDatada[], faixas: readonly FaixaResumo[], agora: number): ResumoArtista {
  const hoje = Math.floor(agora / DIA_MS);
  const porDia = new Array<number>(7).fill(0);
  const ouvintes = new Set<string>();
  const porFaixa = new Map<string, number>();
  let reproducoes = 0;
  let semana = 0;
  let semanaAnterior = 0;
  for (const l of linhas) {
    if (!l.is_valid) continue;
    reproducoes += 1;
    ouvintes.add(l.user_id);
    porFaixa.set(l.track_id, (porFaixa.get(l.track_id) ?? 0) + 1);
    const t = Date.parse(l.started_at);
    if (Number.isNaN(t)) continue;
    const atras = hoje - Math.floor(t / DIA_MS);
    if (atras >= 0 && atras < 7) {
      porDia[6 - atras] += 1;
      semana += 1;
    } else if (atras >= 7 && atras < 14) semanaAnterior += 1;
  }
  let maisTocada: ResumoArtista["maisTocada"] = null;
  for (const f of faixas) {
    const n = porFaixa.get(f.id) ?? 0;
    if (n > 0 && (!maisTocada || n > maisTocada.reproducoes)) maisTocada = { id: f.id, title: f.title, reproducoes: n };
  }
  const dias = porDia.map((valor, i) => {
    const d = new Date((hoje - (6 - i)) * DIA_MS);
    return { rotulo: i === 6 ? "hoje" : `${DIAS_SEMANA[d.getUTCDay()]} ${d.getUTCDate()}`, valor };
  });
  return { ouvintes: ouvintes.size, reproducoes, maisTocada, dias, semana, semanaAnterior };
}

/** "↑ 40% em relação aos 7 dias anteriores" (ou null quando não há base para comparar). */
export function variacaoSemana(semana: number, anterior: number): string | null {
  if (anterior <= 0) return null;
  const p = Math.round(((semana - anterior) / anterior) * 100);
  if (p === 0) return "Igual aos 7 dias anteriores";
  return `${p > 0 ? "Mais" : "Menos"} ${Math.abs(p)}% que nos 7 dias anteriores`;
}
