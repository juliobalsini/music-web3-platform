// Mini editor de capa da playlist (#122, fase 2, item 4): modelo, regras puras e desenho no canvas.
// O mesmo `desenharCapa` gera a prévia e o PNG final (o que se vê é o que se salva). Sem DOM além do canvas.

/** Fundos da marca (6). `tinta` é a cor do título e das figurinhas sobre o fundo. */
export const FUNDOS = [
  { id: "noite", nome: "Noite", tinta: "#ffffff" },
  { id: "ambar", nome: "Âmbar", tinta: "#00112a" },
  { id: "entardecer", nome: "Entardecer", tinta: "#ffffff" },
  { id: "sulcos", nome: "Sulcos", tinta: "#ffffff" },
  { id: "ondas", nome: "Ondas", tinta: "#f4b562" },
  { id: "faixas", nome: "Faixas", tinta: "#00112a" },
] as const;
export type FundoId = (typeof FUNDOS)[number]["id"];

/** Fontes do título (3). A família real (next/font) é passada ao desenhar. */
export const FONTES = [
  { id: "geist", nome: "Clássica", peso: 700, caixaAlta: false, entrelinha: 1.05 },
  { id: "serifa", nome: "Editorial", peso: 600, caixaAlta: false, entrelinha: 1.05 },
  { id: "cartaz", nome: "Cartaz", peso: 400, caixaAlta: true, entrelinha: 0.95 },
] as const;
export type FonteId = (typeof FONTES)[number]["id"];

// Figurinhas musicais (12): traços dos ícones Lucide (ISC), grade 24×24, um traço por elemento.
export const FIGURINHAS = {
  nota: ["M21 16V3a1 1 0 0 0-1.28-.96l-10 2.917a1 1 0 0 0-.72.96V19", "M15 16a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M3 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"],
  colcheia: ["m19 6-5.2-3.9a.5.5 0 0 0-.8.4V18","M5 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"],
  vinil: ["M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0","M6 12c0-1.7.7-3.2 1.8-4.2","M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0","M18 12c0 1.7-.7 3.2-1.8 4.2"],
  fones: ["M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"],
  microfone: ["m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12","M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5","M11 7a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"],
  guitarra: ["m11.9 12.1 4.514-4.514","M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z","m6 16 2 2","M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z"],
  piano: ["M10 13v4","M14 13v4","M18 13v4","M2 13h20","M22 11.5A3.5 3.5 0 0018.5 8a3.52 3.52 0 01-3.173-2A7 7 0 002 9v10a2 2 0 002 2h16a2 2 0 002-2z","M6 13v4"],
  tambor: ["m2 2 8 8","m22 2-8 8","M2 9a10 5 0 1 0 20 0a10 5 0 1 0 -20 0","M7 13.4v7.9","M12 14v8","M17 13.4v7.9","M2 9v8a10 5 0 0 0 20 0V9"],
  radio: ["M16.247 7.761a6 6 0 0 1 0 8.478","M19.075 4.933a10 10 0 0 1 0 14.134","M4.925 19.067a10 10 0 0 1 0-14.134","M7.753 16.239a6 6 0 0 1 0-8.478","M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"],
  onda: ["M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"],
  coracao: ["M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"],
  brilho: ["M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z","M20 2v4","M22 4h-4","M2 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"],
} as const satisfies Record<string, readonly string[]>;
export type FigurinhaId = keyof typeof FIGURINHAS;
export const NOMES_FIGURINHAS: Record<FigurinhaId, string> = {
  nota: "Nota", colcheia: "Colcheia", vinil: "Vinil", fones: "Fones", microfone: "Microfone", guitarra: "Guitarra",
  piano: "Piano", tambor: "Tambor", radio: "Rádio", onda: "Onda sonora", coracao: "Coração", brilho: "Brilho",
};

export const MAX_FIGURINHAS = 8;
export const MAX_TITULO = 60;
export const ESCALA_MIN = 0.4;
export const ESCALA_MAX = 2.5;

/** Posição do centro em frações do lado (0–1) e escala relativa ao tamanho base. */
export type Camada = { x: number; y: number; escala: number };
export type Figurinha = Camada & { uid: string; nome: FigurinhaId };
export type Composicao = { fundo: FundoId; fonte: FonteId; texto: string; titulo: Camada; figurinhas: Figurinha[] };
/** Retângulo em frações do lado (para posicionar as alças sobre a prévia). */
export type Caixa = { x: number; y: number; w: number; h: number };

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)) || 0;

export function composicaoInicial(texto: string): Composicao {
  return {
    fundo: "noite",
    fonte: "geist",
    texto: texto.trim().slice(0, MAX_TITULO),
    titulo: { x: 0.5, y: 0.62, escala: 1 },
    figurinhas: [{ uid: "f0", nome: "vinil", x: 0.5, y: 0.3, escala: 1.2 }],
  };
}

/** Mantém o centro dentro da capa (com 4% de margem) e a escala no intervalo permitido. */
export function limitarCamada<T extends Camada>(c: T): T {
  return { ...c, x: limitar(c.x, 0.04, 0.96), y: limitar(c.y, 0.04, 0.96), escala: limitar(c.escala, ESCALA_MIN, ESCALA_MAX) };
}

/** Atualiza o título ("titulo") ou uma figurinha (uid), sempre dentro dos limites. */
export function atualizarCamada(c: Composicao, alvo: string, mudar: (k: Camada) => Camada): Composicao {
  if (alvo === "titulo") return { ...c, titulo: limitarCamada(mudar(c.titulo)) };
  return { ...c, figurinhas: c.figurinhas.map((f) => (f.uid === alvo ? { ...f, ...limitarCamada({ ...f, ...mudar(f) }) } : f)) };
}

/** Pontos livres das bordas: cada figurinha nova vai para o próximo, sem cobrir o título nem a anterior. */
const VAGAS: readonly [number, number][] = [[0.18, 0.18], [0.82, 0.18], [0.18, 0.86], [0.82, 0.86], [0.5, 0.12], [0.12, 0.5], [0.88, 0.5], [0.5, 0.9]];

/** Nova figurinha numa vaga da borda; no máx. MAX_FIGURINHAS. */
export function adicionarFigurinha(c: Composicao, nome: FigurinhaId): { comp: Composicao; uid: string | null } {
  if (c.figurinhas.length >= MAX_FIGURINHAS || !Object.hasOwn(FIGURINHAS, nome)) return { comp: c, uid: null };
  const n = c.figurinhas.length;
  const usados = new Set(c.figurinhas.map((f) => f.uid));
  let i = n;
  while (usados.has(`f${i}`)) i++;
  const uid = `f${i}`;
  const [x, y] = VAGAS[(n - 1 + VAGAS.length) % VAGAS.length];
  return { comp: { ...c, figurinhas: [...c.figurinhas, limitarCamada({ uid, nome, x, y, escala: 0.8 })] }, uid };
}

export function removerFigurinha(c: Composicao, uid: string): Composicao {
  return { ...c, figurinhas: c.figurinhas.filter((f) => f.uid !== uid) };
}

/** Quebra o texto em até `maxLinhas` linhas que cabem em `largura` (medida injetada: testável sem canvas). */
export function quebrarLinhas(texto: string, largura: number, medir: (s: string) => number, maxLinhas = 3): string[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  for (const p of palavras) {
    const atual = linhas[linhas.length - 1];
    if (atual !== undefined && medir(`${atual} ${p}`) <= largura) linhas[linhas.length - 1] = `${atual} ${p}`;
    else linhas.push(p);
  }
  if (linhas.length <= maxLinhas) return linhas;
  const cabe = linhas.slice(0, maxLinhas);
  cabe[maxLinhas - 1] = `${linhas.slice(maxLinhas - 1).join(" ")}`;
  return cabe;
}

/** Tamanho base: título 11% do lado, figurinha 16% do lado (antes da escala). */
export const BASE_TITULO = 0.11;
export const BASE_FIGURINHA = 0.16;

type Ctx = CanvasRenderingContext2D;

function desenharFundo(ctx: Ctx, fundo: FundoId, l: number) {
  const linear = (x0: number, y0: number, x1: number, y1: number, cores: string[]) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    cores.forEach((c, i) => g.addColorStop(i / (cores.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, l, l);
  };
  const brilho = (x: number, y: number, r: number, cor: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, cor);
    g.addColorStop(1, "rgba(232,154,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, l, l);
  };
  ctx.save();
  if (fundo === "noite") {
    linear(0, 0, 0, l, ["#00112a", "#062244"]);
    brilho(l * 0.85, l * 0.9, l * 0.75, "rgba(232,154,60,0.45)");
  } else if (fundo === "ambar") {
    linear(0, 0, l, l, ["#f4b562", "#e89a3c"]);
    brilho(l * 0.2, l * 0.15, l * 0.6, "rgba(255,255,255,0.35)");
  } else if (fundo === "entardecer") {
    linear(0, 0, l * 0.3, l, ["#00112a", "#062244", "#b8692a", "#e89a3c"]);
  } else if (fundo === "sulcos") {
    linear(0, 0, 0, l, ["#00112a", "#03192f"]);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = l * 0.004;
    for (let r = l * 0.1; r < l * 1.05; r += l * 0.028) {
      ctx.beginPath();
      ctx.arc(l * 0.92, l * 0.92, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#e89a3c";
    ctx.beginPath();
    ctx.arc(l * 0.92, l * 0.92, l * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (fundo === "ondas") {
    linear(0, 0, 0, l, ["#062244", "#00112a"]);
    ctx.lineWidth = l * 0.006;
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = `rgba(232,154,60,${0.12 + i * 0.05})`;
      ctx.beginPath();
      const base = l * (0.55 + i * 0.05);
      for (let x = 0; x <= l; x += l / 60) {
        const y = base + Math.sin((x / l) * Math.PI * 3 + i * 0.6) * l * 0.03;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    linear(0, 0, 0, l, ["#f4b562", "#e89a3c"]);
    ctx.translate(l / 2, l / 2);
    ctx.rotate(-Math.PI / 6);
    const faixa = l * 0.09;
    for (let i = -10; i <= 10; i += 2) {
      ctx.fillStyle = i % 4 === 0 ? "rgba(0,17,42,0.16)" : "rgba(255,255,255,0.22)";
      ctx.fillRect(-l, i * faixa + l * 0.35, l * 2, faixa * 0.55);
    }
  }
  ctx.restore();
}

/**
 * Desenha a capa inteira num quadrado de lado `l` e devolve a caixa de cada camada (frações do lado),
 * usada para as alças de arrastar. `familias` traz o font-family real de cada fonte (next/font).
 */
export function desenharCapa(ctx: Ctx, c: Composicao, l: number, familias: Record<FonteId, string>): Record<string, Caixa> {
  const caixas: Record<string, Caixa> = {};
  const tinta = FUNDOS.find((f) => f.id === c.fundo)?.tinta ?? "#ffffff";
  ctx.clearRect(0, 0, l, l);
  desenharFundo(ctx, c.fundo, l);

  for (const f of c.figurinhas) {
    const tam = l * BASE_FIGURINHA * f.escala;
    ctx.save();
    ctx.translate(f.x * l - tam / 2, f.y * l - tam / 2);
    ctx.scale(tam / 24, tam / 24);
    ctx.strokeStyle = tinta;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of FIGURINHAS[f.nome]) ctx.stroke(new Path2D(d));
    ctx.restore();
    caixas[f.uid] = { x: f.x - tam / l / 2, y: f.y - tam / l / 2, w: tam / l, h: tam / l };
  }

  const fonte = FONTES.find((f) => f.id === c.fonte) ?? FONTES[0];
  const texto = fonte.caixaAlta ? c.texto.toLocaleUpperCase("pt-BR") : c.texto;
  if (texto.trim()) {
    let tam = l * BASE_TITULO * c.titulo.escala;
    const largura = l * 0.86;
    const definir = () => { ctx.font = `${fonte.peso} ${tam}px ${familias[fonte.id]}`; };
    definir();
    let linhas = quebrarLinhas(texto, largura, (s) => ctx.measureText(s).width);
    const maior = () => Math.max(...linhas.map((s) => ctx.measureText(s).width));
    // Palavra longa demais: reduz a fonte até caber na largura (nunca corta o título).
    while (maior() > largura && tam > l * 0.03) {
      tam *= 0.92;
      definir();
      linhas = quebrarLinhas(texto, largura, (s) => ctx.measureText(s).width);
    }
    const alturaLinha = tam * fonte.entrelinha;
    const total = alturaLinha * linhas.length;
    const cx = c.titulo.x * l;
    const topo = c.titulo.y * l - total / 2;
    ctx.save();
    ctx.fillStyle = tinta;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    linhas.forEach((s, i) => ctx.fillText(s, cx, topo + alturaLinha * (i + 0.5)));
    ctx.restore();
    const w = maior();
    caixas.titulo = { x: (cx - w / 2) / l, y: topo / l, w: w / l, h: total / l };
  }
  return caixas;
}

/** Só o fundo (miniaturas do seletor). */
export function desenharSoFundo(ctx: Ctx, fundo: FundoId, l: number) {
  ctx.clearRect(0, 0, l, l);
  desenharFundo(ctx, fundo, l);
}
