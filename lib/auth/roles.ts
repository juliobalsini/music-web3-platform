export const SELF_SERVICE_ROLES = ["listener", "artist", "curator"] as const;
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

export function parseRole(value: unknown): SelfServiceRole | null {
  return typeof value === "string" && (SELF_SERVICE_ROLES as readonly string[]).includes(value)
    ? (value as SelfServiceRole)
    : null;
}

/** Aceita só caminhos internos ("/x"), evitando open redirect. */
export function safeNext(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** Cookie curto (httpOnly) com o destino pedido antes do login. */
export const NEXT_COOKIE = "radioon_next";

/** Caminho do login que lembra o destino; "/" não precisa ser lembrado. */
export function loginPath(destino: string): string {
  const next = safeNext(destino, "/");
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

/**
 * Papel no envio de música (#122): artista envia; ouvinte vira artista no 1º envio, sem tela de escolha;
 * playlister (curator) confirma antes, porque deixar o papel curator tira a Programação por horário.
 */
export type PapelNoEnvio = "envia" | "ativa" | "confirma";
export function papelNoEnvio(role: string | null | undefined): PapelNoEnvio {
  if (role === "artist") return "envia";
  if (role === "curator") return "confirma";
  return "ativa";
}
