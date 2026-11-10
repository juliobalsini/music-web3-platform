import { isUuid } from "@/lib/playlists/rules";
import { isStorageConfigured, signCover } from "@/lib/storage/client";
import { createClient } from "@/lib/supabase/server";

// Redireciona à capa no bucket (URL assinada). O redirecionamento é guardado por 15 min no
// navegador/CDN: uma lista inteira não gera uma assinatura por visita (cota diária do B2).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const nao = () => new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  if (!isUuid(id) || !isStorageConfigured()) return nao();
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracks")
    .select("cover_key")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!data?.cover_key) return nao();
  const url = await signCover(data.cover_key);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "public, max-age=900, s-maxage=900" },
  });
}
