import { randomUUID } from "node:crypto";

import { chaveDaRota } from "@/lib/perfil/foto";
import { isUuid } from "@/lib/playlists/rules";
import { getSessionRole } from "@/lib/session";
import { isStorageConfigured, signCover, signUpload } from "@/lib/storage/client";
import { ALLOWED_COVER_TYPES, coverKey, MAX_COVER_BYTES } from "@/lib/storage/rules";

const noStore = { "Cache-Control": "no-store" };

// Foto própria do perfil (#125). GET é pública como a foto do Google: redireciona ao proxy/bucket sem tocar no banco.
// O `v` é o uuid do arquivo em covers/<conta>/ (imprevisível); foto nova = URL nova, então o redirecionamento fica em cache.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const key = isUuid(id) ? chaveDaRota(id, new URL(req.url).searchParams.get("v")) : null;
  if (!key || !isStorageConfigured()) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  const url = await signCover(key);
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "public, max-age=900, s-maxage=900" } });
}

// URL assinada (10 min) para o navegador enviar a foto já recortada direto ao bucket. Só a própria conta.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isStorageConfigured()) return Response.json({ error: "armazenamento indisponível" }, { status: 503, headers: noStore });
  const sessao = await getSessionRole();
  if (!sessao) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const { id } = await ctx.params;
  if (!isUuid(id) || id.toLowerCase() !== sessao.userId.toLowerCase()) {
    return Response.json({ error: "perfil não encontrado" }, { status: 404, headers: noStore });
  }
  const body = (await request.json().catch(() => null)) as { contentType?: unknown; size?: unknown } | null;
  const contentType = body?.contentType;
  const size = body?.size;
  if (typeof contentType !== "string" || !(ALLOWED_COVER_TYPES as readonly string[]).includes(contentType)) {
    return Response.json({ error: "formato de imagem não aceito" }, { status: 400, headers: noStore });
  }
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_COVER_BYTES) {
    return Response.json({ error: "imagem vazia ou maior que 2 MB" }, { status: 400, headers: noStore });
  }
  const key = coverKey(sessao.userId, randomUUID());
  const url = await signUpload(key, contentType, size);
  return Response.json({ url, key }, { headers: noStore });
}
