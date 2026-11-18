// Perfil, aba "Você" (#125, item 1): estatísticas privadas derivadas das escutas do próprio usuário.
// Funções puras (sem banco); dia em UTC, igual ao dia de pontos do servidor.

const DIA = 86_400_000;
const SEMANA = 7 * DIA;
const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Evento = { track_id: string; started_at: string; seconds_listened: number; is_valid: boolean };
type Faixa = { id: string; artistId: string };

const diaUtc = (ms: number) => Math.floor(ms / DIA);

/**
 * Dias seguidos com escuta válida. Conta a partir de hoje; se hoje ainda não teve escuta, a sequência de ontem
 * continua valendo (só zera depois de um dia inteiro sem ouvir).
 */
export function diasSeguidos(eventos: Pick<Evento, "started_at" | "is_valid">[], agora: number): number {
  const dias = new Set<number>();
  for (const e of eventos) {
    const t = Date.parse(e.started_at);
    if (e.is_valid && Number.isFinite(t)) dias.add(diaUtc(t));
  }
  let d = diaUtc(agora);
  if (!dias.has(d)) d -= 1;
  let n = 0;
  while (dias.has(d)) {
    n += 1;
    d -= 1;
  }
  return n;
}

/** Minutos ouvidos em cada um dos últimos 7 dias (o último é hoje), com rótulo curto do dia da semana. */
export function minutosPorDia(eventos: Pick<Evento, "started_at" | "seconds_listened">[], agora: number): { rotulo: string; valor: number }[] {
  const hoje = diaUtc(agora);
  const segundos = new Array<number>(7).fill(0);
  for (const e of eventos) {
    const t = Date.parse(e.started_at);
    if (!Number.isFinite(t)) continue;
    const i = 6 - (hoje - diaUtc(t));
    if (i >= 0 && i < 7) segundos[i] += Math.max(0, e.seconds_listened);
  }
  return segundos.map((s, i) => ({
    rotulo: i === 6 ? "Hoje" : DIAS_CURTOS[new Date((hoje - 6 + i) * DIA).getUTCDay()],
    valor: Math.floor(s / 60),
  }));
}

/**
 * Descobertas: % das escutas válidas da semana em artistas que o usuário ouviu pela primeira vez nesta semana.
 * `null` sem escutas na semana. A janela é a das escutas carregadas (as mais recentes).
 */
export function descobertasDaSemana(eventos: Pick<Evento, "track_id" | "started_at" | "is_valid">[], faixas: Faixa[], agora: number): number | null {
  const artista = new Map(faixas.map((f) => [f.id, f.artistId]));
  const primeira = new Map<string, number>();
  const daSemana: string[] = [];
  for (const e of eventos) {
    const t = Date.parse(e.started_at);
    const a = artista.get(e.track_id);
    if (!e.is_valid || !a || !Number.isFinite(t)) continue;
    if (t < (primeira.get(a) ?? Infinity)) primeira.set(a, t);
    if (agora - t < SEMANA) daSemana.push(a);
  }
  if (daSemana.length === 0) return null;
  const novas = daSemana.filter((a) => agora - (primeira.get(a) ?? 0) < SEMANA).length;
  return Math.round((novas / daSemana.length) * 100);
}

/** Escutas válidas em faixas do próprio usuário (não contam pontos). */
export function escutasProprias(eventos: Pick<Evento, "track_id" | "is_valid">[], faixas: Faixa[], userId: string): number {
  const minhas = new Set(faixas.filter((f) => f.artistId === userId).map((f) => f.id));
  return eventos.filter((e) => e.is_valid && minhas.has(e.track_id)).length;
}

/** Gêneros para o gráfico: os 4 maiores e o resto somado em "Outros". */
export function fatiasDeGeneros(generos: { id: string; escutas: number }[], rotulo: (id: string) => string, maximo = 4): { rotulo: string; valor: number }[] {
  const topo = generos.slice(0, maximo).map((g) => ({ rotulo: rotulo(g.id), valor: g.escutas }));
  const resto = generos.slice(maximo).reduce((s, g) => s + g.escutas, 0);
  return resto > 0 ? [...topo, { rotulo: "Outros", valor: resto }] : topo;
}

/**
 * "Seu perfil sonoro": rótulo leve gerado pelos dados da semana. `null` com poucas escutas (menos de 3).
 * Descoberta alta → explorador; um gênero dominante → fã; vários gêneros sem dominante → eclético.
 */
export function perfilSonoro(generos: { rotulo: string; valor: number }[], escutas: number, descobertas: number | null): string | null {
  if (escutas < 3) return null;
  const total = generos.reduce((s, g) => s + g.valor, 0);
  const topo = generos[0];
  const fatia = topo && total > 0 ? topo.valor / total : 0;
  const nome = topo && topo.rotulo !== "Outros" ? topo.rotulo : null;
  if ((descobertas ?? 0) >= 50) return nome ? `Explorador de ${nome}` : "Explorador de sons novos";
  if (nome && fatia >= 0.6) return `Fã de ${nome}`;
  if (generos.length >= 3) return "Ouvido eclético";
  return nome ? `Na onda de ${nome}` : "Ouvinte fiel";
}
