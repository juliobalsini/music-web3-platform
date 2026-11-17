// Preferências da pessoa (Configurações). Regras puras: valores padrão, saneamento e mescla.
// Aparelho = localStorage; conta = tabela user_settings (escrita só pelo servidor).

import { GENEROS, type GeneroId } from "../radio/generos.ts";

/** Cores de destaque (tokens `--ds-destaque` em app/globals.css; âmbar é o padrão e não muda a logo). */
export const DESTAQUES = ["ambar", "azul", "verde", "rosa", "lilas"] as const;
export type Destaque = (typeof DESTAQUES)[number];

/** Tema: escuro (padrão, marca marinho), claro ou automático (segue o sistema). */
export const TEMAS = ["escuro", "claro", "auto"] as const;
export type Tema = (typeof TEMAS)[number];

/** Equalizador do player: predefinições fechadas (3 bandas). "plano" é o padrão e não liga o Web Audio. */
export const EQS = ["plano", "graves", "voz", "agudos"] as const;
export type Eq = (typeof EQS)[number];

/** Frequências das 3 bandas (Hz): prateleira grave, pico médio (Q 0,9) e prateleira aguda. */
export const FREQ_EQ = { grave: 120, medio: 1000, agudo: 8000 } as const;

/** Ganho (dB) de cada banda por predefinição. Reforços moderados (≤ +5 dB); o limitador do player evita clipping. */
export const BANDAS_EQ: Record<Eq, { grave: number; medio: number; agudo: number }> = {
  plano: { grave: 0, medio: 0, agudo: 0 },
  graves: { grave: 5, medio: 0, agudo: -1 },
  voz: { grave: -2, medio: 3, agudo: 1 },
  agudos: { grave: -1, medio: 0, agudo: 4 },
};

/** Pré-ganho (dB) que compensa metade do maior reforço: menos trabalho para o limitador, volume parecido. */
export function preGanhoEq(eq: Eq): number {
  const b = BANDAS_EQ[eq];
  return -Math.max(0, b.grave, b.medio, b.agudo) / 2;
}

/** Seus gostos: até 5 gêneros da lista fixa ("outro" não conta como gosto). */
export const MAX_GOSTOS = 5;
export const GENEROS_GOSTO = GENEROS.filter((g) => g.id !== "outro").map((g) => g.id) as GeneroId[];

/** Lista de gostos saneada: só ids conhecidos, sem repetição, na ordem escolhida, no máx. 5; não-lista → null. */
export function sanearGostos(v: unknown): GeneroId[] | null {
  if (!Array.isArray(v)) return null;
  const r: GeneroId[] = [];
  for (const x of v) if (typeof x === "string" && (GENEROS_GOSTO as string[]).includes(x) && !r.includes(x as GeneroId)) r.push(x as GeneroId);
  return r.slice(0, MAX_GOSTOS);
}

export type Preferencias = {
  /** Reprodução: volume parecido entre faixas (ganho só no player). */
  normalizar: boolean;
  /** Reprodução: ao fim da faixa, toca a próxima da fila. */
  continua: boolean;
  /** Reprodução: equalizador (predefinição; só com o áudio do proxy, que responde CORS). */
  eq: Eq;
  /** Reprodução: stories abrem com som. */
  somStories: boolean;
  /** Dados: não pré-carrega o próximo story nem baixa o áudio de story antes de pedir som. */
  economia: boolean;
  /** Privacidade: página de perfil visível a outras pessoas. */
  perfilPublico: boolean;
  /** Privacidade: outras pessoas podem ver o que estou ouvindo (quando houver tela que mostre). */
  mostrarOuvindo: boolean;
  /** Artista: story de bio automático visível na Home e no Explorar. */
  storyBio: boolean;
  /** Seus gostos: gêneros preferidos (a Home mostra as seleções deles primeiro). */
  gostos: GeneroId[];
  /** Aparência: tema escuro, claro ou do sistema. */
  tema: Tema;
  /** Aparência: cor de destaque (botões, play, aba ativa, foco). */
  destaque: Destaque;
  /** Aparência: texto um pouco maior em todo o app. */
  textoMaior: boolean;
  /** Aparência: corta animações e transições (além do "reduzir movimento" do sistema). */
  reduzirAnimacoes: boolean;
};

export const PADRAO: Preferencias = {
  normalizar: true,
  continua: true,
  eq: "plano",
  somStories: true,
  economia: false,
  perfilPublico: true,
  mostrarOuvindo: true,
  storyBio: true,
  gostos: [],
  tema: "escuro",
  destaque: "ambar",
  textoMaior: false,
  reduzirAnimacoes: false,
};

export const CHAVES = Object.keys(PADRAO) as (keyof Preferencias)[];

function ehDestaque(v: unknown): v is Destaque {
  return typeof v === "string" && (DESTAQUES as readonly string[]).includes(v);
}

function ehTema(v: unknown): v is Tema {
  return typeof v === "string" && (TEMAS as readonly string[]).includes(v);
}

function ehEq(v: unknown): v is Eq {
  return typeof v === "string" && (EQS as readonly string[]).includes(v);
}

/** Validador por chave de lista fechada; as demais são booleanas. */
const LISTAS: Partial<Record<keyof Preferencias, (v: unknown) => boolean>> = { destaque: ehDestaque, tema: ehTema, eq: ehEq };

/** Só as chaves conhecidas, com o tipo do padrão (destaque, tema e eq: só da lista; gostos: lista saneada); o resto é descartado (cliente ou banco). */
export function sanear(entrada: unknown): Partial<Preferencias> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return {};
  const o = entrada as Record<string, unknown>;
  const r: Record<string, unknown> = {};
  for (const k of CHAVES) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
    const v = o[k];
    if (k === "gostos") {
      const g = sanearGostos(v);
      if (g) r[k] = g;
      continue;
    }
    const valido = LISTAS[k];
    if (valido ? valido(v) : typeof v === "boolean") r[k] = v;
  }
  return r as Partial<Preferencias>;
}

/** Tema efetivo: "auto" segue o sistema (`prefers-color-scheme: light`). */
export function temaClaro(tema: Tema, sistemaClaro: boolean): boolean {
  return tema === "claro" || (tema === "auto" && sistemaClaro);
}

/** Cor da barra do navegador (meta theme-color) para cada tema: o fundo da página. */
export const COR_BARRA = { escuro: "#00112a", claro: "#f6f8fc" } as const;

/** Atributos aplicados em <html> pela aparência (lidos pelo CSS de app/globals.css). */
export function atributosAparencia(
  p: Pick<Preferencias, "tema" | "destaque" | "textoMaior" | "reduzirAnimacoes">,
  sistemaClaro = false,
) {
  return {
    "data-tema": temaClaro(p.tema, sistemaClaro) ? "claro" : null,
    "data-destaque": p.destaque === "ambar" ? null : p.destaque,
    "data-texto": p.textoMaior ? "maior" : null,
    "data-movimento": p.reduzirAnimacoes ? "reduzido" : null,
  } as const;
}

/** Padrão ← parcial(is), da esquerda para a direita (a última vence). */
export function mesclar(...partes: unknown[]): Preferencias {
  return Object.assign({}, PADRAO, ...partes.map(sanear));
}

/** Confirmação final de "Excluir conta": a pessoa digita EXCLUIR (sem diferenciar maiúsculas). */
export const PALAVRA_EXCLUIR = "EXCLUIR";
export function confirmouExclusao(texto: unknown): boolean {
  return typeof texto === "string" && texto.trim().toUpperCase() === PALAVRA_EXCLUIR;
}

/** Nome exibido: trim, espaços colapsados, 1–80 caracteres (mesma checagem do banco). */
export function parseNome(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s.length >= 1 && s.length <= 80 ? s : null;
}

/** E-mail: forma simples (o Supabase confirma por link no endereço novo). */
export function parseEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}

export const NOME_EXCLUIDA = "Conta excluída";

/** E-mail substituto da conta excluída (anonimização; domínio reservado, nunca entrega). */
export function emailAnonimo(userId: string): string {
  return `excluida-${userId}@radioon.invalid`;
}
