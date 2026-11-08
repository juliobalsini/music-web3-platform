import { isStorageConfigured, signPlayback } from "@/lib/storage/client";
import { PLAYBACK_TTL_SECONDS } from "@/lib/storage/rules";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// URL assinada (1 h) só para faixa publicada (RLS já filtra por status).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
  if (!isStorageConfigured()) {
    return Response.json({ error: "armazenamento indisponível" }, { status: 503, headers: noStore });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracks")
    .select("r2_key, duration_sec")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
  const url = await signPlayback(data.r2_key);
  return Response.json(
    {
      url,
      durationSec: data.duration_sec,
      expiresAt: Date.now() + PLAYBACK_TTL_SECONDS * 1000,
    },
    { headers: noStore },
  );
}
