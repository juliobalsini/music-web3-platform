// Regras puras da exclusão lógica (Meus envios). Testáveis, sem servidor.

export const TIPOS_ENVIO = ["faixa", "album", "playlist", "story"] as const;
export type TipoEnvio = (typeof TIPOS_ENVIO)[number];

/** Prazo para desfazer um "Apagar" (dias). Depois disso o item só sai do banco/bucket na limpeza pós-beta. */
export const DIAS_DESFAZER = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

export function isTipoEnvio(v: unknown): v is TipoEnvio {
  return typeof v === "string" && (TIPOS_ENVIO as readonly string[]).includes(v);
}

/** Tabela e coluna do dono de cada tipo (o servidor sempre filtra pelo dono antes de escrever). */
export const TABELA: Record<TipoEnvio, { tabela: "tracks" | "albums" | "playlists" | "stories"; dono: string }> = {
  faixa: { tabela: "tracks", dono: "artist_id" },
  album: { tabela: "albums", dono: "artist_id" },
  playlist: { tabela: "playlists", dono: "curator_id" },
  story: { tabela: "stories", dono: "author_id" },
};

/** Ainda dá para desfazer? `deletedAt` vem do banco (ISO). Data inválida → não. */
export function podeDesfazer(deletedAt: string | null | undefined, agora = Date.now()): boolean {
  if (!deletedAt) return false;
  const t = Date.parse(deletedAt);
  if (Number.isNaN(t)) return false;
  return agora - t < DIAS_DESFAZER * DIA_MS;
}

/** Dias inteiros que restam para desfazer (mínimo 0; "hoje" conta como 1 enquanto houver prazo). */
export function diasRestantes(deletedAt: string, agora = Date.now()): number {
  const t = Date.parse(deletedAt);
  if (Number.isNaN(t)) return 0;
  const resta = t + DIAS_DESFAZER * DIA_MS - agora;
  return resta <= 0 ? 0 : Math.ceil(resta / DIA_MS);
}

/** Limite inferior (ISO) de deleted_at para a lista "Apagados" (só o que ainda dá para desfazer). */
export function inicioJanela(agora = Date.now()): string {
  return new Date(agora - DIAS_DESFAZER * DIA_MS).toISOString();
}

export const ROTULO_TIPO: Record<TipoEnvio, string> = { faixa: "Faixa", album: "Álbum/EP", playlist: "Playlist", story: "Story" };

/** Limite do título por tipo (o mesmo do banco): faixa 200, álbum 120. */
export const MAX_TITULO: Record<"faixa" | "album", number> = { faixa: 200, album: 120 };

/** Título editado: trim, 1..max caracteres, sem quebras de linha. Inválido → null. */
export function parseTituloEnvio(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t.length >= 1 && t.length <= max ? t : null;
}

// ---------- Meus envios v2 (#125, item 4): status, números e duplicatas ----------

export type TomStatus = "ok" | "aviso" | "erro" | "neutro";
export type StatusEnvio = { rotulo: string; tom: TomStatus; motivo?: string; tentarDeNovo?: boolean; preparando?: boolean };

/** Chip de status da faixa: Publicada · Preparando áudio · Falhou (com motivo e "Tentar de novo"). */
export function statusFaixa(status: string, motivo?: string | null): StatusEnvio {
  if (status === "published") return { rotulo: "Publicada", tom: "ok" };
  if (status === "failed") return { rotulo: "Falhou", tom: "erro", motivo: motivo || undefined, tentarDeNovo: true };
  return { rotulo: "Preparando áudio", tom: "aviso", preparando: true };
}

/** Playlist: pública = Publicada; privada = Rascunho (só você vê). */
export function statusPlaylist(isPublic: boolean): StatusEnvio {
  return isPublic ? { rotulo: "Publicada", tom: "ok" } : { rotulo: "Rascunho", tom: "neutro" };
}

/** "1 reprodução", "2 salvamentos"… (pt-BR, milhar com ponto). */
export function contagem(n: number, singular: string, plural: string): string {
  const v = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return `${v.toLocaleString("pt-BR")} ${v === 1 ? singular : plural}`;
}

/** Linha de números de um envio, só com o que se aplica ao tipo. */
export function textoNumeros(tipo: TipoEnvio, n: { reproducoes?: number; salvamentos?: number; faixas?: number; visualizacoes?: number }): string {
  const partes: string[] = [];
  if (tipo === "album" && n.faixas !== undefined) partes.push(contagem(n.faixas, "faixa", "faixas"));
  if (tipo === "playlist" && n.faixas !== undefined) partes.push(contagem(n.faixas, "faixa", "faixas"));
  if (tipo === "faixa" || tipo === "album") partes.push(contagem(n.reproducoes ?? 0, "reprodução", "reproduções"));
  if (tipo === "faixa" || tipo === "playlist") partes.push(contagem(n.salvamentos ?? 0, "salvamento", "salvamentos"));
  if (tipo === "story") partes.push(contagem(n.visualizacoes ?? 0, "visualização", "visualizações"));
  return partes.join(" · ");
}

/** Título comparável: minúsculas, sem acentos, sem pontuação e espaços extras. */
export function normalizarTitulo(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type FaixaComparavel = { id: string; title: string; duration_sec: number | null };

/**
 * Possíveis duplicatas: mesmo título (normalizado) e mesma duração (±1 s). Faixas sem duração não entram
 * (ainda preparando). Cada grupo vem na ordem recebida (a lista chega da mais nova para a mais antiga).
 */
export function acharDuplicatas<T extends FaixaComparavel>(faixas: readonly T[]): T[][] {
  const porTitulo = new Map<string, T[]>();
  for (const f of faixas) {
    if (typeof f.duration_sec !== "number" || !Number.isFinite(f.duration_sec) || f.duration_sec <= 0) continue;
    const k = normalizarTitulo(f.title);
    if (!k) continue;
    porTitulo.set(k, [...(porTitulo.get(k) ?? []), f]);
  }
  const grupos: T[][] = [];
  for (const lista of porTitulo.values()) {
    const usados = new Set<string>();
    for (const a of lista) {
      if (usados.has(a.id)) continue;
      const g = lista.filter((b) => !usados.has(b.id) && Math.abs((b.duration_sec as number) - (a.duration_sec as number)) <= 1);
      if (g.length > 1) {
        g.forEach((b) => usados.add(b.id));
        grupos.push(g);
      }
    }
  }
  return grupos;
}

export const ABAS_ENVIOS = ["faixas", "albuns", "playlists", "stories"] as const;
export type AbaEnvios = (typeof ABAS_ENVIOS)[number];

export function isAbaEnvios(v: unknown): v is AbaEnvios {
  return typeof v === "string" && (ABAS_ENVIOS as readonly string[]).includes(v);
}
