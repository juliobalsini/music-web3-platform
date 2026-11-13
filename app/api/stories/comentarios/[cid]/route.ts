import { isUuid } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// Apagar comentário (marca deleted_at; sem DELETE): o autor do comentário ou o dono do story.
export async function DELETE(_req: Request, ctx: { params: Promise<{ cid: string }> }) {
  const { cid } = await ctx.params;
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (!isUuid(cid)) return Response.json({ error: "comentário inválido" }, { status: 400, headers: noStore });
  try {
    const admin = createAdminClient();
    const { data: c } = await admin.from("story_comments").select("id,author_id,story_id").eq("id", cid).is("deleted_at", null).maybeSingle();
    if (!c) return Response.json({ error: "não encontrado" }, { status: 404, headers: noStore });
    let pode = c.author_id === sessao.userId;
    if (!pode) {
      const { data: st } = await admin.from("stories").select("author_id").eq("id", c.story_id).maybeSingle();
      pode = st?.author_id === sessao.userId;
    }
    if (!pode) return Response.json({ error: "sem permissão" }, { status: 403, headers: noStore });
    const { error } = await admin.from("story_comments").update({ deleted_at: new Date().toISOString() }).eq("id", cid);
    if (error) return Response.json({ error: "falha" }, { status: 500, headers: noStore });
    return Response.json({ ok: true }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
