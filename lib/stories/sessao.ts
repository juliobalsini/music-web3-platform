import "server-only";

import { getSessaoAny } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Sessão existente ou, se não houver, uma sessão anônima nova (como a escuta); `null` se o Supabase recusar. */
export async function sessaoOuAnonima() {
  const s = await getSessaoAny();
  if (s) return s;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) return null;
  return { userId: data.user.id, anonimo: true, role: null as string | null, supabase };
}
