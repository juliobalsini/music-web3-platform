import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  capaMosaico,
  destinoArraste,
  deveRemoverAoDeslizar,
  generoPredominante,
  inicioDaPrevia,
  PREVIA_SEGUNDOS,
  sugestoes,
} from "../lib/playlists/sugestoes.ts";

const f = (id: string, o: Partial<{ genre: string | null; mood: string | null; likes: number; plays: number; createdAt: string }> = {}) => ({
  id,
  genre: null,
  mood: null,
  likes: 0,
  plays: 0,
  createdAt: "2026-11-01",
  ...o,
});

describe("editor de playlist (#122)", () => {
  it("generoPredominante: mais frequente; sem gênero → null", () => {
    assert.equal(generoPredominante([f("a", { genre: "jazz" }), f("b", { genre: "rock" }), f("c", { genre: "rock" })]), "rock");
    assert.equal(generoPredominante([f("a"), f("b")]), null);
    assert.equal(generoPredominante([]), null);
  });

  it("sugestoes: ordem clima → gênero → recentes → curtidas, sem repetir nem sugerir o que já está", () => {
    const cat = [
      f("c1", { mood: "chuva", likes: 1 }),
      f("c2", { mood: "chuva", likes: 5, genre: "jazz" }),
      f("j1", { genre: "jazz", plays: 3 }),
      f("na", { genre: "jazz", mood: "chuva" }),
      f("r1"),
      f("k1", { likes: 9 }),
    ];
    const g = sugestoes(cat, { naPlaylist: new Set(["na"]), clima: "chuva", genero: "jazz", recentes: ["r1", "c1", "x"], curtidas: new Set(["k1", "c2"]) });
    assert.deepEqual(g.map((x) => x.id), ["clima", "genero", "recentes", "curtidas"]);
    assert.equal(g[0].titulo, "Agora combina com Chuva");
    assert.deepEqual(g[0].faixas.map((x) => x.id), ["c2", "c1"]);
    assert.deepEqual(g[1].faixas.map((x) => x.id), ["j1"]);
    assert.equal(g[1].titulo, "Mais Jazz");
    assert.deepEqual(g[2].faixas.map((x) => x.id), ["r1"]);
    assert.deepEqual(g[3].faixas.map((x) => x.id), ["k1"]);
  });

  it("sugestoes: grupo vazio some e respeita o limite", () => {
    const cat = Array.from({ length: 10 }, (_, i) => f(`m${i}`, { mood: "foco" }));
    const g = sugestoes(cat, { naPlaylist: new Set(), clima: "foco", genero: null, recentes: [], curtidas: new Set(), limite: 4 });
    assert.equal(g.length, 1);
    assert.equal(g[0].faixas.length, 4);
    assert.deepEqual(sugestoes(cat, { naPlaylist: new Set(), clima: "pista", genero: null, recentes: [], curtidas: new Set() }), []);
  });

  it("capaMosaico", () => {
    assert.deepEqual(capaMosaico([]), { tipo: "arte" });
    assert.deepEqual(capaMosaico([1, 2]), { tipo: "unica", faixa: 1 });
    assert.deepEqual(capaMosaico([1, 2, 3, 4, 5]), { tipo: "mosaico", faixas: [1, 2, 3, 4] });
  });

  it("inicioDaPrevia: ~30%, sem passar do fim; curta → 0", () => {
    assert.equal(inicioDaPrevia(null), 0);
    assert.equal(inicioDaPrevia(25), 0);
    assert.equal(inicioDaPrevia(200), 60);
    const d = 31;
    assert.ok(inicioDaPrevia(d) + PREVIA_SEGUNDOS <= d);
  });

  it("destinoArraste e deslizar", () => {
    assert.equal(destinoArraste(0, 130, 64, 5), 2);
    assert.equal(destinoArraste(2, -500, 64, 5), 0);
    assert.equal(destinoArraste(1, 20, 64, 5), 1);
    assert.equal(destinoArraste(3, 1000, 64, 5), 4);
    assert.equal(deveRemoverAoDeslizar(-120), true);
    assert.equal(deveRemoverAoDeslizar(-40), false);
    assert.equal(deveRemoverAoDeslizar(150), false);
  });
});
