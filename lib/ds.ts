// Funções puras do design system (testáveis sem React).
export type FatiaGrafico = { rotulo: string; valor: number };

/** Fatias de um gráfico circular: fração e início (0–1) de cada valor positivo. */
export function fatiasDoGrafico(dados: FatiaGrafico[]): { rotulo: string; frac: number; inicio: number }[] {
  const validos = dados.filter((d) => Number.isFinite(d.valor) && d.valor > 0);
  const total = validos.reduce((s, d) => s + d.valor, 0);
  let acc = 0;
  return validos.map((d) => {
    const frac = d.valor / total;
    const f = { rotulo: d.rotulo, frac, inicio: acc };
    acc += frac;
    return f;
  });
}
