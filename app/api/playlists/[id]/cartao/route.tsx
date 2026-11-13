import { ImageResponse } from "next/og";

import { baixarImagem } from "@/lib/og/baixar";
import { obterPlaylist } from "@/lib/playlists/queries";
import { isUuid } from "@/lib/playlists/rules";
import { capaGerada } from "@/lib/radio/rules";

const recorte = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Cartão vertical 9:16 (1080x1920) da playlist publicada. Rascunho (invisível ao anônimo) dá 404. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response(null, { status: 404 });
  const p = await obterPlaylist(id);
  if (!p || !p.isPublic) return new Response(null, { status: 404 });
  const origem = new URL(req.url).origin;
  const logo = await baixarImagem(`${origem}/brand/logo.png`, 500_000);
  const cores = capaGerada(p.title);
  const link = `${origem.replace(/^https?:\/\//, "")}/playlist/${id}`;

  const imagem = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, color: "white", background: `linear-gradient(160deg, ${cores.cor2} 0%, #00112a 100%)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse não usa next/image
            <img src={logo} width={214} height={150} alt="radioOn" />
          ) : (
            <div style={{ display: "flex", fontSize: 72, fontWeight: 800 }}>radio<span style={{ color: "#e89a3c" }}>On</span></div>
          )}
          <div style={{ fontSize: 40, color: "#e89a3c", fontWeight: 700 }}>Playlist</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ fontSize: p.title.length > 40 ? 76 : 100, fontWeight: 800, lineHeight: 1.08 }}>{recorte(p.title, 90)}</div>
          {p.curator && <div style={{ fontSize: 44, color: "rgba(255,255,255,0.85)" }}>por {p.curator}</div>}
          <div style={{ fontSize: 38, color: "#e89a3c", fontWeight: 700 }}>{p.faixas.length} faixas</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 36, color: "rgba(255,255,255,0.75)" }}>Ouça na radioOn</div>
          <div style={{ fontSize: 30, fontWeight: 700, wordBreak: "break-all", maxWidth: 920 }}>{link}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
  imagem.headers.set("Cache-Control", "public, max-age=600, s-maxage=600");
  return imagem;
}
