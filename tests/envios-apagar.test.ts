import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DIAS_DESFAZER, diasRestantes, inicioJanela, isTipoEnvio, parseTituloEnvio, podeDesfazer, TABELA } from "../lib/envios/rules.ts";

const DIA = 24 * 60 * 60 * 1000;
const agora = Date.parse("2026-11-15T12:00:00Z");

describe("exclusão lógica (Meus envios)", () => {
  it("desfaz só dentro de 30 dias", () => {
    assert.equal(DIAS_DESFAZER, 30);
    assert.equal(podeDesfazer(new Date(agora - DIA).toISOString(), agora), true);
    assert.equal(podeDesfazer(new Date(agora - 30 * DIA + 1000).toISOString(), agora), true);
    assert.equal(podeDesfazer(new Date(agora - 30 * DIA).toISOString(), agora), false);
    assert.equal(podeDesfazer(null, agora), false);
    assert.equal(podeDesfazer("ontem", agora), false);
  });

  it("conta os dias que restam (arredonda para cima, nunca negativo)", () => {
    assert.equal(diasRestantes(new Date(agora).toISOString(), agora), 30);
    assert.equal(diasRestantes(new Date(agora - 29.5 * DIA).toISOString(), agora), 1);
    assert.equal(diasRestantes(new Date(agora - 40 * DIA).toISOString(), agora), 0);
    assert.equal(diasRestantes("x", agora), 0);
  });

  it("janela da lista de apagados começa 30 dias atrás", () => {
    assert.equal(inicioJanela(agora), new Date(agora - 30 * DIA).toISOString());
  });

  it("aceita só os quatro tipos e sempre filtra pela coluna do dono", () => {
    for (const t of ["faixa", "album", "playlist", "story"]) assert.equal(isTipoEnvio(t), true);
    for (const t of ["profiles", "", null, 1, "points_ledger"]) assert.equal(isTipoEnvio(t), false);
    assert.deepEqual(Object.values(TABELA).map((x) => `${x.tabela}.${x.dono}`), ["tracks.artist_id", "albums.artist_id", "playlists.curator_id", "stories.author_id"]);
  });

  it("título editado: trim, espaços colapsados, limite do banco", () => {
    assert.equal(parseTituloEnvio("  Nova   faixa \n", 200), "Nova faixa");
    assert.equal(parseTituloEnvio("   ", 200), null);
    assert.equal(parseTituloEnvio("a".repeat(121), 120), null);
    assert.equal(parseTituloEnvio(42, 120), null);
  });
});
