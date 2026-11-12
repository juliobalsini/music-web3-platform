import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { caminhoPermitido, kvEmRisco, lerRange, origemPermitida, podeGravar } from "../workers/audio-proxy/src/logic.js";

const P = ["audio/stream/", "covers/"];
const cfg = { maxItem: 100, maxTotal: 1000, escritasDia: 1000, leiturasDia: 100000 };

describe("proxy: caminhos", () => {
  it("só prefixos permitidos, nunca listagem ou traversal", () => {
    assert.equal(caminhoPermitido("audio/stream/a.m4a", P), true);
    assert.equal(caminhoPermitido("audio/stream/", P), false);
    assert.equal(caminhoPermitido("", P), false);
    assert.equal(caminhoPermitido("outro/a", P), false);
    assert.equal(caminhoPermitido("audio/stream/../x", P), false);
    assert.equal(caminhoPermitido("/audio/stream/a", P), false);
  });
});
describe("proxy: CORS", () => {
  it("produção e prévias da Vercel", () => {
    const l = ["https://radioon-ten.vercel.app"];
    const re = "^https://radioon-[a-z0-9-]+-juliobalsinis-projects\\.vercel\\.app$";
    assert.equal(origemPermitida("https://radioon-ten.vercel.app", l, re), "https://radioon-ten.vercel.app");
    assert.equal(origemPermitida("https://radioon-git-x-juliobalsinis-projects.vercel.app", l, re) !== null, true);
    assert.equal(origemPermitida("https://evil.com", l, re), null);
    assert.equal(origemPermitida(null, l, re), null);
  });
});
describe("proxy: Range", () => {
  it("intervalos e sufixos", () => {
    assert.deepEqual(lerRange("bytes=0-9", 100), { ini: 0, fim: 9 });
    assert.deepEqual(lerRange("bytes=90-", 100), { ini: 90, fim: 99 });
    assert.deepEqual(lerRange("bytes=-10", 100), { ini: 90, fim: 99 });
    assert.deepEqual(lerRange("bytes=50-500", 100), { ini: 50, fim: 99 });
    assert.equal(lerRange("bytes=100-", 100), "invalido");
    assert.equal(lerRange("lixo", 100), "invalido");
    assert.equal(lerRange(null, 100), null);
  });
});
describe("proxy: limites do KV", () => {
  const ctl = (o = {}) => ({ bytes: 0, escritas: 0, leituras: 0, ...o });
  it("80% de escritas ou leituras serve direto", () => {
    assert.equal(kvEmRisco(ctl({ escritas: 799 }), cfg), false);
    assert.equal(kvEmRisco(ctl({ escritas: 800 }), cfg), true);
    assert.equal(kvEmRisco(ctl({ leituras: 80000 }), cfg), true);
  });
  it("não grava item grande nem acima do total", () => {
    assert.equal(podeGravar(50, ctl(), cfg), true);
    assert.equal(podeGravar(101, ctl(), cfg), false);
    assert.equal(podeGravar(50, ctl({ bytes: 960 }), cfg), false);
  });
});
