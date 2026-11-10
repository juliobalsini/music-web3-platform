import { randomUUID } from "node:crypto";

import { getSessionRole } from "@/lib/session";
import { isStorageConfigured, signUpload } from "@/lib/storage/client";
import { coverKey, parseUploadInput, trackKey } from "@/lib/storage/rules";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// Cria a faixa (status processing) e devolve a URL assinada de upload (10 min).
// O navegador envia o arquivo direto ao bucket; depois chama /publish.
export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return Response.json({ error: "armazenamento indisponível" }, { status: 503, headers: noStore });
  }
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (sessao.role !== "artist") {
    return Response.json({ error: "apenas artistas enviam faixas" }, { status: 403, headers: noStore });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = parseUploadInput(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400, headers: noStore });
  const { title, contentType, size, durationSec, cover, credits } = parsed.value;

  const key = trackKey(sessao.userId, randomUUID());
  const capaKey = cover ? coverKey(sessao.userId, randomUUID()) : null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tracks")
    .insert({
      artist_id: sessao.userId,
      title,
      r2_key: key,
      duration_sec: durationSec,
      status: "processing",
      rights_confirmed: true,
      cover_key: capaKey,
      composer: credits.composer,
      performers: credits.performers,
      album: credits.album,
      label: credits.label,
    })
    .select("id")
    .single();
  if (error) return Response.json({ error: "falha ao registrar a faixa" }, { status: 500, headers: noStore });

  const uploadUrl = await signUpload(key, contentType, size);
  const coverUploadUrl = cover && capaKey ? await signUpload(capaKey, cover.contentType, cover.size) : null;
  return Response.json(
    { trackId: data.id, uploadUrl, contentType, coverUploadUrl, coverContentType: cover?.contentType ?? null },
    { headers: noStore },
  );
}
