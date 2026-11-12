import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_AUDIO_URL, DEMO_DURACAO, demoAtivo, ehFaixaDemo } from "@/lib/radio/demo";
import { isStorageConfigured, signPlayback } from "@/lib/storage/client";
import { chaveDeReproducao } from "@/lib/audio/transcode";
import { PLAYBACK_TTL_SECONDS } from "@/lib/storage/rules";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// URL assinada (1 h) só para faixa publicada (RLS já filtra por status).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
  // Faixas de demonstração (fora de produção): áudio estático local, sem B2 e sem cota.
  if (demoAtivo() && ehFaixaDemo(id)) {
    return Response.json({ url: DEMO_AUDIO_URL, durationSec: DEMO_DURACAO, expiresAt: Date.now() + 3600_000 }, { headers: noStore });
  }
  if (!isStorageConfigured()) {
    return Response.json({ error: "armazenamento indisponível" }, { status: 503, headers: noStore });
  }
  const supabase = await createClient();
  const consulta = (c: typeof supabase) =>
    c.from("tracks").select("r2_key, duration_sec, stream_path, transcode_status, loudness_lufs").eq("id", id).eq("status", "published").maybeSingle();
  let { data } = await consulta(supabase);
  if (!data) {
    // A Rádio lista faixas publicadas também via service_role; tocar precisa seguir a mesma regra
    // (o filtro `published` continua sendo o único critério).
    try {
      ({ data } = await consulta(createAdminClient() as unknown as typeof supabase));
    } catch {
      /* sem service_role: segue sem faixa */
    }
  }
  if (!data) return Response.json({ error: "faixa não encontrada" }, { status: 404, headers: noStore });
  const url = await signPlayback(chaveDeReproducao(data));
  return Response.json(
    {
      url,
      durationSec: data.duration_sec,
      loudnessLufs: data.loudness_lufs ?? null,
      expiresAt: Date.now() + PLAYBACK_TTL_SECONDS * 1000,
    },
    { headers: noStore },
  );
}
