// Gera public/brand/logo-claro.png (tema claro): pixels claros e pouco saturados (o "radio" branco) viram marinho;
// o âmbar do gramofone e do "On" fica igual. Uso: node scripts/brand/gerar-logo-claro.mjs (requer `sharp`, do Next).
import { createRequire } from "node:module";
const require = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = require("sharp");

const MARINHO = [0x00, 0x11, 0x2a];
const { data, info } = await sharp("public/brand/logo.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let trocados = 0;
for (let i = 0; i < data.length; i += 4) {
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
  if (a === 0) continue;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturacao = max === 0 ? 0 : (max - min) / max;
  // Branco e cinza claro (inclui a borda suavizada das letras): troca a cor, mantém o alfa.
  if (saturacao < 0.2 && max > 140) {
    data[i] = MARINHO[0];
    data[i + 1] = MARINHO[1];
    data[i + 2] = MARINHO[2];
    trocados++;
  }
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile("public/brand/logo-claro.png");
console.log(`logo-claro.png: ${trocados} pixels trocados`);
