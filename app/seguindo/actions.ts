"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loginPath } from "@/lib/auth/roles";
import { isUuid } from "@/lib/playlists/rules";
import { PLATAFORMA_ID } from "@/lib/radio/home";
import { podeSeguir } from "@/lib/seguir/rules";
import { getSessionRole } from "@/lib/session";

/** Segue ou deixa de seguir um perfil. Sem conta (ou sessão anônima): vai ao login e volta ao perfil. */
export async function alternarSeguir(formData: FormData) {
  const id = formData.get("id");
  if (!isUuid(id)) return;
  const sessao = await getSessionRole();
  if (!sessao) redirect(loginPath(`/perfil/${id}`));
  if (!podeSeguir(sessao.userId, id, PLATAFORMA_ID)) return;
  const { supabase, userId } = sessao;
  if (formData.get("seguir") === "1") {
    await supabase.from("follows").upsert({ follower_id: userId, followed_id: id }, { onConflict: "follower_id,followed_id", ignoreDuplicates: true });
  } else {
    await supabase.from("follows").delete().eq("follower_id", userId).eq("followed_id", id);
  }
  revalidatePath(`/perfil/${id}`);
  revalidatePath("/seguindo");
}
