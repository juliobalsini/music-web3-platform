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

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}
