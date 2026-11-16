import { randomUUID } from "node:crypto";

import { isUuid } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { isStorageConfigured, signCover, signUpload } from "@/lib/storage/client";
import { ALLOWED_COVER_TYPES, coverKey, MAX_COVER_BYTES } from "@/lib/storage/rules";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

// Capa própria da playlist. GET redireciona à imagem (proxy/bucket); a RLS só mostra a playlist pública ou a do dono.
// A URL leva `?v=` da chave: capa nova = URL nova, então o redirecionamento pode ficar em cache por 15 min.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const nao = () => new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  if (!isUuid(id) || !isStorageConfigured()) return nao();
  const supabase = await createClient();
  const { data } = await supabase.from("playlists").select("cover_path,is_public").eq("id", id).maybeSingle();
  if (!data?.cover_path) return nao();
  const url = await signCover(data.cover_path);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": data.is_public ? "public, max-age=900, s-maxage=900" : "private, max-age=900" },
  });
}

// URL assinada (10 min) para o navegador enviar a capa já recortada direto ao bucket. Só o dono, com conta.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStorageConfigured()) return Response.json({ error: "armazenamento indisponível" }, { status: 503, headers: noStore });
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "playlist não encontrada" }, { status: 404, headers: noStore });
  const { data: dono } = await sessao.supabase.from("playlists").select("id").eq("id", id).eq("curator_id", sessao.userId).maybeSingle();
  if (!dono) return Response.json({ error: "playlist não encontrada" }, { status: 404, headers: noStore });

  const body = (await request.json().catch(() => null)) as { contentType?: unknown; size?: unknown } | null;
  const contentType = body?.contentType;
  const size = body?.size;
  if (typeof contentType !== "string" || !(ALLOWED_COVER_TYPES as readonly string[]).includes(contentType)) {
    return Response.json({ error: "formato de capa não aceito" }, { status: 400, headers: noStore });
  }
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_COVER_BYTES) {
    return Response.json({ error: "capa vazia ou maior que 2 MB" }, { status: 400, headers: noStore });
  }
  const key = coverKey(sessao.userId, randomUUID());
  const url = await signUpload(key, contentType, size);
  return Response.json({ url, key }, { headers: noStore });
}
