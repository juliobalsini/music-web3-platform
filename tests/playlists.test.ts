import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isUuid, parseTitle, rankPlaylists } from "../lib/playlists/rules.ts";

const p = (id: string, trackCount: number, createdAt: string) => ({ id, title: id, createdAt, trackCount });

describe("playlists", () => {
  it("parseTitle respeita 1–200 após trim", () => {
    assert.equal(parseTitle("  Rock  "), "Rock");
    assert.equal(parseTitle("   "), null);
    assert.equal(parseTitle("a".repeat(201)), null);
    assert.equal(parseTitle(null), null);
  });
  it("isUuid", () => {
    assert.equal(isUuid("3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f"), true);
    assert.equal(isUuid("x"), false);
  });
  it("rankPlaylists: mais faixas, desempate por recência, sem vazias", () => {
    const r = rankPlaylists([p("a", 2, "2026-01-01"), p("b", 5, "2026-01-01"), p("c", 2, "2026-02-01"), p("d", 0, "2026-03-01")]);
    assert.deepEqual(r.map((x) => x.id), ["b", "c", "a"]);
  });
});

import { trocarPosicao } from "../lib/playlists/rules.ts";

describe("trocarPosicao", () => {
  const itens = [{ trackId: "a", position: 0 }, { trackId: "b", position: 1 }, { trackId: "c", position: 4 }];
  it("troca com a vizinha", () => {
    assert.deepEqual(trocarPosicao(itens, "b", "down"), [{ trackId: "b", position: 4 }, { trackId: "c", position: 1 }]);
    assert.deepEqual(trocarPosicao(itens, "b", "up"), [{ trackId: "b", position: 0 }, { trackId: "a", position: 1 }]);
  });
  it("não move além das pontas nem faixa inexistente", () => {
    assert.equal(trocarPosicao(itens, "a", "up"), null);
    assert.equal(trocarPosicao(itens, "c", "down"), null);
    assert.equal(trocarPosicao(itens, "x", "up"), null);
  });
});
