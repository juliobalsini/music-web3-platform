import { ImageResponse } from "next/og";

import { baixarImagem } from "@/lib/og/baixar";
import { isUuid } from "@/lib/playlists/rules";
import { capaGerada } from "@/lib/radio/rules";
import { carregarRadio } from "@/lib/radio/queries";
import { isStorageConfigured, signCover } from "@/lib/storage/client";
import { carregarStories } from "@/lib/stories/queries";
import { createClient } from "@/lib/supabase/server";

const recorte = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Cartão vertical 9:16 (1080x1920) do story, com logo e link, para Instagram, WhatsApp, Facebook e LinkedIn. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response(null, { status: 404 });
  const story = (await carregarStories()).find((s) => s.id === id);
  if (!story) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  const origem = new URL(req.url).origin;
  const faixa = story.trackId ? (await carregarRadio()).faixas.find((f) => f.id === story.trackId) : undefined;

  let fundo: string | null = null;
  if (story.hasImage && isStorageConfigured()) {
    try {
      const { data } = await (await createClient()).from("stories").select("image_key").eq("id", id).eq("hidden", false).maybeSingle();
      if (data?.image_key) fundo = await baixarImagem(await signCover(data.image_key));
    } catch {
      /* usa o gradiente */
    }
  }
  const logo = await baixarImagem(`${origem}/brand/logo.png`, 500_000);
  const cores = capaGerada(story.body ?? story.authorName);
  const link = `${origem.replace(/^https?:\/\//, "")}/story/${id}`;

  const imagem = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, color: "white", background: `linear-gradient(160deg, ${cores.cor2} 0%, #00112a 100%)`, position: "relative" }}>
        {fundo && (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse não usa next/image
          <img src={fundo} width={1080} height={1920} alt="" style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1920, objectFit: "cover" }} />
        )}
        {fundo && <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1920, background: "linear-gradient(180deg, rgba(0,17,42,0.55) 0%, rgba(0,17,42,0.15) 40%, rgba(0,17,42,0.85) 100%)" }} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse não usa next/image
            <img src={logo} width={214} height={150} alt="radioOn" />
          ) : (
            <div style={{ display: "flex", fontSize: 72, fontWeight: 800 }}>radio<span style={{ color: "#e89a3c" }}>On</span></div>
          )}
          <div style={{ fontSize: 40, color: "#e89a3c", fontWeight: 700 }}>Story</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 36, position: "relative" }}>
          {story.body && <div style={{ fontSize: story.body.length > 120 ? 60 : 78, fontWeight: 800, lineHeight: 1.12 }}>{recorte(story.body, 220)}</div>}
          <div style={{ fontSize: 44, color: "rgba(255,255,255,0.85)" }}>{story.authorName}</div>
          {faixa && (
            <div style={{ display: "flex", fontSize: 38, color: "#e89a3c", fontWeight: 700 }}>Faixa: {recorte(`${faixa.title} · ${faixa.artistName}`, 60)}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
          <div style={{ fontSize: 36, color: "rgba(255,255,255,0.75)" }}>Ouça na radioOn</div>
          <div style={{ fontSize: 30, fontWeight: 700, wordBreak: "break-all", maxWidth: 920 }}>{link}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
  imagem.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return imagem;
}
