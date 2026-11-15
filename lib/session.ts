import "server-only";

import { lerPreferenciasConta } from "@/lib/preferencias/conta";
import type { Preferencias } from "@/lib/preferencias/rules";
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

/** `prefs`: preferências salvas na conta (aplicadas no aparelho ao abrir o app). */
export type ResumoConta = { logado: boolean; nome: string | null; foto: string | null; prefs?: Partial<Preferencias> };

/** Dados para a gaveta do menu: só conta de verdade (visitante anônimo = não logado). */
export async function getResumoConta(): Promise<ResumoConta> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u || u.is_anonymous) return { logado: false, nome: null, foto: null };
  const [{ data: perfil }, prefs] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", u.id).maybeSingle(),
    lerPreferenciasConta(supabase, u.id).catch(() => ({})),
  ]);
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const nome = perfil?.display_name || (typeof meta.full_name === "string" ? meta.full_name : null) || u.email?.split("@")[0] || null;
  const foto = typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("https://") ? meta.avatar_url : null;
  return { logado: true, nome, foto, prefs };
}
