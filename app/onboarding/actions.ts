"use server";

import { redirect } from "next/navigation";

import { parseRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Troca de perfil SOMENTE no servidor: o usuário vem da sessão, nunca do formulário.
export async function escolherPerfil(form: FormData) {
  const role = parseRole(form.get("role"));
  if (!role) redirect("/onboarding");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const nome = form.get("nome");
  const display_name =
    typeof nome === "string" && nome.trim() ? nome.trim().slice(0, 80) : undefined;
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ role, ...(display_name ? { display_name } : {}) })
    .eq("id", data.user.id);
  if (error) redirect("/onboarding?erro=1");
  redirect(role === "artist" ? "/enviar" : "/");
}
