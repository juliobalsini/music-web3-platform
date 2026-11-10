"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isUuid, parseTitle } from "@/lib/playlists/rules";
import { parseNota, parsePrograma } from "@/lib/radio/programa";
import { getSessionRole } from "@/lib/session";

// Escrita com o cliente do usuário: o RLS garante que só o curador dono altera.
async function curador() {
  const s = await getSessionRole();
  if (!s) redirect("/login");
  if (s.role !== "curator") redirect("/onboarding");
  return s;
}

export async function criarPlaylist(form: FormData) {
  const { supabase, userId } = await curador();
  const title = parseTitle(form.get("titulo"));
  if (!title) redirect("/curador?erro=1");
  const { error } = await supabase.from("playlists").insert({ curator_id: userId, title, is_public: true });
  if (error) redirect("/curador?erro=1");
  revalidatePath("/curador");
  revalidatePath("/");
  redirect("/curador");
}

export async function adicionarFaixa(form: FormData) {
  const { supabase } = await curador();
  const playlistId = form.get("playlist");
  const trackId = form.get("faixa");
  if (!isUuid(playlistId) || !isUuid(trackId)) redirect("/curador?erro=1");
  const { data: ultima } = await supabase
    .from("playlist_tracks")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("playlist_tracks")
    .insert({ playlist_id: playlistId, track_id: trackId, position: (ultima?.position ?? -1) + 1 });
  if (error) redirect("/curador?erro=1");
  revalidatePath("/curador");
  revalidatePath("/");
  revalidatePath(`/playlist/${playlistId}`);
  redirect("/curador");
}

export async function removerFaixa(form: FormData) {
  const { supabase } = await curador();
  const playlistId = form.get("playlist");
  const trackId = form.get("faixa");
  if (!isUuid(playlistId) || !isUuid(trackId)) redirect("/curador?erro=1");
  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("track_id", trackId);
  if (error) redirect("/curador?erro=1");
  revalidatePath("/curador");
  revalidatePath("/");
  revalidatePath(`/playlist/${playlistId}`);
  redirect("/curador");
}

export async function salvarNota(form: FormData) {
  const { supabase } = await curador();
  const playlistId = form.get("playlist");
  const trackId = form.get("faixa");
  const nota = parseNota(form.get("nota"));
  if (!isUuid(playlistId) || !isUuid(trackId) || nota === undefined) redirect("/curador?erro=1");
  const { error } = await supabase
    .from("playlist_tracks")
    .update({ note: nota })
    .eq("playlist_id", playlistId)
    .eq("track_id", trackId);
  if (error) redirect("/curador?erro=1");
  revalidatePath("/");
  revalidatePath(`/playlist/${playlistId}`);
  redirect("/curador");
}

export async function criarPrograma(form: FormData) {
  const { supabase, userId } = await curador();
  const p = parsePrograma(form);
  if (!p) redirect("/curador?erro=1");
  const { error } = await supabase.from("programs").insert({
    curator_id: userId,
    playlist_id: p.playlistId,
    title: p.title,
    start_hour: p.startHour,
    end_hour: p.endHour,
  });
  if (error) redirect("/curador?erro=1");
  revalidatePath("/");
  redirect("/curador");
}

export async function removerPrograma(form: FormData) {
  const { supabase, userId } = await curador();
  const id = form.get("programa");
  if (!isUuid(id)) redirect("/curador?erro=1");
  const { error } = await supabase.from("programs").delete().eq("id", id).eq("curator_id", userId);
  if (error) redirect("/curador?erro=1");
  revalidatePath("/");
  redirect("/curador");
}
