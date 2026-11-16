/** Regras puras de "seguir" (sem servidor): quem pode seguir quem. */
export function podeSeguir(eu: string | null, alvo: string, plataforma: string | readonly string[]): boolean {
  const oficiais = typeof plataforma === "string" ? [plataforma] : plataforma;
  return !oficiais.includes(alvo) && eu !== alvo;
}

export type Seguido = { id: string; nome: string; desde: string };

type PerfilSeguido = { display_name: string | null; deleted_at?: string | null };

/** Linhas do Supabase (follows + profiles) → lista ordenada do mais recente, sem nomes vazios nem contas excluídas. */
export function paraSeguidos(linhas: { followed_id: string; created_at: string; profiles: PerfilSeguido | PerfilSeguido[] | null }[]): Seguido[] {
  return linhas
    .map((l) => ({ l, p: Array.isArray(l.profiles) ? l.profiles[0] : l.profiles }))
    .filter(({ p }) => !p?.deleted_at)
    .map(({ l, p }) => ({ id: l.followed_id, nome: p?.display_name?.trim() || "Perfil", desde: l.created_at }))
    .sort((a, b) => b.desde.localeCompare(a.desde));
}
