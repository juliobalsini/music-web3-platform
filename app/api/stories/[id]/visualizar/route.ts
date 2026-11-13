import { isUuid } from "@/lib/playlists/rules";
import { sessaoOuAnonima } from "@/lib/stories/sessao";

const noStore = { "Cache-Control": "no-store" };

// Registra a visualização (uma por usuário ou sessão anônima, via RLS: só como si mesmo). Idempotente.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  try {
    const s = await sessaoOuAnonima();
    if (!s) return Response.json({ ok: false }, { status: 202, headers: noStore });
    const { error } = await s.supabase.from("story_views").upsert({ story_id: id, viewer_id: s.userId }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true });
    return Response.json({ ok: !error }, { status: error ? 202 : 200, headers: noStore });
  } catch {
    return Response.json({ ok: false }, { status: 202, headers: noStore });
  }
}
