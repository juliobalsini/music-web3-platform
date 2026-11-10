import { getSessionRole } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// Publica a faixa do próprio artista depois do upload (só servidor decide o status).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (sessao.role !== "artist") {
    return Response.json({ error: "apenas artistas publicam faixas" }, { status: 403, headers: noStore });
  }
  // Se o envio da capa falhou, o cliente avisa e a faixa sai sem capa (arte gerada).
  const corpo = (await req.json().catch(() => null)) as { coverOk?: unknown } | null;
  const semCapa = corpo?.coverOk === false;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tracks")
    .update(semCapa ? { status: "published", cover_key: null } : { status: "published" })
    .eq("id", id)
    .eq("artist_id", sessao.userId)
    .eq("status", "processing")
    .eq("rights_confirmed", true)
    .select("id")
    .maybeSingle();
  if (error) return Response.json({ error: "falha ao publicar" }, { status: 500, headers: noStore });
  if (!data) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
  return Response.json({ trackId: data.id, status: "published" }, { headers: noStore });
}
