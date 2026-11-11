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
    const options = { redirectTo: `${proto}://${host}/auth/callback`, skipBrowserRedirect: true };
    const { data: atual } = await supabase.auth.getUser();
    if (atual.user?.is_anonymous) {
      // Vincula o Google à sessão anônima (mantém pontos e histórico). Precisa de "manual linking" no painel.
      const { data, error } = await supabase.auth.linkIdentity({ provider: "google", options });
      if (!error) url = data.url;
    }
    if (!url) {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options });
      if (!error) url = data.url;
    }
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
    const emailRedirectTo = `${proto}://${host}/auth/callback`;
    const { data: atual } = await supabase.auth.getUser();
    let erro = null;
    if (atual.user?.is_anonymous) {
      // Converte a sessão anônima em conta (mesmo id: pontos e histórico ficam). E-mail já
      // cadastrado → cai no login normal (a sessão anônima é substituída pela conta existente).
      const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo });
      if (error) erro = (await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })).error;
    } else {
      erro = (await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })).error;
    }
    if (erro) return { erro: "Não foi possível enviar o link. Tente de novo em instantes." };
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
