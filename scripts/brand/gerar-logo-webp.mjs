// Gera public/brand/logo.webp e logo-claro.webp (WebP sem perda, ~metade do PNG) para a interface. Os PNG ficam para os
// cartões OG (o gerador de imagem só aceita PNG/JPEG). Uso: node scripts/brand/gerar-logo-webp.mjs (requer `sharp`, do Next).
import { createRequire } from "node:module";
const require = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = require("sharp");

for (const nome of ["logo", "logo-claro"]) {
  const { size } = await sharp(`public/brand/${nome}.png`).webp({ lossless: true, effort: 6 }).toFile(`public/brand/${nome}.webp`);
  console.log(`${nome}.webp: ${size} bytes`);
}
