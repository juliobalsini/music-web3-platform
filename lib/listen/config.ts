/** Regras configuráveis de pontos (env opcional, com padrões seguros). */
function inteiro(v: string | undefined, padrao: number, min: number, max: number): number {
  const n = Number(v?.trim());
  return Number.isInteger(n) && n >= min && n <= max ? n : padrao;
}

export function listenConfig(env: Record<string, string | undefined> = process.env) {
  return {
    points: inteiro(env.POINTS_PER_LISTEN, 10, 1, 1000),
    dailyLimit: inteiro(env.POINTS_DAILY_LIMIT, 200, 1, 100000),
    // Visitante anônimo: teto diário próprio (por sessão), sempre menor que o da conta.
    anonDailyLimit: Math.min(inteiro(env.POINTS_ANON_DAILY_LIMIT, 50, 1, 100000), inteiro(env.POINTS_DAILY_LIMIT, 200, 1, 100000)),
    maxPerTrack: 3,
  };
}
