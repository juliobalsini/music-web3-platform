import "server-only";

import { objetoExiste, isStorageConfigured } from "@/lib/storage/client";
import { TRAVADA_APOS_MIN } from "@/lib/storage/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { decidirTravada } from "./envios";

/**
 * Faz toda faixa "processing" do artista terminar: com o arquivo no bucket é publicada; sem ele, vira "failed"
 * com o motivo. Só olha faixas travadas (> TRAVADA_APOS_MIN) e no máx. 10 por chamada (1 HEAD cada). Não apaga nada.
 */
export async function reconciliarEnvios(artistId: string): Promise<void> {
  if (!isStorageConfigured()) return;
  const admin = createAdminClient();
  const limite = new Date(Date.now() - TRAVADA_APOS_MIN * 60_000).toISOString();
  const { data } = await admin
    .from("tracks")
    .select("id,r2_key,rights_confirmed")
    .eq("artist_id", artistId)
    .eq("status", "processing")
    .lt("created_at", limite)
    .limit(10);
  for (const t of data ?? []) {
    let existe: boolean | null = null;
    try {
      existe = await objetoExiste(t.r2_key as string);
    } catch {
      existe = null; // bucket indisponível/cota: tenta na próxima visita
    }
    const d = decidirTravada(existe, !!t.rights_confirmed);
    if (d.acao === "aguardar") continue;
    const patch = d.acao === "publicar" ? { status: "published" as const, failure_reason: null } : { status: "failed" as never, failure_reason: d.motivo };
    await admin.from("tracks").update(patch).eq("id", t.id).eq("status", "processing");
  }
}
