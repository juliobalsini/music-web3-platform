// Preferências da pessoa (Configurações). Regras puras: valores padrão, saneamento e mescla.
// Aparelho = localStorage; conta = tabela user_settings (escrita só pelo servidor).

/** Cores de destaque (tokens `--ds-destaque` em app/globals.css; âmbar é o padrão e não muda a logo). */
export const DESTAQUES = ["ambar", "azul", "verde", "rosa", "lilas"] as const;
export type Destaque = (typeof DESTAQUES)[number];

export type Preferencias = {
  /** Reprodução: volume parecido entre faixas (ganho só no player). */
  normalizar: boolean;
  /** Reprodução: ao fim da faixa, toca a próxima da fila. */
  continua: boolean;
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
  somStories: true,
  economia: false,
  perfilPublico: true,
  mostrarOuvindo: true,
  storyBio: true,
  destaque: "ambar",
  textoMaior: false,
  reduzirAnimacoes: false,
};

export const CHAVES = Object.keys(PADRAO) as (keyof Preferencias)[];

function ehDestaque(v: unknown): v is Destaque {
  return typeof v === "string" && (DESTAQUES as readonly string[]).includes(v);
}

/** Só as chaves conhecidas, com o tipo do padrão (destaque: só da lista); o resto é descartado (cliente ou banco). */
export function sanear(entrada: unknown): Partial<Preferencias> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return {};
  const o = entrada as Record<string, unknown>;
  const r: Record<string, unknown> = {};
  for (const k of CHAVES) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
    const v = o[k];
    if (k === "destaque" ? ehDestaque(v) : typeof v === "boolean") r[k] = v;
  }
  return r as Partial<Preferencias>;
}

/** Atributos aplicados em <html> pela aparência (lidos pelo CSS de app/globals.css). */
export function atributosAparencia(p: Pick<Preferencias, "destaque" | "textoMaior" | "reduzirAnimacoes">) {
  return {
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
