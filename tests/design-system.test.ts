import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

import { fatiasDoGrafico } from "../lib/ds.ts";

describe("design system", () => {
  it("fatias do gráfico circular somam 100% e ignoram valores inválidos", () => {
    const f = fatiasDoGrafico([{ rotulo: "a", valor: 1 }, { rotulo: "b", valor: 3 }, { rotulo: "c", valor: 0 }, { rotulo: "d", valor: NaN }]);
    assert.equal(f.length, 2);
    assert.equal(f[0].frac + f[1].frac, 1);
    assert.equal(f[1].inicio, 0.25);
    assert.deepEqual(fatiasDoGrafico([]), []);
  });
  it("tokens de tema claro e destaque existem e o movimento reduzido está tratado", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /data-tema="claro"/);
    assert.match(css, /data-destaque="azul"/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });
});
