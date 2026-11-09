import { listenConfig } from "@/lib/listen/config";
import { isUuid } from "@/lib/playlists/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

// Heartbeat: o servidor mede o tempo e decide se a escuta vale pontos.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const body = (await req.json().catch(() => null)) as { eventId?: unknown } | null;
  if (!isUuid(body?.eventId)) return Response.json({ error: "evento inválido" }, { status: 400, headers: noStore });
  const cfg = listenConfig();
  try {
    const { data: r, error } = await createAdminClient().rpc("listen_beat", {
      p_user: data.user.id,
      p_event: body.eventId,
      p_points: cfg.points,
      p_daily_limit: cfg.dailyLimit,
      p_max_per_track: cfg.maxPerTrack,
    });
    if (error) return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
    const res = r as { ok: boolean; valid?: boolean; points?: number };
    if (!res.ok) return Response.json({ error: "evento não encontrado" }, { status: 404, headers: noStore });
    return Response.json({ valid: !!res.valid, points: res.points ?? 0 }, { headers: noStore });
  } catch {
    return Response.json({ error: "indisponível" }, { status: 503, headers: noStore });
  }
}
