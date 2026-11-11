import { getSessaoAny } from "@/lib/session";

const noStore = { "Cache-Control": "no-store" };

// Reações do próprio usuário (RLS: só as dele). Sem sessão → 401 (o player segue sem coração).
export async function GET() {
  let sessao;
  try {
    sessao = await getSessaoAny();
  } catch {
    sessao = null;
  }
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const { data } = await sessao.supabase.from("track_reactions").select("track_id,kind").limit(2000);
  const r: Record<string, string[] | string> = { like: [], save: [], support: [] };
  for (const l of (data ?? []) as { track_id: string; kind: string }[]) (r[l.kind] as string[] | undefined)?.push(l.track_id);
  r.userId = sessao.userId;
  return Response.json(r, { headers: noStore });
}
