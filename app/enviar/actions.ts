"use server";

import { redirect } from "next/navigation";

import { ativarArtista } from "@/lib/auth/ativar-artista";
import { getSessionRole } from "@/lib/session";

// Playlister que confirma "Usar como artista": troca de papel SOMENTE no servidor (o id vem da sessão).
export async function confirmarArtista() {
  const s = await getSessionRole();
  if (!s) redirect("/login?next=/enviar");
  const ok = await ativarArtista(s.userId, ["curator"]);
  redirect(ok ? "/enviar" : "/enviar?erro=1");
}
