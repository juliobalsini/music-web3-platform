export type AcaoMinhaRadio = { href: string; label: string; icone: "enviar" | "playlists" | "perfil"; destaque?: boolean };

/** Atalhos de papel dentro de "Minha rádio" (a navegação inferior só tem 3 abas). */
export function acoesMinhaRadio(role: string | null): AcaoMinhaRadio[] {
  if (role === "artist") return [{ href: "/enviar", label: "Enviar música", icone: "enviar", destaque: true }];
  if (role === "curator") return [{ href: "/curador", label: "Minhas playlists", icone: "playlists", destaque: true }];
  if (!role) return [{ href: "/onboarding", label: "Escolher perfil", icone: "perfil", destaque: true }];
  // Qualquer conta cria playlists (Perfil → Minhas playlists, botão +).
  return [];
}

/** Filtros da Rádio e abas de listas (estado no cliente; a URL só guarda o ponto de partida). */
export const FILTROS = [
  { id: "tudo", label: "Tudo" },
  { id: "faixas", label: "Faixas" },
  { id: "albuns", label: "Álbuns" },
  { id: "playlists", label: "Playlists" },
  { id: "stories", label: "Stories" },
] as const;
export type Filtro = (typeof FILTROS)[number]["id"];

/** Álbuns e Stories só aparecem quando há conteúdo. */
export function filtrosVisiveis(tem: { albuns: boolean; stories: boolean }) {
  return FILTROS.filter((f) => (f.id === "albuns" ? tem.albuns : f.id === "stories" ? tem.stories : true));
}

export const ABAS = [
  { id: "descobertas", label: "Descobertas" },
  { id: "alta", label: "Em alta" },
  { id: "novidades", label: "Novidades" },
] as const;
export type Aba = (typeof ABAS)[number]["id"];

/** Aba vizinha para o gesto de arrastar (sem dar a volta). */
export function abaVizinha(atual: Aba, passo: 1 | -1): Aba {
  const i = ABAS.findIndex((a) => a.id === atual);
  return ABAS[Math.min(ABAS.length - 1, Math.max(0, i + passo))].id;
}

/** Gesto horizontal: devolve +1 (próxima), -1 (anterior) ou 0. Exige deslocamento claro e mais horizontal que vertical. */
export function direcaoDoGesto(dx: number, dy: number, minimo = 50): 1 | -1 | 0 {
  if (Math.abs(dx) < minimo || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

export function lerFiltro(v: string | string[] | undefined): Filtro {
  const x = Array.isArray(v) ? v[0] : v;
  return FILTROS.find((f) => f.id === x)?.id ?? "tudo";
}
export function lerAba(v: string | string[] | undefined): Aba | null {
  const x = Array.isArray(v) ? v[0] : v;
  return ABAS.find((a) => a.id === x)?.id ?? null;
}
