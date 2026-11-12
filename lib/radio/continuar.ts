// Regras puras do "Continue ouvindo" (histórico local do aparelho; posição exata de cada faixa).

export type TipoAtalho = "faixa" | "playlist" | "album" | "perfil";
export type Atalho = {
  tipo: TipoAtalho;
  id: string;
  titulo: string;
  sub: string;
  /** Faixa cuja capa ilustra o atalho (faixa, primeira da playlist/álbum); perfil usa a inicial. */
  capaId: string | null;
  temCapa: boolean;
  /** Só faixas: ponto onde parou e duração, em segundos. */
  pos: number;
  dur: number;
  ts: number;
};

export const MAX_ATALHOS = 6;
export const MIN_ATALHOS = 2;
const GUARDA = 30;

const TIPOS: TipoAtalho[] = ["faixa", "playlist", "album", "perfil"];

/** Lê o JSON salvo, descartando o que não tem forma de atalho. */
export function lerAtalhos(bruto: string | null): Atalho[] {
  if (!bruto) return [];
  try {
    const j: unknown = JSON.parse(bruto);
    if (!Array.isArray(j)) return [];
    return j.filter(
      (a): a is Atalho =>
        !!a && typeof a === "object" && TIPOS.includes(a.tipo) && typeof a.id === "string" && typeof a.titulo === "string" && typeof a.ts === "number",
    ).map((a) => ({ ...a, sub: String(a.sub ?? ""), capaId: a.capaId ?? null, temCapa: !!a.temCapa, pos: Number(a.pos) || 0, dur: Number(a.dur) || 0 }));
  } catch {
    return [];
  }
}

/** Põe o atalho no topo (um por tipo+id), preservando a posição quando o novo não a traz. */
export function registrarAtalho(lista: Atalho[], novo: Omit<Atalho, "pos" | "dur"> & Partial<Pick<Atalho, "pos" | "dur">>): Atalho[] {
  const antigo = lista.find((a) => a.tipo === novo.tipo && a.id === novo.id);
  const item: Atalho = { ...novo, pos: novo.pos ?? antigo?.pos ?? 0, dur: novo.dur ?? antigo?.dur ?? 0 };
  return [item, ...lista.filter((a) => !(a.tipo === novo.tipo && a.id === novo.id))].slice(0, GUARDA);
}

/** Progresso 0–1 (só faixas com duração conhecida). */
export function progressoAtalho(a: Pick<Atalho, "pos" | "dur">): number {
  return a.dur > 0 ? Math.min(1, Math.max(0, a.pos / a.dur)) : 0;
}

/** Ponto de retomada: no fim (ou quase) recomeça do zero. */
export function pontoDeRetomada(pos: number, dur: number): number {
  if (!(pos > 1)) return 0;
  if (dur > 0 && pos >= dur - 3) return 0;
  return Math.floor(pos);
}

/**
 * Até 6 atalhos misturando os tipos: mais recente de cada tipo primeiro (rodízio), depois o resto por
 * data; faixas ausentes do catálogo (`existe` falso) saem. Menos de 2 → vazio (a seção some).
 */
export function atalhosVisiveis(lista: Atalho[], existe: (a: Atalho) => boolean): Atalho[] {
  const validos = lista.filter(existe).sort((a, b) => b.ts - a.ts);
  const porTipo = TIPOS.map((t) => validos.filter((a) => a.tipo === t));
  const escolhidos: Atalho[] = [];
  for (let i = 0; escolhidos.length < MAX_ATALHOS && i < validos.length; i++) {
    for (const g of porTipo) if (g[i] && escolhidos.length < MAX_ATALHOS) escolhidos.push(g[i]);
  }
  const r = escolhidos.sort((a, b) => b.ts - a.ts);
  return r.length >= MIN_ATALHOS ? r : [];
}
