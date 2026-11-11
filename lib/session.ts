import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Sessão do Supabase (inclui visitante anônimo), ou null. */
export async function getSessaoAny() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    userId: data.user.id,
    anonimo: data.user.is_anonymous === true,
    role: profile?.role ?? null,
    supabase,
  };
}

/**
 * Usuário com conta (e-mail/Google) + papel, ou null. Visitante anônimo conta como
 * "sem login": enviar música, playlists e perfil exigem conta de verdade.
 */
export async function getSessionRole() {
  const s = await getSessaoAny();
  return s && !s.anonimo ? s : null;
}
