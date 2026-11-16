import "server-only";

import { catalogoMudou } from "@/lib/radio/cache-catalogo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ativa o perfil de artista da conta (troca de papel SOMENTE no servidor; o id vem da sessão).
 * `de`: papéis aceitos na troca — ouvinte no 1º envio; "curator" só depois da confirmação explícita.
 * Devolve true se a conta é artista ao final.
 */
export async function ativarArtista(userId: string, de: readonly ("listener" | "curator")[] = ["listener"]): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role: "artist" }).eq("id", userId).in("role", [...de]);
  if (error) return false;
  const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (data?.role !== "artist") return false;
  catalogoMudou();
  return true;
}
