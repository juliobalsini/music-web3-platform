"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { parseEmail } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { ok?: boolean; erro?: string };

export async function enviarLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = parseEmail(form.get("email"));
  if (!email) return { erro: "Digite um e-mail válido." };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${proto}://${host}/auth/callback` },
    });
    if (error) return { erro: "Não foi possível enviar o link. Tente de novo em instantes." };
  } catch {
    return { erro: "Login indisponível no momento." };
  }
  return { ok: true };
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
