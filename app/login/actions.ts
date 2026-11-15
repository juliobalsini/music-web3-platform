"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  CODIGO_TESTE_EXPIRADO,
  CODIGO_TESTE_OK,
  COOKIE_TESTE_CODIGO,
  mensagemErroCodigo,
  normalizarCodigo,
  parseTipoCodigo,
  type TipoCodigo,
} from "@/lib/auth/codigo";
import { COOKIE_TESTE_GIS, parseCredencialGoogle, TOKEN_TESTE_GOOGLE } from "@/lib/auth/google";
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

export type GoogleState = { erro?: string; entrou?: string };

/**
 * Google Identity Services (botão oficial / One Tap): o navegador manda o token de ID e o nonce cru; o Supabase
 * confere a assinatura, o público (Client ID) e o hash do nonce. Sessão anônima: tenta vincular o Google a ela
 * (mesmo id, pontos ficam); se a conta Google já existe, entra nela.
 */
export async function entrarComGoogleToken(token: string, nonce: string, next: string): Promise<GoogleState> {
  const cred = parseCredencialGoogle(token, nonce);
  if (!cred) return { erro: "Não foi possível entrar com Google. Tente de novo." };
  const destino = safeNext(next, "/");
  // Modo de teste do E2E (só fora de produção, com o cookie): não fala com o Supabase nem cria sessão.
  if (process.env.VERCEL_ENV !== "production" && (await cookies()).get(COOKIE_TESTE_GIS)?.value === "1") {
    return cred.token === TOKEN_TESTE_GOOGLE ? { entrou: destino } : { erro: "Não foi possível entrar com Google. Tente de novo ou use o e-mail." };
  }
  try {
    const supabase = await createClient();
    const { data: atual } = await supabase.auth.getUser();
    const credenciais = { provider: "google", token: cred.token, nonce: cred.nonce };
    if (atual.user?.is_anonymous) {
      const { error } = await supabase.auth.linkIdentity(credenciais);
      if (!error) return { entrou: destino };
    }
    const { error } = await supabase.auth.signInWithIdToken(credenciais);
    if (error) return { erro: "Não foi possível entrar com Google. Tente de novo ou use o e-mail." };
    return { entrou: destino };
  } catch {
    return { erro: "Login indisponível no momento." };
  }
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

/** `entrou`: destino interno para onde o cliente recarrega (página inteira, para todos os componentes lerem a sessão nova). */
export type CodigoState = { etapa?: "codigo"; email?: string; tipo?: TipoCodigo; enviadoEm?: number; erro?: string; entrou?: string };

/** Modo de teste do E2E: só fora de produção e com o cookie de teste; não fala com o Supabase nem cria sessão. */
async function modoTesteCodigo(): Promise<boolean> {
  if (process.env.VERCEL_ENV === "production") return false;
  return (await cookies()).get(COOKIE_TESTE_CODIGO)?.value === "1";
}

/** Envia o código de 6 dígitos (OTP sem link). Sessão anônima: troca de e-mail, mantendo o mesmo id. */
export async function enviarCodigo(_: CodigoState, form: FormData): Promise<CodigoState> {
  const email = parseEmail(form.get("email"));
  if (!email) return { erro: "Digite um e-mail válido." };
  if (await modoTesteCodigo()) return { etapa: "codigo", email, tipo: "email", enviadoEm: Date.now() };
  try {
    const supabase = await createClient();
    const { data: atual } = await supabase.auth.getUser();
    let tipo: TipoCodigo = "email";
    let erro = null;
    if (atual.user?.is_anonymous) {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) erro = (await supabase.auth.signInWithOtp({ email })).error;
      else tipo = "email_change";
    } else {
      erro = (await supabase.auth.signInWithOtp({ email })).error;
    }
    if (erro) {
      return { erro: erro.status === 429 ? "Muitos pedidos. Espere um minuto e tente de novo." : "Não foi possível enviar o código. Tente de novo em instantes." };
    }
    return { etapa: "codigo", email, tipo, enviadoEm: Date.now() };
  } catch {
    return { erro: "Login indisponível no momento." };
  }
}

/** Confere o código; certo → sessão nos cookies e o cliente volta ao ponto de origem. */
export async function verificarCodigo(_: CodigoState, form: FormData): Promise<CodigoState> {
  const email = parseEmail(form.get("email"));
  const tipo = parseTipoCodigo(form.get("tipo"));
  const token = normalizarCodigo(form.get("codigo"));
  const enviadoEm = Number(form.get("enviadoEm")) || Date.now();
  const base = { etapa: "codigo" as const, email: email ?? "", tipo, enviadoEm };
  if (!email) return { erro: "Digite um e-mail válido." };
  if (token.length !== 6) return { ...base, erro: "O código tem 6 dígitos." };
  const destino = safeNext(form.get("next"), "/");
  if (await modoTesteCodigo()) {
    if (token === CODIGO_TESTE_OK) return { ...base, entrou: destino };
    return { ...base, erro: mensagemErroCodigo(token === CODIGO_TESTE_EXPIRADO ? { code: "otp_expired" } : { code: "otp_invalid" }) };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: tipo });
    if (error) return { ...base, erro: mensagemErroCodigo(error) };
    return { ...base, entrou: destino };
  } catch {
    return { ...base, erro: "Login indisponível no momento." };
  }
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
