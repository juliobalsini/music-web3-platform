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
    // Configurações > Aparência: cada destaque tem token escuro e claro, e os utilitários brand seguem o token.
    for (const c of ["azul", "verde", "rosa", "lilas"]) {
      assert.match(css, new RegExp(`:root\\[data-destaque="${c}"\\]`));
      assert.match(css, new RegExp(`\\[data-tema="claro"\\]\\[data-destaque="${c}"\\]`));
    }
    assert.match(css, /--color-brand: var\(--ds-destaque\)/);
    // Tema claro: utilitários de cor seguem tokens; telas imersivas ficam escuras.
    for (const t of ["tinta: var(--ds-texto)", "fundo: var(--ds-bg)", "fundo-2: var(--ds-bg-2)", "sobre-destaque: var(--ds-sobre-destaque)"]) {
      assert.ok(css.includes(`--color-${t}`), t);
    }
    assert.match(css, /\.tema-escuro \{/);
    assert.match(css, /:root\[data-movimento="reduzido"\]/);
    assert.match(css, /:root\[data-texto="maior"\]/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });
});
