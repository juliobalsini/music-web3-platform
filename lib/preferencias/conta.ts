import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { emailAnonimo, mesclar, NOME_EXCLUIDA, sanear, type Preferencias } from "./rules";

type Cliente = { from: ReturnType<typeof createAdminClient>["from"] };

/** Preferências salvas na conta (leitura com a sessão da própria pessoa; a RLS só devolve as dela). */
export async function lerPreferenciasConta(supabase: Cliente, userId: string): Promise<Partial<Preferencias>> {
  const { data } = await supabase.from("user_settings").select("prefs").eq("user_id", userId).maybeSingle();
  return sanear((data as { prefs?: unknown } | null)?.prefs);
}

/** Grava (mescla) as preferências da conta. Só o servidor escreve; o dono vem da sessão. */
export async function salvarPreferenciasConta(userId: string, parcial: unknown): Promise<Preferencias | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("user_settings").select("prefs").eq("user_id", userId).maybeSingle();
  const prefs = mesclar((data as { prefs?: unknown } | null)?.prefs, parcial);
  const { error } = await admin.from("user_settings").upsert({ user_id: userId, prefs, updated_at: new Date().toISOString() });
  return error ? null : prefs;
}

/** Perfil privado? Lido pelo servidor para quem visita /perfil/[id] (preferência não é pública). */
export async function perfilEhPublico(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("user_settings").select("prefs").eq("user_id", userId).maybeSingle();
    return mesclar((data as { prefs?: unknown } | null)?.prefs).perfilPublico;
  } catch {
    return true; // sem service_role (prévias): comportamento de antes
  }
}

export type ResultadoConta = { ok: true } | { ok: false; erro: string };

/**
 * Excluir conta (lógica, sem DELETE): 1) anonimiza o login (e-mail substituto, metadados limpos, acesso
 * bloqueado) — se falhar, nada mais muda; 2) marca deleted_at em todo o conteúdo ainda visível;
 * 3) perfil vira "Conta excluída" e privado. Pontos (append-only) e escutas ficam, sem dado pessoal.
 */
export async function excluirConta(userId: string): Promise<ResultadoConta> {
  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const { error: eAuth } = await admin.auth.admin.updateUserById(userId, {
    email: emailAnonimo(userId),
    email_confirm: true,
    user_metadata: { full_name: null, name: null, avatar_url: null, picture: null, display_name: null },
    ban_duration: "876000h",
  });
  if (eAuth) {
    console.error("[conta] anonimizar login:", eAuth.message);
    return { ok: false, erro: "Não foi possível excluir agora. Tente de novo." };
  }
  const conteudo: [string, string][] = [
    ["tracks", "artist_id"],
    ["albums", "artist_id"],
    ["playlists", "curator_id"],
    ["stories", "author_id"],
  ];
  for (const [tabela, dono] of conteudo) {
    const { error } = await admin.from(tabela).update({ deleted_at: agora }).eq(dono, userId).is("deleted_at", null);
    if (error) console.error(`[conta] ocultar ${tabela}:`, error.message);
  }
  const { error: eP } = await admin.from("profiles").update({ display_name: NOME_EXCLUIDA, deleted_at: agora }).eq("id", userId);
  if (eP) console.error("[conta] perfil:", eP.message);
  await admin.from("user_settings").upsert({ user_id: userId, prefs: { perfilPublico: false, mostrarOuvindo: false }, updated_at: agora });
  return { ok: true };
}
