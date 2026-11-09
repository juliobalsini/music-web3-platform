import { isUuid } from "@/lib/playlists/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

// Abre um evento de escuta. O usuário vem da sessão; a validação é no Postgres.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const body = (await req.json().catch(() => null)) as { trackId?: unknown } | null;
  if (!isUuid(body?.trackId)) return Response.json({ error: "faixa inválida" }, { status: 400, headers: noStore });
  try {
    const { data: id, error } = await createAdminClient().rpc("listen_start", {
      p_user: data.user.id,
      p_track: body.trackId,
    });
    if (error || !id) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
    return Response.json({ eventId: id }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
