import { isUuid } from "@/lib/playlists/rules";
import { getSessaoAny } from "@/lib/session";

const noStore = { "Cache-Control": "no-store" };

// Só o dono vê visualizações e curtidas do próprio story (RLS: as linhas só aparecem para ele).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  try {
    const s = await getSessaoAny();
    if (!s) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
    const { data: story } = await s.supabase.from("stories").select("author_id").eq("id", id).maybeSingle();
    if (!story || story.author_id !== s.userId) return Response.json({ error: "apenas o dono" }, { status: 403, headers: noStore });
    const [v, l, c] = await Promise.all([
      s.supabase.from("story_views").select("viewer_id", { count: "exact", head: true }).eq("story_id", id),
      s.supabase.from("story_likes").select("user_id", { count: "exact", head: true }).eq("story_id", id),
      s.supabase.from("story_comments").select("id", { count: "exact", head: true }).eq("story_id", id),
    ]);
    return Response.json({ visualizacoes: v.count ?? 0, curtidas: l.count ?? 0, comentarios: c.count ?? 0 }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
