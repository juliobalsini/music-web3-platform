// Gera os ícones do PWA a partir de public/brand/logo.png e valida a zona segura do maskable.
// Uso: node scripts/brand/gerar-icones.mjs   (requer `sharp`, já instalado pelo Next)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = require("sharp");

const MARINHO = { r: 0, g: 0x11, b: 0x2a, alpha: 1 };
const logo = "public/brand/logo.png";
mkdirSync("public/icons", { recursive: true });

// fracao = largura do logo / lado do ícone.
async function icone(arquivo, lado, fracao) {
  const w = Math.round(lado * fracao);
  const img = await sharp(logo).resize({ width: w }).toBuffer();
  await sharp({ create: { width: lado, height: lado, channels: 4, background: MARINHO } })
    .composite([{ input: img, gravity: "center" }])
    .flatten({ background: MARINHO })
    .png()
    .toFile(arquivo);
  return arquivo;
}

// "any": logo inteiro (~84% da largura). "maskable": logo em ~60% do centro.
const saidas = [];
for (const s of [192, 512]) {
  saidas.push([await icone(`public/icons/icon-any-${s}.png`, s, 0.84), s, false]);
  saidas.push([await icone(`public/icons/icon-maskable-${s}.png`, s, 0.6), s, true]);
}
await icone("app/icon.png", 512, 0.84);
await icone("app/apple-icon.png", 180, 0.84);

// Validação: todo pixel que difere do marinho precisa estar dentro do círculo de raio 40% (zona segura).
let ok = true;
for (const [arq, s, maskable] of saidas) {
  const { data } = await sharp(arq).raw().toBuffer({ resolveWithObject: true });
  const ch = data.length / (s * s);
  let maxR = 0;
  let x0 = s, x1 = 0, y0 = s, y1 = 0;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = (y * s + x) * ch;
    const d = Math.max(Math.abs(data[i] - 0), Math.abs(data[i + 1] - 0x11), Math.abs(data[i + 2] - 0x2a));
    if (d > 24) {
      maxR = Math.max(maxR, Math.hypot(x + 0.5 - s / 2, y + 0.5 - s / 2));
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  const pct = ((maxR / s) * 100).toFixed(1);
  const dentro = maxR <= 0.4 * s;
  if (maskable && !dentro) ok = false;
  console.log(`${arq}: raio do conteúdo ${pct}% (limite 40%) caixa ${x0},${y0}–${x1},${y1} ${maskable ? (dentro ? "ZONA SEGURA OK" : "FORA DA ZONA SEGURA") : ""}`);
}
if (!ok) process.exit(1);
