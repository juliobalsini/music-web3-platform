import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mostraTrilha, passosDaTrilha, progressoTrilha } from "../lib/artista/trilha.ts";

const base = { bio: null, foto: null, faixas: 1, storiesComTrecho: 0, emPlaylists: 0, compartilhou: false };

describe("trilha do artista", () => {
  it("só aparece depois do primeiro envio", () => {
    assert.equal(mostraTrilha(0), false);
    assert.equal(mostraTrilha(1), true);
  });
  it("5 passos na ordem, nenhum feito no começo", () => {
    const p = passosDaTrilha(base);
    assert.deepEqual(p.map((x) => x.id), ["perfil", "segunda", "story", "compartilhar", "playlist"]);
    assert.deepEqual(progressoTrilha(p), { feitos: 0, total: 5, completa: false });
  });
  it("perfil completo exige foto e frase", () => {
    assert.equal(passosDaTrilha({ ...base, bio: "  ", foto: "x" })[0].feito, false);
    assert.equal(passosDaTrilha({ ...base, bio: "Oi", foto: null })[0].feito, false);
    assert.equal(passosDaTrilha({ ...base, bio: "Oi", foto: "x" })[0].feito, true);
  });
  it("completa com tudo feito", () => {
    const p = passosDaTrilha({ bio: "Oi", foto: "x", faixas: 2, storiesComTrecho: 1, emPlaylists: 3, compartilhou: true });
    assert.deepEqual(progressoTrilha(p), { feitos: 5, total: 5, completa: true });
  });
});
