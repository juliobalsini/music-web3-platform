export type AcaoMinhaRadio = { href: string; label: string; icone: "enviar" | "playlists" | "perfil"; destaque?: boolean };

/** Atalhos de papel dentro de "Minha rádio" (a navegação inferior só tem 3 abas). */
export function acoesMinhaRadio(role: string | null): AcaoMinhaRadio[] {
  if (role === "artist") return [{ href: "/enviar", label: "Enviar música", icone: "enviar", destaque: true }];
  if (role === "curator") return [{ href: "/curador", label: "Minhas playlists", icone: "playlists", destaque: true }];
  if (!role) return [{ href: "/onboarding", label: "Escolher perfil", icone: "perfil", destaque: true }];
  return [];
}

/** Filtros da Rádio e abas de listas (parâmetros de URL, renderizados no servidor). */
export const FILTROS = [
  { id: "tudo", label: "Tudo" },
  { id: "faixas", label: "Faixas" },
  { id: "playlists", label: "Playlists" },
  { id: "playlisters", label: "Playlisters" },
] as const;
export type Filtro = (typeof FILTROS)[number]["id"];

export const ABAS = [
  { id: "descobertas", label: "Descobertas" },
  { id: "alta", label: "Em alta" },
  { id: "novidades", label: "Novidades" },
] as const;
export type Aba = (typeof ABAS)[number]["id"];

export function lerFiltro(v: string | string[] | undefined): Filtro {
  const x = Array.isArray(v) ? v[0] : v;
  return FILTROS.find((f) => f.id === x)?.id ?? "tudo";
}
export function lerAba(v: string | string[] | undefined): Aba | null {
  const x = Array.isArray(v) ? v[0] : v;
  return ABAS.find((a) => a.id === x)?.id ?? null;
}
