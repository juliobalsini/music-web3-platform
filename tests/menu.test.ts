import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { abaVizinha, acoesMinhaRadio, direcaoDoGesto, filtrosVisiveis, lerAba, lerFiltro } from "../lib/menu.ts";

describe("acoesMinhaRadio", () => {
  it("artista envia música", () => {
    assert.deepEqual(acoesMinhaRadio("artist").map((i) => i.href), ["/enviar"]);
  });
  it("curador vai às playlists", () => {
    assert.deepEqual(acoesMinhaRadio("curator").map((i) => i.href), ["/curador"]);
  });
  it("sem perfil escolhe perfil; ouvinte não tem atalho", () => {
    assert.deepEqual(acoesMinhaRadio(null).map((i) => i.href), ["/onboarding"]);
    assert.deepEqual(acoesMinhaRadio("listener"), []);
  });
});

describe("filtros e abas da Rádio", () => {
  it("valores inválidos caem no padrão", () => {
    assert.equal(lerFiltro("xyz"), "tudo");
    assert.equal(lerFiltro(["playlists"]), "playlists");
    assert.equal(lerAba("xyz"), null);
    assert.equal(lerAba("alta"), "alta");
  });
});

describe("filtros visíveis e gesto entre abas", () => {
  it("Álbuns e Stories só aparecem com conteúdo", () => {
    assert.deepEqual(filtrosVisiveis({ albuns: false, stories: false }).map((f) => f.id), ["tudo", "faixas", "playlists"]);
    assert.deepEqual(filtrosVisiveis({ albuns: true, stories: true }).map((f) => f.id), ["tudo", "faixas", "albuns", "playlists", "stories"]);
  });
  it("aba vizinha não dá a volta", () => {
    assert.equal(abaVizinha("descobertas", 1), "alta");
    assert.equal(abaVizinha("descobertas", -1), "descobertas");
    assert.equal(abaVizinha("novidades", 1), "novidades");
  });
  it("gesto: horizontal e longo o bastante", () => {
    assert.equal(direcaoDoGesto(-80, 5), 1);
    assert.equal(direcaoDoGesto(80, 5), -1);
    assert.equal(direcaoDoGesto(-20, 0), 0);
    assert.equal(direcaoDoGesto(-80, 70), 0);
  });
});
