import { isUuid } from "../playlists/rules.ts";

export type ProgramaInput = { title: string; playlistId: string; startHour: number; endHour: number };

/** Valida o formulário de programação: título 1–80, playlist, horas cheias com início < fim. */
export function parsePrograma(form: { get(nome: string): unknown }): ProgramaInput | null {
  const title = typeof form.get("titulo") === "string" ? (form.get("titulo") as string).trim() : "";
  const playlistId = form.get("playlist");
  const startHour = Number(form.get("inicio"));
  const endHour = Number(form.get("fim"));
  if (title.length < 1 || title.length > 80 || !isUuid(playlistId)) return null;
  if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) return null;
  if (startHour < 0 || startHour > 23 || endHour < 1 || endHour > 24 || endHour <= startHour) return null;
  return { title, playlistId, startHour, endHour };
}

/** Nota do playlister: até 280 caracteres; vazio apaga a nota. */
export function parseNota(valor: unknown): string | null | undefined {
  if (typeof valor !== "string") return undefined;
  const t = valor.trim();
  if (t.length > 280) return undefined;
  return t === "" ? null : t;
}
