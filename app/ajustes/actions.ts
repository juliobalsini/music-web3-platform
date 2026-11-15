"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { excluirConta, salvarPreferenciasConta } from "@/lib/preferencias/conta";
import { confirmouExclusao, parseEmail, parseNome, sanear, type Preferencias } from "@/lib/preferencias/rules";
import { catalogoMudou } from "@/lib/radio/cache-catalogo";
import { getSessionRole } from "@/lib/session";
import { fotoSegura, parseBio } from "@/lib/stories/bio";
import { createAdminClient } from "@/lib/supabase/admin";

export type Resultado = { ok: true; aviso?: string } | { ok: false; erro: string };

const SEM_CONTA: Resultado = { ok: false, erro: "Entre na sua conta para continuar." };

/** Salva preferências na conta (visitante guarda só no aparelho e nem chama isto). */
export async function salvarPreferencias(parcial: Partial<Preferencias>): Promise<Resultado> {
  const s = await getSessionRole();
  if (!s) return SEM_CONTA;
  const limpo = sanear(parcial);
  if (Object.keys(limpo).length === 0) return { ok: false, erro: "Ajuste inválido." };
  try {
    const r = await salvarPreferenciasConta(s.userId, limpo);
    if (!r) return { ok: false, erro: "Não foi possível salvar na conta. Vale neste aparelho." };
    if ("perfilPublico" in limpo) revalidatePath(`/perfil/${s.userId}`);
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível salvar na conta. Vale neste aparelho." };
  }
}

/** Nome exibido (a RLS já permite ao dono só a coluna display_name; aqui vai pela sessão dele). */
export async function salvarNome(_: Resultado | null, form: FormData): Promise<Resultado> {
  const s = await getSessionRole();
  if (!s) return SEM_CONTA;
  const nome = parseNome(form.get("nome"));
  if (!nome) return { ok: false, erro: "Use de 1 a 80 caracteres." };
  const { error } = await s.supabase.from("profiles").update({ display_name: nome }).eq("id", s.userId);
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  catalogoMudou();
  revalidatePath("/", "layout");
  return { ok: true, aviso: "Nome salvo." };
}

/**
 * Perfil de artista (story de bio): frase e foto pública. Só artistas; a foto vem da conta Google lida no servidor
 * (nunca de um valor enviado pelo cliente). Grava com service_role: o cliente só tem grant em display_name.
 */
export async function salvarPerfilArtista(_: Resultado | null, form: FormData): Promise<Resultado> {
  const s = await getSessionRole();
  if (!s) return SEM_CONTA;
  if (s.role !== "artist") return { ok: false, erro: "Só perfis de artista têm story de bio." };
  const bio = parseBio(form.get("bio"));
  if (bio === undefined) return { ok: false, erro: "Use até 140 caracteres na frase." };
  let foto: string | null = null;
  if (form.get("foto") === "1") {
    const { data } = await s.supabase.auth.getUser();
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    foto = fotoSegura(typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null);
    if (!foto) return { ok: false, erro: "Sua conta não tem foto do Google para usar." };
  }
  try {
    const { error } = await createAdminClient().from("profiles").update({ bio, avatar_url: foto }).eq("id", s.userId);
    if (error) return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  } catch {
    return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  }
  catalogoMudou();
  revalidatePath("/", "layout");
  return { ok: true, aviso: foto ? "Perfil salvo. Seu story de bio já está no ar." : "Perfil salvo. Com uma foto, seu story de bio entra no ar." };
}

/** Troca de e-mail: o Supabase manda um link de confirmação ao endereço novo. */
export async function trocarEmail(_: Resultado | null, form: FormData): Promise<Resultado> {
  const s = await getSessionRole();
  if (!s) return SEM_CONTA;
  const email = parseEmail(form.get("email"));
  if (!email) return { ok: false, erro: "Confira o e-mail." };
  const { error } = await s.supabase.auth.updateUser({ email });
  if (error) return { ok: false, erro: "Não foi possível trocar agora. Tente mais tarde." };
  return { ok: true, aviso: "Enviamos um link ao e-mail novo. A troca vale depois de confirmar." };
}

/** Excluir conta: só com a palavra de confirmação; depois encerra a sessão. */
export async function excluir(_: Resultado | null, form: FormData): Promise<Resultado> {
  const s = await getSessionRole();
  if (!s) return SEM_CONTA;
  if (!confirmouExclusao(form.get("confirmacao"))) return { ok: false, erro: "Digite EXCLUIR para confirmar." };
  try {
    const r = await excluirConta(s.userId);
    if (!r.ok) return r;
  } catch {
    return { ok: false, erro: "Não foi possível excluir agora. Tente de novo." };
  }
  await s.supabase.auth.signOut();
  catalogoMudou();
  revalidatePath("/", "layout");
  redirect("/");
}
