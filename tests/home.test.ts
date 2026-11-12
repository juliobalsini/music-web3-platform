import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { artistasParaConhecer, climaAgora, ehSelecao, prateleiraClima, selecaoRadioOn, totalOuvindo } from "../lib/radio/home.ts";

// 2026-11-11 é quarta-feira. Brasília = UTC−3.
const em = (iso: string, horaBr: number) => Date.parse(`${iso}T00:00:00Z`) + (horaBr + 3) * 3600_000;

describe("climaAgora (Brasília)", () => {
  it("madrugada 0–5h, foco 6–11h, estrada 17–20h, chuva nos demais", () => {
    assert.equal(climaAgora(em("2026-11-11", 3)), "madrugada");
    assert.equal(climaAgora(em("2026-11-11", 8)), "foco");
    assert.equal(climaAgora(em("2026-11-11", 14)), "chuva");
    assert.equal(climaAgora(em("2026-11-11", 18)), "estrada");
    assert.equal(climaAgora(em("2026-11-11", 22)), "chuva");
  });
  it("pista na sexta e no sábado à noite; domingo aos domingos", () => {
    assert.equal(climaAgora(em("2026-11-13", 22)), "pista");
    assert.equal(climaAgora(em("2026-11-14", 23)), "pista");
    assert.equal(climaAgora(em("2026-11-14", 15)), "chuva");
    assert.equal(climaAgora(em("2026-11-15", 9)), "domingo");
    assert.equal(climaAgora(em("2026-11-15", 2)), "madrugada");
  });
  it("usa o fuso de Brasília, não o UTC", () => {
    // 02:00 UTC de quinta = 23:00 de quarta em Brasília.
    assert.equal(climaAgora(Date.parse("2026-11-12T02:00:00Z")), "chuva");
  });
});

const F = (id: string, mood: string | null, genre: string | null, createdAt: string, artistId = "a1") => ({ id, mood, genre, createdAt, artistId, artistName: artistId });
const AGORA = em("2026-11-11", 8);
const dias = (n: number) => new Date(AGORA - n * 86_400_000).toISOString();

describe("prateleiraClima", () => {
  it("usa faixas do clima; sem elas, chuva; sem chuva, recentes", () => {
    const fs = [F("1", "foco", null, dias(3)), F("2", "chuva", null, dias(1)), F("3", null, null, dias(0))];
    assert.deepEqual(prateleiraClima(fs, AGORA).faixas.map((f) => f.id), ["1"]);
    const so = [F("2", "chuva", null, dias(1)), F("3", null, null, dias(0))];
    const r = prateleiraClima(so, AGORA);
    assert.equal(r.clima, "chuva");
    assert.deepEqual(r.faixas.map((f) => f.id), ["2"]);
    const nada = prateleiraClima([F("3", null, null, dias(0)), F("4", null, null, dias(2))], AGORA);
    assert.equal(nada.recentes, true);
    assert.deepEqual(nada.faixas.map((f) => f.id), ["3", "4"]);
  });
});

describe("selecaoRadioOn", () => {
  const fs = [
    F("1", "foco", "rock", dias(1)), F("2", "foco", "rock", dias(2)), F("3", "chuva", "rock", dias(20)),
    F("4", null, "jazz", dias(3)), F("5", null, "jazz", dias(4)),
  ];
  it("novidades da semana, gênero com ≥3 faixas e um por clima", () => {
    const s = selecaoRadioOn(fs, AGORA);
    assert.deepEqual(s.map((x) => x.id), ["radioon-novidades", "radioon-genero-rock", "radioon-clima-foco", "radioon-clima-chuva"]);
    assert.deepEqual(s[0].faixas, ["1", "2", "4", "5"]);
    assert.ok(s.every((x) => ehSelecao(x.id)));
  });
  it("sem novidade na semana, usa as mais recentes; sem faixas, nada", () => {
    const velhas = [F("1", null, null, dias(30)), F("2", null, null, dias(31))];
    assert.deepEqual(selecaoRadioOn(velhas, AGORA)[0].faixas, ["1", "2"]);
    assert.deepEqual(selecaoRadioOn([], AGORA), []);
  });
});

describe("artistas e ouvintes", () => {
  it("artistas ordenados por nº de faixas", () => {
    const r = artistasParaConhecer([F("1", null, null, "", "b"), F("2", null, null, "", "a"), F("3", null, null, "", "a")]);
    assert.deepEqual(r.map((a) => [a.id, a.faixas]), [["a", 2], ["b", 1]]);
  });
  it("N ouvindo inclui você: nunca menos de 1", () => {
    assert.equal(totalOuvindo(0), 1);
    assert.equal(totalOuvindo(4), 5);
  });
});
