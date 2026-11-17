import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { atributosAparencia, destinoInicio, GOSTOS_INICIO, BANDAS_EQ, EQS, MAX_GOSTOS, preGanhoEq, sanearGostos, confirmouExclusao, temaClaro, emailAnonimo, mesclar, PADRAO, parseEmail, parseNome, sanear } from "../lib/preferencias/rules.ts";

describe("Configurações — preferências", () => {
  it("padrão: som e continuidade ligados, economia desligada, perfil público", () => {
    assert.deepEqual(PADRAO, {
      normalizar: true, continua: true, eq: "plano", somStories: true, economia: false, perfilPublico: true, mostrarOuvindo: true, storyBio: true,
      gostos: [], tema: "escuro", destaque: "ambar", textoMaior: false, reduzirAnimacoes: false,
    });
  });

  it("saneia: só chaves conhecidas e booleanas", () => {
    assert.deepEqual(sanear({ economia: true, continua: "não", role: "curator", __proto__: { x: 1 } }), { economia: true });
    for (const v of [null, undefined, 1, "x", [true]]) assert.deepEqual(sanear(v), {});
  });

  it("aparência: destaque só da lista; texto maior e animações booleanos", () => {
    assert.deepEqual(sanear({ destaque: "lilas", textoMaior: true, reduzirAnimacoes: false }), { destaque: "lilas", textoMaior: true, reduzirAnimacoes: false });
    for (const v of ["roxo", "", 1, true, null, "AZUL"]) assert.deepEqual(sanear({ destaque: v }), {});
    assert.deepEqual(sanear({ textoMaior: "sim" }), {});
    assert.deepEqual(sanear(JSON.parse('{"__proto__": {"destaque": "azul"}}')), {});
  });

  it("aparência vira atributos de <html> (âmbar e desligados removem o atributo)", () => {
    assert.deepEqual(atributosAparencia(PADRAO), { "data-tema": null, "data-destaque": null, "data-texto": null, "data-movimento": null });
    // Escuro é o padrão mesmo com o sistema claro (só "auto" segue o sistema).
    assert.equal(atributosAparencia(PADRAO, true)["data-tema"], null);
    assert.deepEqual(atributosAparencia({ tema: "claro", destaque: "verde", textoMaior: true, reduzirAnimacoes: true }), {
      "data-tema": "claro", "data-destaque": "verde", "data-texto": "maior", "data-movimento": "reduzido",
    });
  });

  it("equalizador: só predefinições da lista; plano é neutro; reforço ≤ +5 dB com pré-ganho", () => {
    assert.equal(PADRAO.eq, "plano");
    for (const e of EQS) assert.deepEqual(sanear({ eq: e }), { eq: e });
    for (const v of ["bass", "GRAVES", "", 3, true, null, { grave: 12 }]) assert.deepEqual(sanear({ eq: v }), {});
    assert.deepEqual(BANDAS_EQ.plano, { grave: 0, medio: 0, agudo: 0 });
    assert.equal(preGanhoEq("plano"), -0);
    for (const e of EQS) {
      const b = BANDAS_EQ[e];
      for (const db of [b.grave, b.medio, b.agudo]) assert.ok(db <= 5 && db >= -6, `${e}: ${db} dB`);
      assert.ok(preGanhoEq(e) <= 0);
    }
    assert.equal(preGanhoEq("graves"), -2.5);
  });

  it("gostos: só gêneros da lista, sem repetir, na ordem, no máx. 5; 'outro' não conta", () => {
    assert.deepEqual(sanear({ gostos: ["rock", "mpb", "rock", "xyz", 3, "outro", "jazz"] }), { gostos: ["rock", "mpb", "jazz"] });
    assert.deepEqual(sanear({ gostos: [] }), { gostos: [] });
    for (const v of ["rock", null, { 0: "rock" }, true]) assert.deepEqual(sanear({ gostos: v }), {});
    const muitos = ["rock", "mpb", "jazz", "funk", "pop", "samba", "metal"];
    assert.deepEqual(sanearGostos(muitos), muitos.slice(0, MAX_GOSTOS));
  });

  it("tema: só escuro, claro ou auto; auto segue o sistema", () => {
    for (const t of ["escuro", "claro", "auto"]) assert.deepEqual(sanear({ tema: t }), { tema: t });
    for (const v of ["dark", "CLARO", "", 1, true, null]) assert.deepEqual(sanear({ tema: v }), {});
    assert.equal(temaClaro("escuro", true), false);
    assert.equal(temaClaro("claro", false), true);
    assert.equal(temaClaro("auto", true), true);
    assert.equal(temaClaro("auto", false), false);
  });

  it("mescla da esquerda para a direita (a conta vence o aparelho quando vem depois)", () => {
    const p = mesclar({ economia: true, somStories: false }, { somStories: true }, { perfilPublico: "x" });
    assert.equal(p.economia, true);
    assert.equal(p.somStories, true);
    assert.equal(p.perfilPublico, true);
  });
});

describe("Configurações — conta", () => {
  it("exclusão só com a palavra EXCLUIR", () => {
    assert.equal(confirmouExclusao(" excluir "), true);
    assert.equal(confirmouExclusao("EXCLUIR"), true);
    for (const v of ["sim", "", null, "EXCLUI", 1]) assert.equal(confirmouExclusao(v), false);
  });

  it("nome: 1–80 caracteres, espaços colapsados", () => {
    assert.equal(parseNome("  Ana   Lu "), "Ana Lu");
    assert.equal(parseNome("   "), null);
    assert.equal(parseNome("a".repeat(81)), null);
    assert.equal(parseNome(3), null);
  });

  it("e-mail: forma simples, minúsculas", () => {
    assert.equal(parseEmail(" Ana@Exemplo.com "), "ana@exemplo.com");
    for (const v of ["ana", "ana@x", "a b@x.com", "", null]) assert.equal(parseEmail(v), null);
  });

  it("e-mail substituto da conta excluída não entrega (domínio .invalid) e é único por conta", () => {
    const e = emailAnonimo("00000000-0000-4000-8000-000000000001");
    assert.match(e, /@radioon\.invalid$/);
    assert.notEqual(e, emailAnonimo("00000000-0000-4000-8000-000000000002"));
  });
});

describe("primeiro acesso (#125, item 6)", () => {
  it("pede até 3 gêneros, dentro do limite de Seus gostos", () => {
    assert.equal(GOSTOS_INICIO, 3);
    assert.ok(GOSTOS_INICIO <= MAX_GOSTOS);
  });
  it("artista vai para enviar música; ouvinte, curador ou sem papel vão para a Home", () => {
    assert.equal(destinoInicio("artist"), "/enviar");
    for (const r of ["listener", "curator", null, undefined, "x"]) assert.equal(destinoInicio(r), "/");
  });
});
