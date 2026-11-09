export type ItemMenu = { href: string; label: string; icone: "entrar" | "enviar" | "metricas" | "playlists" | "perfil" | "pontos"; destaque?: boolean };

/** Itens do cabeçalho por estado de sessão/perfil. */
export function itensDoCabecalho(sessao: { role: string | null } | null): ItemMenu[] {
  if (!sessao) return [{ href: "/login", label: "Entrar", icone: "entrar", destaque: true }];
  const itens: ItemMenu[] = [];
  if (sessao.role === "artist") {
    itens.push(
      { href: "/enviar", label: "Enviar música", icone: "enviar", destaque: true },
      { href: "/metricas", label: "Métricas", icone: "metricas" },
    );
  } else if (sessao.role === "curator") {
    itens.push({ href: "/curador", label: "Playlists", icone: "playlists" });
  } else if (!sessao.role) {
    itens.push({ href: "/onboarding", label: "Escolher perfil", icone: "perfil", destaque: true });
  }
  itens.push({ href: "/pontos", label: "Pontos", icone: "pontos" });
  return itens;
}
