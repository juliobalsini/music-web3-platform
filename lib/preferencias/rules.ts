// Preferências da pessoa (Configurações). Regras puras: valores padrão, saneamento e mescla.
// Aparelho = localStorage; conta = tabela user_settings (escrita só pelo servidor).

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
};

export const PADRAO: Preferencias = {
  normalizar: true,
  continua: true,
  somStories: true,
  economia: false,
  perfilPublico: true,
  mostrarOuvindo: true,
};

export const CHAVES = Object.keys(PADRAO) as (keyof Preferencias)[];

/** Só as chaves conhecidas e booleanas; o resto é descartado (entrada do cliente ou do banco). */
export function sanear(entrada: unknown): Partial<Preferencias> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return {};
  const o = entrada as Record<string, unknown>;
  const r: Partial<Preferencias> = {};
  for (const k of CHAVES) if (typeof o[k] === "boolean") r[k] = o[k] as boolean;
  return r;
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
