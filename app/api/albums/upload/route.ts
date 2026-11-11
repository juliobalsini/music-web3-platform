import { randomUUID } from "node:crypto";

import { getSessionRole } from "@/lib/session";
import { isStorageConfigured, signUpload } from "@/lib/storage/client";
import { parseAlbumInput } from "@/lib/storage/albuns";
import { coverKey, trackKey } from "@/lib/storage/rules";
import { createAdminClient } from "@/lib/supabase/admin";

const noStore = { "Cache-Control": "no-store" };

// Cria o álbum/EP e as faixas (status processing) com uma capa única e devolve as URLs assinadas
// (10 min). O navegador envia direto ao bucket e publica cada faixa em /api/tracks/[id]/publish.
export async function POST(request: Request) {
  if (!isStorageConfigured()) return Response.json({ error: "armazenamento indisponível" }, { status: 503, headers: noStore });
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  if (sessao.role !== "artist") return Response.json({ error: "apenas artistas enviam faixas" }, { status: 403, headers: noStore });

  const parsed = parseAlbumInput(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400, headers: noStore });
  const { title, kind, cover, genre, mood, faixas } = parsed.value;

  const admin = createAdminClient();
  const { data: album, error: erroAlbum } = await admin.from("albums").insert({ artist_id: sessao.userId, title, kind }).select("id").single();
  if (erroAlbum) return Response.json({ error: "falha ao registrar o álbum" }, { status: 500, headers: noStore });

  const capaKey = cover ? coverKey(sessao.userId, randomUUID()) : null;
  const linhas = faixas.map((f, i) => ({
    artist_id: sessao.userId,
    title: f.title,
    r2_key: trackKey(sessao.userId, randomUUID()),
    duration_sec: f.durationSec,
    status: "processing",
    rights_confirmed: true,
    cover_key: capaKey,
    album: title,
    album_id: album.id,
    track_no: i + 1,
    genre,
    mood,
  }));
  const { data: criadas, error } = await admin.from("tracks").insert(linhas).select("id,r2_key,track_no");
  if (error || !criadas) return Response.json({ error: "falha ao registrar as faixas" }, { status: 500, headers: noStore });

  const porNo = new Map(criadas.map((c) => [c.track_no as number, c]));
  const saida = await Promise.all(
    faixas.map(async (f, i) => {
      const c = porNo.get(i + 1)!;
      return { trackId: c.id as string, uploadUrl: await signUpload(c.r2_key as string, f.contentType, f.size), contentType: f.contentType };
    }),
  );
  const coverUploadUrl = cover && capaKey ? await signUpload(capaKey, cover.contentType, cover.size) : null;
  return Response.json({ albumId: album.id, faixas: saida, coverUploadUrl, coverContentType: cover?.contentType ?? null }, { headers: noStore });
}
