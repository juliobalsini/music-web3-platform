import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { destaquesDoTemaAnterior, inicioDaSemana, marcadasNaSemana, semanaIso, semanaValida, temaAtual, temaDa, TEMAS_DEFINIDOS, TEMAS_RODIZIO } from "../lib/playlists/tema.ts";

const t = (s: string) => Date.parse(s);

describe("Tema da semana — semana ISO", () => {
  it("bate com o calendário ISO (virada de ano incluída)", () => {
    assert.equal(semanaIso(t("2026-11-16T00:00:00Z")), "2026-47"); // segunda
    assert.equal(semanaIso(t("2026-11-22T23:59:59Z")), "2026-47"); // domingo
    assert.equal(semanaIso(t("2026-11-23T00:00:00Z")), "2026-48");
    assert.equal(semanaIso(t("2021-01-03T12:00:00Z")), "2020-53");
    assert.equal(semanaIso(t("2024-12-30T12:00:00Z")), "2025-01");
    assert.equal(semanaIso(t("2026-01-01T12:00:00Z")), "2026-01");
    assert.equal(semanaIso(t("2027-01-01T12:00:00Z")), "2026-53");
  });

  it("início da semana é segunda 00:00 UTC", () => {
    assert.equal(new Date(inicioDaSemana(t("2026-11-19T15:00:00Z"))).toISOString(), "2026-11-16T00:00:00.000Z");
    assert.equal(new Date(inicioDaSemana(t("2026-11-22T23:00:00Z"))).toISOString(), "2026-11-16T00:00:00.000Z");
  });

  it("tema definido pela conta oficial vence o rodízio; o rodízio é estável", () => {
    assert.deepEqual(temaDa("2026-47"), TEMAS_DEFINIDOS["2026-47"]);
    assert.ok(TEMAS_RODIZIO.includes(temaDa("2026-50")));
    assert.deepEqual(temaDa("2026-50"), temaDa("2026-50"));
    assert.notDeepEqual(temaDa("2026-50"), temaDa("2026-51"));
    assert.equal(temaAtual(t("2026-11-18T10:00:00Z")).semana, "2026-47");
  });

  it("valida o formato da semana", () => {
    assert.equal(semanaValida("2026-47"), true);
    assert.equal(semanaValida("2026-4"), false);
    assert.equal(semanaValida(null), false);
  });
});

describe("Tema da semana — hub", () => {
  const agora = t("2026-11-25T12:00:00Z"); // semana 48; anterior = 47 (16–22/11)
  const pls = [
    { id: "a", tema: "2026-47" },
    { id: "b", tema: "2026-47" },
    { id: "c", tema: "2026-48" },
    { id: "d", tema: null },
    { id: "e", tema: "2026-46" },
  ];

  it("marcadas: só as da semana atual", () => {
    assert.deepEqual(marcadasNaSemana(pls, agora), ["c"]);
  });

  it("destaques: mais salvas durante a semana anterior entre as marcadas com o tema dela", () => {
    const sv = [
      { playlistId: "a", createdAt: "2026-11-17T10:00:00Z" },
      { playlistId: "b", createdAt: "2026-11-18T10:00:00Z" },
      { playlistId: "b", createdAt: "2026-11-22T23:59:00Z" },
      { playlistId: "a", createdAt: "2026-11-23T00:00:01Z" }, // já na semana atual: não conta
      { playlistId: "a", createdAt: "2026-11-15T23:00:00Z" }, // antes da semana: não conta
      { playlistId: "d", createdAt: "2026-11-18T10:00:00Z" }, // sem tema
      { playlistId: "e", createdAt: "2026-11-18T10:00:00Z" }, // tema de outra semana
    ];
    assert.deepEqual(destaquesDoTemaAnterior(pls, sv, agora), [{ id: "b", salvos: 2 }, { id: "a", salvos: 1 }]);
  });

  it("sem salvamento não há destaque", () => {
    assert.deepEqual(destaquesDoTemaAnterior(pls, [], agora), []);
  });
});
