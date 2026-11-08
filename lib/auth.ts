import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Usuário autenticado + papel (lido com RLS), ou null. */
export async function getSessionRole() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  return { userId: data.user.id, role: profile?.role ?? null, supabase };
}
