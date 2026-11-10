// Gera os logos com fundo transparente a partir do cartão da marca.
// Uso: node scripts/brand/recortar-logo.mjs   (requer `sharp`, já instalado pelo Next)
import { createRequire } from "node:module";
// sharp é dependência opcional do Next: resolvida a partir do pacote `next`.
const require = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = require("sharp");

const origem = "public/brand/cartao-marca.png";
const { data, info } = await sharp(origem).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const bg = [data[0], data[1], data[2]]; // canto superior esquerdo = marinho do cartão
console.log("marinho do cartão:", "#" + bg.map((v) => v.toString(16).padStart(2, "0")).join(""));

async function recorte(nome, { left, top, width, height }) {
  const buf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((top + y) * info.width + (left + x)) * 4;
      const o = (y * width + x) * 4;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      // Alfa = quão longe do marinho (0 = fundo, 1 = cor cheia); remove o tom do fundo na borda.
      const d = Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));
      const a = Math.min(1, d / 90);
      buf[o + 3] = Math.round(a * 255);
      for (let c = 0; c < 3; c++) {
        const v = a > 0 ? (data[i + c] - bg[c] * (1 - a)) / a : 0;
        buf[o + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
    }
  }
  await sharp(buf, { raw: { width, height, channels: 4 } }).png().toFile(`public/brand/${nome}.png`);
}

await recorte("logo", { left: 235, top: 75, width: 385, height: 270 });
await recorte("gramofone", { left: 448, top: 75, width: 168, height: 270 });

// Ícones do app: gramofone centrado sobre o marinho da marca (#00112A).
async function icone(destino, lado) {
  const g = await sharp("public/brand/gramofone.png").resize({ height: Math.round(lado * 0.66) }).toBuffer();
  await sharp({ create: { width: lado, height: lado, channels: 3, background: "#00112a" } })
    .composite([{ input: g, gravity: "center" }])
    .png()
    .toFile(destino);
}
await icone("app/icon.png", 512);
await icone("app/apple-icon.png", 180);
