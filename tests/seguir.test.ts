import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { paraSeguidos, podeSeguir } from "../lib/seguir/rules.ts";

describe("seguir", () => {
  it("não segue a si mesmo nem o perfil oficial; visitante vê o botão (vai ao login)", () => {
    assert.equal(podeSeguir("a", "b", "p"), true);
    assert.equal(podeSeguir("a", "a", "p"), false);
    assert.equal(podeSeguir("a", "p", "p"), false);
    assert.equal(podeSeguir(null, "b", "p"), true);
  });

  it("monta a lista do mais recente, com nome padrão e join em objeto ou lista", () => {
    const r = paraSeguidos([
      { followed_id: "1", created_at: "2026-11-01T00:00:00Z", profiles: { display_name: "Ana" } },
      { followed_id: "2", created_at: "2026-11-03T00:00:00Z", profiles: [{ display_name: "  " }] },
      { followed_id: "3", created_at: "2026-11-02T00:00:00Z", profiles: null },
    ]);
    assert.deepEqual(r.map((x) => [x.id, x.nome]), [["2", "Perfil"], ["3", "Perfil"], ["1", "Ana"]]);
  });
});
