/** Regras puras de "seguir" (sem servidor): quem pode seguir quem. */
export function podeSeguir(eu: string | null, alvo: string, plataforma: string): boolean {
  return alvo !== plataforma && eu !== alvo;
}

export type Seguido = { id: string; nome: string; desde: string };

/** Linhas do Supabase (follows + profiles) → lista ordenada do mais recente, sem nomes vazios. */
export function paraSeguidos(linhas: { followed_id: string; created_at: string; profiles: { display_name: string | null } | { display_name: string | null }[] | null }[]): Seguido[] {
  return linhas
    .map((l) => {
      const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
      return { id: l.followed_id, nome: p?.display_name?.trim() || "Perfil", desde: l.created_at };
    })
    .sort((a, b) => b.desde.localeCompare(a.desde));
}
