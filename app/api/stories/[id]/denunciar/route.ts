import { isUuid } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { deveOcultar } from "@/lib/stories/rules";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// Denúncia de story (só contas; anônimo não denuncia, para não ocultar conteúdo em massa).
// Uma por conta e story. Com 3 denunciantes distintos o story é ocultado automaticamente.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  const corpo = (await req.json().catch(() => null)) as { motivo?: unknown } | null;
  const motivo = typeof corpo?.motivo === "string" && corpo.motivo.trim() ? corpo.motivo.trim().slice(0, 200) : null;
  try {
    const admin = createAdminClient();
    const { data: story } = await admin.from("stories").select("id,author_id").eq("id", id).maybeSingle();
    if (!story) return Response.json({ error: "story não encontrado" }, { status: 404, headers: noStore });
    if (story.author_id === sessao.userId) return Response.json({ error: "não é possível denunciar o próprio story" }, { status: 400, headers: noStore });
    const { error } = await admin
      .from("story_reports")
      .upsert({ story_id: id, reporter_id: sessao.userId, reason: motivo }, { onConflict: "story_id,reporter_id", ignoreDuplicates: true });
    if (error) return Response.json({ error: "falha" }, { status: 500, headers: noStore });
    const { count } = await admin.from("story_reports").select("reporter_id", { count: "exact", head: true }).eq("story_id", id);
    const oculto = deveOcultar(count ?? 0);
    if (oculto) await admin.from("stories").update({ hidden: true }).eq("id", id);
    return Response.json({ ok: true, oculto }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
