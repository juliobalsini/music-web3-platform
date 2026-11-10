"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { NEXT_COOKIE, parseEmail, safeNext } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { ok?: boolean; erro?: string; email?: string };

async function origemEDestino(form: FormData) {
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
  return { host, proto };
}

/** Login com Google via Supabase (precisa do provedor ligado no painel; ver relatório). */
export async function entrarComGoogle(form: FormData) {
  const { host, proto } = await origemEDestino(form);
  let url: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${proto}://${host}/auth/callback`, skipBrowserRedirect: true },
    });
    if (!error) url = data.url;
  } catch {
    /* cai no redirect de erro */
  }
  redirect(url ?? "/login?erro=google");
}

export async function enviarLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = parseEmail(form.get("email"));
  if (!email) return { erro: "Digite um e-mail válido." };
  const { host, proto } = await origemEDestino(form);
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
  return { ok: true, email };
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
