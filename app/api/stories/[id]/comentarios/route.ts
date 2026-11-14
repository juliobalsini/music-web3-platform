import { isUuid } from "@/lib/playlists/rules";
import { getSessaoAny, getSessionRole } from "@/lib/session";
import { nomesDe } from "@/lib/stories/queries";
import { createClient } from "@/lib/supabase/server";
import { excedeFrequencia, parseComentario } from "@/lib/stories/moderacao";

const noStore = { "Cache-Control": "no-store" };

// Lista pública (RLS: só não ocultos/apagados), do mais novo ao mais antigo.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  try {
    const supabase = await createClient();
    const { data: me } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("story_comments").select("id,author_id,kind,body,created_at").eq("story_id", id).eq("hidden", false).is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
    if (error) return Response.json({ comentarios: [] }, { headers: noStore });
    const autores = [...new Set((data ?? []).map((c) => c.author_id as string))];
    const nomes = await nomesDe(autores);
    return Response.json(
      {
        comentarios: (data ?? []).map((c) => ({ id: c.id, kind: c.kind, body: c.body, createdAt: c.created_at, autor: nomes.get(c.author_id) ?? "Ouvinte", meu: c.author_id === me.user?.id })),
      },
      { headers: noStore },
    );
  } catch {
    return Response.json({ comentarios: [] }, { headers: noStore });
  }
}

// Comentar: só conta (anônimo não comenta). Limite de frequência checado aqui e na policy do banco.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "story inválido" }, { status: 400, headers: noStore });
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const parsed = parseComentario(await req.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400, headers: noStore });
  try {
    const s = (await getSessaoAny())!;
    const desde = new Date(Date.now() - 60_000).toISOString();
    const { count } = await s.supabase.from("story_comments").select("id", { count: "exact", head: true }).eq("author_id", s.userId).gt("created_at", desde);
    if (excedeFrequencia(count ?? 0)) return Response.json({ error: "devagar: espere um minuto para comentar de novo" }, { status: 429, headers: noStore });
    const { data, error } = await s.supabase.from("story_comments").insert({ story_id: id, author_id: s.userId, kind: parsed.kind, body: parsed.body }).select("id,created_at").single();
    if (error) return Response.json({ error: "não foi possível comentar agora" }, { status: 400, headers: noStore });
    return Response.json({ id: data.id, createdAt: data.created_at }, { status: 201, headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
