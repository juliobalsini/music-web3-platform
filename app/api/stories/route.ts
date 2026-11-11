import { randomUUID } from "node:crypto";

import { getSessionRole } from "@/lib/session";
import { isStorageConfigured, signUpload } from "@/lib/storage/client";
import { chaveImagemStory, idsDaPlataforma, parseStoryInput, podePublicarStory } from "@/lib/stories/rules";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// Cria um story. Quem publica: artistas, playlisters e contas da plataforma (PLATFORM_STORY_IDS).
// A imagem (opcional) sobe direto ao bucket por URL assinada; depois /imagem confirma.
export async function POST(request: Request) {
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const { pode, plataforma } = podePublicarStory(sessao.role, sessao.userId, idsDaPlataforma(process.env.PLATFORM_STORY_IDS));
  if (!pode) return Response.json({ error: "apenas artistas, playlisters e a plataforma publicam stories" }, { status: 403, headers: noStore });

  const parsed = parseStoryInput(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400, headers: noStore });
  const { body, image, trackId, clipStart } = parsed.value;
  if (image && !isStorageConfigured()) return Response.json({ error: "armazenamento indisponível" }, { status: 503, headers: noStore });

  const admin = createAdminClient();
  if (trackId) {
    const { data: faixa } = await admin.from("tracks").select("id").eq("id", trackId).eq("status", "published").maybeSingle();
    if (!faixa) return Response.json({ error: "faixa não encontrada" }, { status: 400, headers: noStore });
  }
  const id = randomUUID();
  const { error } = await admin
    .from("stories")
    .insert({ id, author_id: sessao.userId, is_platform: plataforma, body, track_id: trackId, clip_start: clipStart });
  if (error) return Response.json({ error: "falha ao publicar" }, { status: 500, headers: noStore });
  const imageUploadUrl = image ? await signUpload(chaveImagemStory(sessao.userId, id), image.contentType, image.size) : null;
  return Response.json({ storyId: id, imageUploadUrl, imageContentType: image?.contentType ?? null }, { headers: noStore });
}
