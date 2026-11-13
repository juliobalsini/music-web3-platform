import { isUuid } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { LIMITE_DENUNCIAS_COMENTARIO } from "@/lib/stories/moderacao";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// Denúncia de comentário: só contas, uma por conta; com 3 denunciantes distintos o comentário é ocultado.
export async function POST(_req: Request, ctx: { params: Promise<{ cid: string }> }) {
  const { cid } = await ctx.params;
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (!isUuid(cid)) return Response.json({ error: "comentário inválido" }, { status: 400, headers: noStore });
  try {
    const admin = createAdminClient();
    const { data: c } = await admin.from("story_comments").select("id,author_id").eq("id", cid).maybeSingle();
    if (!c) return Response.json({ error: "não encontrado" }, { status: 404, headers: noStore });
    if (c.author_id === sessao.userId) return Response.json({ error: "não é possível denunciar o próprio comentário" }, { status: 400, headers: noStore });
    const { error } = await admin.from("story_comment_reports").upsert({ comment_id: cid, reporter_id: sessao.userId }, { onConflict: "comment_id,reporter_id", ignoreDuplicates: true });
    if (error) return Response.json({ error: "falha" }, { status: 500, headers: noStore });
    const { count } = await admin.from("story_comment_reports").select("reporter_id", { count: "exact", head: true }).eq("comment_id", cid);
    const oculto = (count ?? 0) >= LIMITE_DENUNCIAS_COMENTARIO;
    if (oculto) await admin.from("story_comments").update({ hidden: true }).eq("id", cid);
    return Response.json({ ok: true, oculto }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
