import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  adicionarFigurinha, atualizarCamada, composicaoInicial, desenharCapa, ESCALA_MAX, ESCALA_MIN, FIGURINHAS, FONTES, FUNDOS,
  limitarCamada, MAX_FIGURINHAS, MAX_TITULO, quebrarLinhas, removerFigurinha, type Composicao,
} from "../lib/playlists/estudio-capa.ts";

const medir = (s: string) => s.length * 10;

/** Canvas 2D falso: aceita qualquer chamada; mede texto por caracteres × tamanho da fonte × 0,5. */
function ctxFalso() {
  const textos: string[] = [];
  let px = 10;
  const alvo: Record<string, unknown> = {
    fillText: (s: string) => textos.push(s),
    measureText: (s: string) => ({ width: s.length * px * 0.5 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  const ctx = new Proxy(alvo, {
    get: (t, k: string) => (k in t ? t[k] : () => undefined),
    set: (t, k: string, v) => {
      if (k === "font") px = Number(/(\d+(?:\.\d+)?)px/.exec(String(v))?.[1] ?? 10);
      t[k] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, textos };
}
const FAM = { geist: "Geist", serifa: "Fraunces", cartaz: "Bebas" };

describe("mini editor de capa: catálogo", () => {
  it("6 fundos, 3 fontes e 12 figurinhas com ids únicos", () => {
    assert.equal(FUNDOS.length, 6);
    assert.equal(FONTES.length, 3);
    assert.equal(Object.keys(FIGURINHAS).length, 12);
    assert.equal(new Set(FUNDOS.map((f) => f.id)).size, 6);
  });
  it("cada figurinha tem traços SVG válidos (começam com moveto)", () => {
    for (const [nome, tracos] of Object.entries(FIGURINHAS)) {
      assert.ok(tracos.length > 0, nome);
      for (const d of tracos) assert.match(d, /^[Mm]/, nome);
    }
  });
});

describe("mini editor de capa: camadas", () => {
  it("composição inicial usa o título da playlist, cortado no limite", () => {
    const c = composicaoInicial(`  ${"a".repeat(80)}  `);
    assert.equal(c.texto.length, MAX_TITULO);
    assert.equal(c.figurinhas.length, 1);
  });
  it("limita posição à capa e escala ao intervalo", () => {
    assert.deepEqual(limitarCamada({ x: -1, y: 2, escala: 9 }), { x: 0.04, y: 0.96, escala: ESCALA_MAX });
    assert.equal(limitarCamada({ x: Number.NaN, y: 0.5, escala: 0 }).escala, ESCALA_MIN);
  });
  it("atualiza só a camada alvo", () => {
    const c = composicaoInicial("Jazz");
    const d = atualizarCamada(c, "titulo", (k) => ({ ...k, x: k.x + 0.1 }));
    assert.equal(d.titulo.x, 0.6);
    assert.deepEqual(d.figurinhas, c.figurinhas);
    const e = atualizarCamada(c, "f0", (k) => ({ ...k, escala: 5 }));
    assert.equal(e.figurinhas[0].escala, ESCALA_MAX);
    assert.equal(e.figurinhas[0].nome, "vinil");
  });
  it("adiciona figurinhas com uid novo até o máximo", () => {
    let c: Composicao = composicaoInicial("x");
    const uids = new Set(["f0"]);
    for (let i = 1; i < MAX_FIGURINHAS; i++) {
      const r = adicionarFigurinha(c, "nota");
      assert.ok(r.uid && !uids.has(r.uid));
      uids.add(r.uid!);
      c = r.comp;
    }
    const cheio = adicionarFigurinha(c, "coracao");
    assert.equal(cheio.uid, null);
    assert.equal(cheio.comp.figurinhas.length, MAX_FIGURINHAS);
  });
  it("uid não colide depois de remover", () => {
    let c = adicionarFigurinha(composicaoInicial("x"), "nota").comp; // f0, f1
    c = removerFigurinha(c, "f0");
    const r = adicionarFigurinha(c, "piano");
    assert.notEqual(r.uid, "f1");
    assert.equal(new Set(r.comp.figurinhas.map((f) => f.uid)).size, 2);
  });
  it("ignora figurinha desconhecida", () => {
    const c = composicaoInicial("x");
    assert.equal(adicionarFigurinha(c, "caveira" as never).uid, null);
  });
});

describe("mini editor de capa: título", () => {
  it("quebra por palavras na largura", () => {
    assert.deepEqual(quebrarLinhas("Jazz para domingo de manhã", 120, medir), ["Jazz para", "domingo de", "manhã"]);
  });
  it("no máx. 3 linhas: o resto vai para a última", () => {
    assert.deepEqual(quebrarLinhas("a b c d e", 10, medir), ["a", "b", "c d e"]);
  });
  it("texto vazio não gera linhas", () => {
    assert.deepEqual(quebrarLinhas("   ", 100, medir), []);
  });
  it("desenha o título e devolve caixas dentro da capa; Cartaz em caixa alta", () => {
    const { ctx, textos } = ctxFalso();
    const c: Composicao = { ...composicaoInicial("Noite de jazz"), figurinhas: [], fonte: "cartaz" };
    const caixas = desenharCapa(ctx, c, 1000, FAM);
    assert.deepEqual(textos, ["NOITE DE JAZZ"]);
    const t = caixas.titulo;
    assert.ok(t.x >= 0 && t.x + t.w <= 1 && t.y >= 0 && t.y + t.h <= 1);
  });
  it("palavra longa demais reduz a fonte até caber (não corta)", () => {
    const { ctx, textos } = ctxFalso();
    const longa = "Supercalifragilisticexpialidocious";
    const c: Composicao = { ...composicaoInicial(longa), figurinhas: [], titulo: { x: 0.5, y: 0.5, escala: ESCALA_MAX } };
    const caixas = desenharCapa(ctx, c, 1000, FAM);
    assert.deepEqual(textos, [longa]);
    assert.ok(caixas.titulo.w <= 0.86 + 1e-9);
  });
  it("sem texto, sem caixa de título", () => {
    const { ctx } = ctxFalso();
    assert.equal(desenharCapa(ctx, { ...composicaoInicial(""), figurinhas: [] }, 500, FAM).titulo, undefined);
  });
});

describe("mini editor de capa: integração", () => {
  const editor = readFileSync(new URL("../components/capa-editor.tsx", import.meta.url), "utf8");
  const estudio = readFileSync(new URL("../components/estudio-capa.tsx", import.meta.url), "utf8");
  it("o painel da capa oferece Criar capa e envia pela mesma rota assinada", () => {
    assert.match(editor, /Criar capa/);
    assert.match(editor, /<EstudioCapa/);
    assert.match(editor, /\/api\/playlists\/\$\{id\}\/capa/);
  });
  it("a imagem é PNG gerado no canvas, com JPEG só se passar do limite", () => {
    assert.match(estudio, /toBlob\(r, "image\/png"\)/);
    assert.match(estudio, /MAX_COVER_BYTES/);
  });
});
