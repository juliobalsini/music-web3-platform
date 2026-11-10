"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { NEXT_COOKIE, parseEmail, safeNext } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { ok?: boolean; erro?: string };

export async function enviarLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = parseEmail(form.get("email"));
  if (!email) return { erro: "Digite um e-mail válido." };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  // Destino pós-login em cookie (não na URL do link: o Supabase só aceita redirects da allowlist).
  const destino = safeNext(form.get("next"), "");
  if (destino) {
    (await cookies()).set(NEXT_COOKIE, destino, {
      httpOnly: true,
      sameSite: "lax",
      secure: proto === "https",
      path: "/auth",
      maxAge: 60 * 60,
    });
  }
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
