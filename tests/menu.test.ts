import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { acoesMinhaRadio, lerAba, lerFiltro } from "../lib/menu.ts";

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
