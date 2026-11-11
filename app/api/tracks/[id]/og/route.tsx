import { ImageResponse } from "next/og";

import { isUuid } from "@/lib/playlists/rules";
import { capaSvgDataUri } from "@/lib/radio/capa-svg";
import { carregarRadio } from "@/lib/radio/queries";
import { isStorageConfigured, signCover } from "@/lib/storage/client";
import { createClient } from "@/lib/supabase/server";

const recorte = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Baixa uma imagem e devolve data URI; qualquer falha → null (cai na capa gerada). */
async function baixar(url: string, max = 2_000_000): Promise<string | null> {
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

async function capaDaFaixa(id: string, title: string, temCapa: boolean): Promise<string> {
  if (temCapa && isStorageConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from("tracks").select("cover_key").eq("id", id).eq("status", "published").maybeSingle();
      if (data?.cover_key) {
        const img = await baixar(await signCover(data.cover_key));
        if (img) return img;
      }
    } catch {
      /* usa a capa gerada */
    }
  }
  return capaSvgDataUri(title);
}

/** Imagem Open Graph 1200x630 da faixa: capa, título, artista e logo. Guardada 1 h na CDN. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response(null, { status: 404 });
  const radio = await carregarRadio();
  const faixa = radio.faixas.find((f) => f.id === id);
  if (!faixa) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

  const origem = new URL(req.url).origin;
  const [capa, logo] = await Promise.all([capaDaFaixa(faixa.id, faixa.title, faixa.hasCover), baixar(`${origem}/brand/logo.png`, 500_000)]);

  const imagem = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 56, padding: 64, background: "linear-gradient(135deg, #00112a 0%, #062244 100%)", color: "white" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse não usa next/image */}
        <img src={capa} width={430} height={430} alt="" style={{ borderRadius: 28, objectFit: "cover" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, height: 430, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 28, color: "#e89a3c", fontWeight: 700 }}>Ouça no radioOn</div>
            <div style={{ fontSize: faixa.title.length > 32 ? 56 : 72, fontWeight: 800, lineHeight: 1.05 }}>{recorte(faixa.title, 70)}</div>
            <div style={{ fontSize: 38, color: "rgba(255,255,255,0.75)" }}>{recorte(faixa.artistName, 40)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- ImageResponse não usa next/image
              <img src={logo} width={171} height={120} alt="radioOn" />
            ) : (
              <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>
                radio<span style={{ color: "#e89a3c" }}>On</span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  imagem.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return imagem;
}
