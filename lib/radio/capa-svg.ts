import { capaGerada, type Glifo } from "./rules.ts";

const FORMAS: Record<Glifo, string> = {
  onda: '<path d="M-26 0 q13 -22 26 0 t26 0" fill="none" stroke-width="5" stroke-linecap="round"/>',
  disco: '<circle r="22"/><circle r="7" fill="black" fill-opacity="0.45" stroke="none"/>',
  estrela: '<path d="M0 -24 L6 -7 L24 -7 L10 4 L15 22 L0 11 L-15 22 L-10 4 L-24 -7 L-6 -7 Z"/>',
  triangulo: '<path d="M0 -24 L24 18 L-24 18 Z"/>',
  arco: '<path d="M-24 14 a24 24 0 0 1 48 0" fill="none" stroke-width="8" stroke-linecap="round"/>',
  losango: '<path d="M0 -26 L20 0 L0 26 L-20 0 Z"/>',
};

const TEXTURAS = {
  linhas: (id: string) => `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="1.4" fill="white"/></pattern>`,
  pontos: (id: string) => `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="white"/></pattern>`,
  diagonais: (id: string) => `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="7" fill="white"/></pattern>`,
  ondas: (id: string) => `<pattern id="${id}" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 q4 -4 8 0 t8 0" fill="none" stroke="white" stroke-width="1"/></pattern>`,
} as const;

/**
 * Conteúdo SVG (viewBox 100x100) da capa gerada: gradiente do par de cores, textura, anéis e glifo.
 * Só usa números e cores derivados do título (nenhum texto do usuário entra no markup).
 */
export function capaSvgInterno(titulo: string, uid = "c"): string {
  const c = capaGerada(titulo);
  const aneis = Array.from({ length: c.aneis }, (_, i) => `<circle cx="50" cy="50" r="${40 + c.aneis - i * 9}" fill="none" stroke="white" stroke-opacity="0.16" stroke-width="1.2"/>`).join("");
  return (
    `<defs><linearGradient id="g${uid}" gradientTransform="rotate(${c.angulo} .5 .5)"><stop offset="0" stop-color="${c.cor}"/><stop offset="1" stop-color="${c.cor2}"/></linearGradient>${TEXTURAS[c.textura](`t${uid}`)}</defs>` +
    `<rect width="100" height="100" fill="url(#g${uid})"/><rect width="100" height="100" fill="url(#t${uid})" opacity="0.13"/>${aneis}` +
    `<g transform="translate(50 50) rotate(${c.rotacao})" fill="white" stroke="white" fill-opacity="0.88" stroke-opacity="0.88">${FORMAS[c.glifo]}</g>`
  );
}

/** Capa gerada como data URI (para imagens geradas no servidor, como o Open Graph). */
export function capaSvgDataUri(titulo: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="600" height="600">${capaSvgInterno(titulo)}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
