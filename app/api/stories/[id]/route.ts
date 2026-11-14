import { isUuid } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// "Apagar" do dono: marca deleted_at (sem DELETE no banco; o story some para todos). Só o autor.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  try {
    const { data, error } = await createAdminClient()
      .from("stories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("author_id", sessao.userId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) return Response.json({ error: "falha" }, { status: 500, headers: noStore });
    if (!data) return Response.json({ error: "story não encontrado" }, { status: 404, headers: noStore });
    return Response.json({ ok: true }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
