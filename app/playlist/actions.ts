"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid, MIN_FAIXAS_PUBLICAR, parseCreateKey, parseDescricao, parseTitle, podePublicar, tituloPadrao } from "@/lib/playlists/rules";
import { loginPath } from "@/lib/auth/roles";
import { getSessionRole } from "@/lib/session";

async function conta() {
  const s = await getSessionRole();
  if (!s) redirect(loginPath("/playlist/nova"));
  return s;
}

export type Resultado = { ok: true } | { ok: false; erro: string };

/**
 * Cria (ou reaproveita) o rascunho privado. Idempotente: a mesma `chave` nunca gera duas playlists
 * (índice único por conta); toque repetido cai no rascunho já criado.
 */
export async function criarRascunho(chave: string) {
  const { supabase, userId } = await conta();
  const key = parseCreateKey(chave);
  if (!key) redirect("/biblioteca");
  const { data: existente } = await supabase.from("playlists").select("id").eq("curator_id", userId).eq("create_key", key).maybeSingle();
  if (existente) redirect(`/playlist/${existente.id}`);
  const { count } = await supabase.from("playlists").select("id", { count: "exact", head: true }).eq("curator_id", userId);
  const { data, error } = await supabase
    .from("playlists")
    .insert({ curator_id: userId, title: tituloPadrao(count ?? 0), is_public: false, create_key: key })
    .select("id")
    .single();
  if (error || !data) {
    // Corrida entre dois toques: o índice único barrou o segundo; reaproveita o primeiro.
    const { data: de } = await supabase.from("playlists").select("id").eq("curator_id", userId).eq("create_key", key).maybeSingle();
    if (de) redirect(`/playlist/${de.id}`);
    redirect("/biblioteca?erro=1");
  }
  redirect(`/playlist/${data.id}`);
}

/** Salvamento automático de título e descrição (RLS: só o dono altera). */
export async function salvarDetalhes(id: string, titulo: string, descricao: string): Promise<Resultado> {
  const { supabase, userId } = await conta();
  const title = parseTitle(titulo);
  const description = parseDescricao(descricao);
  if (!isUuid(id) || !title || description === undefined) return { ok: false, erro: "Confira o título e a descrição." };
  const { error } = await supabase.from("playlists").update({ title, description }).eq("id", id).eq("curator_id", userId);
  if (error) return { ok: false, erro: "Não foi possível salvar agora." };
  revalidatePath(`/playlist/${id}`);
  return { ok: true };
}

async function donoDe(id: string) {
  const { supabase, userId } = await conta();
  if (!isUuid(id)) return null;
  const { data } = await supabase.from("playlists").select("id,is_public").eq("id", id).eq("curator_id", userId).maybeSingle();
  return data ? { supabase, userId, publica: !!data.is_public } : null;
}

export async function adicionarFaixaA(id: string, trackId: string): Promise<Resultado> {
  const d = await donoDe(id);
  if (!d || !isUuid(trackId)) return { ok: false, erro: "Playlist não encontrada." };
  const { data: ultima } = await d.supabase.from("playlist_tracks").select("position").eq("playlist_id", id).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await d.supabase.from("playlist_tracks").insert({ playlist_id: id, track_id: trackId, position: (ultima?.position ?? -1) + 1 });
  // 23505 = já está na playlist: tratar como sucesso (toque repetido).
  if (error && error.code !== "23505") return { ok: false, erro: "Não foi possível adicionar." };
  revalidatePath(`/playlist/${id}`);
  return { ok: true };
}

export async function removerFaixaDe(id: string, trackId: string): Promise<Resultado> {
  const d = await donoDe(id);
  if (!d || !isUuid(trackId)) return { ok: false, erro: "Playlist não encontrada." };
  const { error } = await d.supabase.from("playlist_tracks").delete().eq("playlist_id", id).eq("track_id", trackId);
  if (error) return { ok: false, erro: "Não foi possível remover." };
  revalidatePath(`/playlist/${id}`);
  return { ok: true };
}

/** Reordena: recebe a ordem final de ids. Posições são regravadas por RLS (o dono tem UPDATE em `position`). */
export async function reordenarFaixas(id: string, ordem: string[]): Promise<Resultado> {
  const d = await donoDe(id);
  if (!d || !ordem.every(isUuid)) return { ok: false, erro: "Playlist não encontrada." };
  const { data } = await d.supabase.from("playlist_tracks").select("track_id,position").eq("playlist_id", id);
  const atuais = new Set((data ?? []).map((r) => r.track_id as string));
  if (ordem.length !== atuais.size || !ordem.every((t) => atuais.has(t))) return { ok: false, erro: "Lista desatualizada." };
  // A unicidade (playlist_id, position) é adiada até o fim da transação, mas cada update é uma instrução:
  // passa por posições altas livres e depois grava as finais.
  const base = Math.max(-1, ...(data ?? []).map((r) => r.position as number)) + 1;
  for (let i = 0; i < ordem.length; i++) {
    const { error } = await d.supabase.from("playlist_tracks").update({ position: base + i }).eq("playlist_id", id).eq("track_id", ordem[i]);
    if (error) return { ok: false, erro: "Não foi possível reordenar." };
  }
  for (let i = 0; i < ordem.length; i++) {
    const { error } = await d.supabase.from("playlist_tracks").update({ position: i }).eq("playlist_id", id).eq("track_id", ordem[i]);
    if (error) return { ok: false, erro: "Não foi possível reordenar." };
  }
  revalidatePath(`/playlist/${id}`);
  return { ok: true };
}

export async function publicar(id: string): Promise<Resultado> {
  const d = await donoDe(id);
  if (!d) return { ok: false, erro: "Playlist não encontrada." };
  const { count } = await d.supabase.from("playlist_tracks").select("track_id", { count: "exact", head: true }).eq("playlist_id", id);
  if (!podePublicar(count ?? 0)) return { ok: false, erro: `Adicione pelo menos ${MIN_FAIXAS_PUBLICAR} faixas para publicar.` };
  const { error } = await d.supabase.from("playlists").update({ is_public: true, published_at: new Date().toISOString() }).eq("id", id).eq("curator_id", d.userId);
  if (error) return { ok: false, erro: "Não foi possível publicar." };
  revalidatePath(`/playlist/${id}`);
  revalidatePath("/");
  revalidatePath("/explorar");
  revalidatePath("/biblioteca");
  return { ok: true };
}

export async function apagarPlaylist(id: string) {
  const d = await donoDe(id);
  if (!d) redirect("/biblioteca");
  await d.supabase.from("playlists").delete().eq("id", id).eq("curator_id", d.userId);
  revalidatePath("/");
  revalidatePath("/biblioteca");
  redirect("/biblioteca");
}

/** Salvar/Remover dos salvos (só conta; anônimo é barrado por RLS restritiva). */
export async function alternarSalvar(id: string): Promise<Resultado & { salva?: boolean }> {
  const { supabase, userId } = await conta();
  if (!isUuid(id)) return { ok: false, erro: "Playlist não encontrada." };
  const { data: ja } = await supabase.from("playlist_saves").select("playlist_id").eq("playlist_id", id).eq("user_id", userId).maybeSingle();
  if (ja) {
    const { error } = await supabase.from("playlist_saves").delete().eq("playlist_id", id).eq("user_id", userId);
    return error ? { ok: false, erro: "Não foi possível remover." } : { ok: true, salva: false };
  }
  const { error } = await supabase.from("playlist_saves").insert({ playlist_id: id, user_id: userId });
  return error ? { ok: false, erro: "Não foi possível salvar." } : { ok: true, salva: true };
}
