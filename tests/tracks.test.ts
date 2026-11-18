import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { agregarMetricas, resumoArtista, variacaoSemana } from "../lib/tracks/rules.ts";

describe("métricas", () => {
  it("conta só escutas válidas e ouvintes únicos", () => {
    const m = agregarMetricas([
      { track_id: "a", user_id: "u1", is_valid: true },
      { track_id: "a", user_id: "u1", is_valid: true },
      { track_id: "a", user_id: "u2", is_valid: true },
      { track_id: "a", user_id: "u3", is_valid: false },
      { track_id: "b", user_id: "u1", is_valid: false },
    ]);
    assert.deepEqual(m.get("a"), { trackId: "a", escutas: 3, ouvintes: 2 });
    assert.equal(m.has("b"), false);
  });
});

describe("aba Artista (#125, item 3)", () => {
  const agora = Date.parse("2026-11-18T15:00:00Z");
  const dia = (d: number) => new Date(agora - d * 86400000).toISOString();
  const faixas = [{ id: "t1", title: "Um" }, { id: "t2", title: "Dois" }];

  it("ouvintes únicos, reproduções válidas, mais tocada e 7 dias (hoje por último)", () => {
    const r = resumoArtista(
      [
        { track_id: "t1", user_id: "a", is_valid: true, started_at: dia(0) },
        { track_id: "t2", user_id: "a", is_valid: true, started_at: dia(1) },
        { track_id: "t2", user_id: "b", is_valid: true, started_at: dia(6) },
        { track_id: "t2", user_id: "c", is_valid: true, started_at: dia(8) },
        { track_id: "t1", user_id: "d", is_valid: false, started_at: dia(0) },
      ],
      faixas,
      agora,
    );
    assert.equal(r.ouvintes, 3);
    assert.equal(r.reproducoes, 4);
    assert.deepEqual(r.maisTocada, { id: "t2", title: "Dois", reproducoes: 3 });
    assert.equal(r.dias.length, 7);
    assert.equal(r.dias[6].rotulo, "hoje");
    assert.equal(r.dias[6].valor, 1);
    assert.equal(r.dias[5].valor, 1);
    assert.equal(r.dias[0].valor, 1);
    assert.equal(r.dias[5].rotulo, "ter 17");
    assert.equal(r.semana, 3);
    assert.equal(r.semanaAnterior, 1);
  });

  it("sem escutas: zeros e sem mais tocada", () => {
    const r = resumoArtista([], faixas, agora);
    assert.equal(r.maisTocada, null);
    assert.equal(r.dias.every((d) => d.valor === 0), true);
  });

  it("variação contra os 7 dias anteriores", () => {
    assert.equal(variacaoSemana(3, 0), null);
    assert.equal(variacaoSemana(15, 10), "Mais 50% que nos 7 dias anteriores");
    assert.equal(variacaoSemana(5, 10), "Menos 50% que nos 7 dias anteriores");
    assert.equal(variacaoSemana(10, 10), "Igual aos 7 dias anteriores");
  });
});
