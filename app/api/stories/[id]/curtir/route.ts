import { isUuid } from "@/lib/playlists/rules";
import { getSessaoAny } from "@/lib/session";
import { sessaoOuAnonima } from "@/lib/stories/sessao";

const noStore = { "Cache-Control": "no-store" };

// Estado da curtida do chamador + total (o total só chega ao dono, em /estatisticas).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  try {
    const s = await getSessaoAny();
    if (!s) return Response.json({ curtiu: false }, { headers: noStore });
    const { data } = await s.supabase.from("story_likes").select("story_id").eq("story_id", id).eq("user_id", s.userId).maybeSingle();
    return Response.json({ curtiu: !!data }, { headers: noStore });
  } catch {
    return Response.json({ curtiu: false }, { headers: noStore });
  }
}

// Curtir/descurtir: um por usuário ou sessão anônima (chave primária + RLS: só como si mesmo).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  const corpo = (await req.json().catch(() => null)) as { curtir?: unknown } | null;
  const curtir = corpo?.curtir !== false;
  try {
    const s = await sessaoOuAnonima();
    if (!s) return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
    if (curtir) {
      const { error } = await s.supabase.from("story_likes").upsert({ story_id: id, user_id: s.userId }, { onConflict: "story_id,user_id", ignoreDuplicates: true });
      if (error) return Response.json({ error: "falha ao curtir" }, { status: 400, headers: noStore });
    } else {
      const { error } = await s.supabase.from("story_likes").delete().eq("story_id", id).eq("user_id", s.userId);
      if (error) return Response.json({ error: "falha" }, { status: 400, headers: noStore });
    }
    return Response.json({ curtiu: curtir }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
