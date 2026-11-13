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
  const { title, contentType, size, durationSec, cover, credits, genre, mood, uploadKey } = parsed.value;

  const admin = createAdminClient();

  // Idempotência: a mesma chave de envio (toque repetido, nova tentativa) reaproveita a faixa já criada.
  let existente: { id: string; r2_key: string; cover_key: string | null; status: string } | null = null;
  if (uploadKey) {
    const { data: ja } = await admin
      .from("tracks")
      .select("id,r2_key,cover_key,status")
      .eq("artist_id", sessao.userId)
      .eq("upload_key", uploadKey)
      .maybeSingle();
    existente = ja;
  }
  if (existente?.status === "published") {
    return Response.json({ trackId: existente.id, status: "published", jaPublicada: true }, { headers: noStore });
  }

  let trackId: string;
  let key: string;
  let capaKey: string | null;
  if (existente) {
    trackId = existente.id;
    key = existente.r2_key;
    capaKey = cover ? (existente.cover_key ?? coverKey(sessao.userId, randomUUID())) : null;
    // Nova tentativa de uma faixa que falhou: volta a "processing" (nada é apagado).
    await admin
      .from("tracks")
      .update({ status: "processing", failure_reason: null, cover_key: capaKey })
      .eq("id", trackId)
      .in("status", ["processing", "failed"]);
  } else {
    key = trackKey(sessao.userId, randomUUID());
    capaKey = cover ? coverKey(sessao.userId, randomUUID()) : null;
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
        genre,
        mood,
        upload_key: uploadKey,
      })
      .select("id")
      .single();
    if (error?.code === "23505" && uploadKey) {
      // Corrida de dois toques: o outro pedido criou a faixa; este só informa o conflito para o cliente tentar de novo.
      return Response.json({ error: "envio em andamento" }, { status: 409, headers: noStore });
    }
    if (error) return Response.json({ error: "falha ao registrar a faixa" }, { status: 500, headers: noStore });
    trackId = data.id;
  }

  const uploadUrl = await signUpload(key, contentType, size);
  const coverUploadUrl = cover && capaKey ? await signUpload(capaKey, cover.contentType, cover.size) : null;
  return Response.json(
    { trackId, uploadUrl, contentType, coverUploadUrl, coverContentType: cover?.contentType ?? null },
    { headers: noStore },
  );
}
