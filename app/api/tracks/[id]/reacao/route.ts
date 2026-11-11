import { isUuid } from "@/lib/playlists/rules";
import { getSessaoAny } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };
const TIPOS = ["like", "save", "support"] as const;

// Liga/desliga curtir, salvar ou apoiar. O usuário vem da sessão; a escrita é só no servidor.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessao = await getSessaoAny();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (!sessao.role) return Response.json({ error: "escolha um perfil" }, { status: 403, headers: noStore });
  const corpo = (await req.json().catch(() => null)) as { kind?: unknown; on?: unknown } | null;
  const kind = TIPOS.find((t) => t === corpo?.kind);
  if (!isUuid(id) || !kind || typeof corpo?.on !== "boolean") {
    return Response.json({ error: "pedido inválido" }, { status: 400, headers: noStore });
  }
  try {
    const admin = createAdminClient();
    if (corpo.on) {
      // Só faixa publicada; a chave primária torna repetir inofensivo.
      const { data: faixa } = await admin.from("tracks").select("id").eq("id", id).eq("status", "published").maybeSingle();
      if (!faixa) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
      const { error } = await admin
        .from("track_reactions")
        .upsert({ user_id: sessao.userId, track_id: id, kind }, { onConflict: "user_id,track_id,kind", ignoreDuplicates: true });
      if (error) return Response.json({ error: "falha" }, { status: 500, headers: noStore });
    } else {
      const { error } = await admin
        .from("track_reactions")
        .delete()
        .eq("user_id", sessao.userId)
        .eq("track_id", id)
        .eq("kind", kind);
      if (error) return Response.json({ error: "falha" }, { status: 500, headers: noStore });
    }
    return Response.json({ ok: true, kind, on: corpo.on }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
