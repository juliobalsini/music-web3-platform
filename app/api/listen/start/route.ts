import { isUuid } from "@/lib/playlists/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

// Abre um evento de escuta. O usuário vem da sessão; a validação é no Postgres.
export async function POST(req: Request) {
  const supabase = await createClient();
  const body = (await req.json().catch(() => null)) as { trackId?: unknown } | null;
  if (!isUuid(body?.trackId)) return Response.json({ error: "faixa inválida" }, { status: 400, headers: noStore });
  try {
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Visitante: só cria sessão anônima se a faixa existe e está publicada (evita criar contas à toa).
      const { data: faixa } = await createAdminClient().from("tracks").select("id").eq("id", body.trackId).eq("status", "published").maybeSingle();
      if (!faixa) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
      const { data: anon, error: erroAnon } = await supabase.auth.signInAnonymously();
      if (erroAnon || !anon.user) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
      user = anon.user;
    }
    const { data: id, error } = await createAdminClient().rpc("listen_start", {
      p_user: user.id,
      p_track: body.trackId,
    });
    if (error || !id) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
    return Response.json({ eventId: id }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
