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
