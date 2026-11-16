import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { linhas, markdown } from "../scripts/lighthouse-resumo.mjs";

const lhr = (lcp: number, cls: number, tbt: number, perf = 0.9) => ({
  audits: {
    "largest-contentful-paint": { numericValue: lcp },
    "cumulative-layout-shift": { numericValue: cls },
    "total-blocking-time": { numericValue: tbt },
  },
  categories: { performance: { score: perf } },
});

describe("lighthouse-resumo", () => {
  it("marca o que passa e o que estoura o orçamento", () => {
    const [d] = linhas([{ url: "http://localhost:3000/explorar", lhr: lhr(2400, 0.2, 301, 0.71) }]);
    assert.equal(d.caminho, "/explorar");
    assert.equal(d.perf, 71);
    assert.deepEqual(d.celulas, ["2.40 s ✅", "0.200 ⚠️", "301 ms ⚠️"]);
  });
  it("métrica ausente vira traço e a tabela tem uma linha por página", () => {
    const dados = linhas([
      { url: "http://localhost:3000/", lhr: { audits: {}, categories: {} } },
      { url: "http://localhost:3000/faixa/x", lhr: lhr(1000, 0, 0) },
    ]);
    assert.deepEqual(dados[0].celulas, ["—", "—", "—"]);
    assert.equal(dados[0].perf, null);
    const md = markdown(dados);
    assert.match(md, /\| `\/` \| — \| — \| — \| — \|/);
    assert.match(md, /\| `\/faixa\/x` \| 90 \| 1\.00 s ✅ \| 0\.000 ✅ \| 0 ms ✅ \|/);
  });
});
