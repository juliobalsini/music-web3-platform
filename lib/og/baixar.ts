import "server-only";

/** Baixa uma imagem e devolve data URI (para ImageResponse); qualquer falha → null. */
export async function baixarImagem(url: string, max = 2_000_000): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > max || buf.length === 0) return null;
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
