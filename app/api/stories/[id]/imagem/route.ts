import { isUuid } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { isStorageConfigured, signCover } from "@/lib/storage/client";
import { chaveImagemStory } from "@/lib/stories/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

// O autor confirma que a imagem subiu; só então o story passa a ter imagem.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  const { data, error } = await createAdminClient()
    .from("stories")
    .update({ image_key: chaveImagemStory(sessao.userId, id) })
    .eq("id", id)
    .eq("author_id", sessao.userId)
    .select("id")
    .maybeSingle();
  if (error) return Response.json({ error: "falha" }, { status: 500, headers: noStore });
  if (!data) return Response.json({ error: "story não encontrado" }, { status: 404, headers: noStore });
  return Response.json({ ok: true }, { headers: noStore });
}

// Redireciona à imagem no bucket (URL assinada), guardada 15 min como as capas (cota diária).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const nao = () => new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  if (!isUuid(id) || !isStorageConfigured()) return nao();
  const { data } = await (await createClient()).from("stories").select("image_key").eq("id", id).eq("hidden", false).maybeSingle();
  if (!data?.image_key) return nao();
  return new Response(null, { status: 302, headers: { Location: await signCover(data.image_key), "Cache-Control": "public, max-age=900, s-maxage=900" } });
}
