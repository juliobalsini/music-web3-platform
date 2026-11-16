// Tema da semana (issue #122, fase 2, item 3; DECISIONS 112).
// A conta oficial define o tema de cada semana ISO aqui, por PR (o gate revisa), no mesmo modelo dos curadores
// oficiais: sem tela de administração nem credencial nova. Semana sem tema definido usa o rodízio abaixo.
// Playlists marcadas guardam só a semana ("2026-47"); o banco só aceita marcar a semana atual (trigger).

const DIA = 24 * 3600 * 1000;
const SEMANA = 7 * DIA;

export type Tema = { titulo: string; chamada: string };

/** Rodízio padrão: um tema por semana, na ordem, quando a semana não tem tema definido. */
export const TEMAS_RODIZIO: readonly Tema[] = [
  { titulo: "Trilha de domingo", chamada: "Faixas para um dia sem pressa." },
  { titulo: "Pé na estrada", chamada: "O que você ouve com a janela aberta." },
  { titulo: "Dia de chuva", chamada: "Canções para ver a chuva passar." },
  { titulo: "Madrugada", chamada: "Para quem ainda está acordado." },
  { titulo: "Feito em casa", chamada: "Gravações de quarto, sala e garagem." },
  { titulo: "Dançar sozinho", chamada: "Faixas que tiram você da cadeira." },
  { titulo: "Cidade natal", chamada: "Sons do lugar de onde você veio." },
  { titulo: "Primeira escuta", chamada: "Artistas que você acabou de descobrir." },
];

/** Temas escolhidos pela conta oficial para semanas específicas (chave: semana ISO "AAAA-SS"). */
export const TEMAS_DEFINIDOS: Readonly<Record<string, Tema>> = {
  "2026-47": { titulo: "Trilha de domingo", chamada: "Faixas para um dia sem pressa." },
};

/** Semana ISO em UTC ("2026-47"), igual ao `to_char(now() at time zone 'utc', 'IYYY-IW')` do trigger. */
export function semanaIso(ms: number): string {
  const d = new Date(ms);
  const dia = (d.getUTCDay() + 6) % 7; // segunda = 0
  const quinta = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dia + 3);
  const ano = new Date(quinta).getUTCFullYear();
  // A semana ISO é a da quinta-feira: conta-se pelo dia do ano dela.
  const semana = 1 + Math.floor((quinta - Date.UTC(ano, 0, 1)) / SEMANA);
  return `${ano}-${String(semana).padStart(2, "0")}`;
}

/** Início (segunda, 00:00 UTC) da semana que contém `ms`. */
export function inicioDaSemana(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
}

export const semanaValida = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}$/.test(s);

/** Tema de uma semana: o definido pela conta oficial ou o do rodízio (estável por semana). */
export function temaDa(semana: string): Tema {
  const definido = TEMAS_DEFINIDOS[semana];
  if (definido) return definido;
  const [ano, num] = semana.split("-").map(Number);
  return TEMAS_RODIZIO[(ano * 53 + num) % TEMAS_RODIZIO.length];
}

export type TemaAtual = Tema & { semana: string };

export const temaAtual = (agora: number): TemaAtual => {
  const semana = semanaIso(agora);
  return { semana, ...temaDa(semana) };
};

type PlaylistComTema = { id: string; tema: string | null };
type Salvamento = { playlistId: string; createdAt: string };

/** Playlists públicas marcadas com o tema desta semana, na ordem recebida. */
export const marcadasNaSemana = (playlists: PlaylistComTema[], agora: number): string[] => {
  const semana = semanaIso(agora);
  return playlists.filter((p) => p.tema === semana).map((p) => p.id);
};

/**
 * Destaque da semana: as mais salvas **durante a semana anterior** entre as marcadas com o tema dela.
 * Só entra playlist com pelo menos 1 salvamento no período (nada de destaque sem público).
 */
export function destaquesDoTemaAnterior(
  playlists: PlaylistComTema[],
  salvamentos: Salvamento[],
  agora: number,
  limite = 3,
): { id: string; salvos: number }[] {
  const fim = inicioDaSemana(agora);
  const inicio = fim - SEMANA;
  const anterior = semanaIso(inicio);
  const ids = new Set(playlists.filter((p) => p.tema === anterior).map((p) => p.id));
  const n = new Map<string, number>();
  for (const s of salvamentos) {
    const t = Date.parse(s.createdAt);
    if (!ids.has(s.playlistId) || !(t >= inicio && t < fim)) continue;
    n.set(s.playlistId, (n.get(s.playlistId) ?? 0) + 1);
  }
  return [...n.entries()]
    .map(([id, salvos]) => ({ id, salvos }))
    .sort((a, b) => b.salvos - a.salvos || a.id.localeCompare(b.id))
    .slice(0, limite);
}
