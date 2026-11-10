import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  capaGerada,
  descobertas,
  formatContagem,
  formatDuracao,
  horaEmBrasilia,
  ouvindoAgora,
  programacao,
  rankingEmAlta,
  type Programa,
} from "../lib/radio/rules.ts";

const AGORA = Date.parse("2026-11-10T15:00:00Z");
const h = (horas: number) => new Date(AGORA - horas * 3600 * 1000).toISOString();
const dias = (d: number) => h(d * 24);

describe("formatação", () => {
  it("duração e contagem", () => {
    assert.equal(formatDuracao(185), "3:05");
    assert.equal(formatDuracao(null), "");
    assert.equal(formatContagem(999), "999");
    assert.equal(formatContagem(1200), "1,2 mil");
    assert.equal(formatContagem(25000), "25 mil");
  });
});

describe("rankingEmAlta", () => {
  const faixas = [
    { id: "a", createdAt: dias(60) },
    { id: "b", createdAt: dias(60) },
    { id: "c", createdAt: dias(2) },
    { id: "d", createdAt: dias(60) },
  ];
  const e = (id: string, quando: string) => ({ track_id: id, started_at: quando });
  const escutas = [
    e("a", dias(1)), e("a", dias(2)), e("a", dias(3)),
    e("b", dias(1)), e("b", dias(2)),
    e("c", dias(1)),
    // semana anterior: b liderava, a era segunda
    e("b", dias(8)), e("b", dias(9)), e("b", dias(10)), e("a", dias(9)),
  ];
  const r = rankingEmAlta(faixas, escutas, AGORA);
  it("ordena pelas escutas da semana e ignora faixa sem escuta", () => {
    assert.deepEqual(r.map((x) => x.faixa.id), ["a", "b", "c"]);
    assert.deepEqual(r.map((x) => x.posicao), [1, 2, 3]);
  });
  it("tendência: subiu, desceu e novo", () => {
    assert.equal(r[0].tendencia, "up"); // era 2ª
    assert.equal(r[1].tendencia, "down"); // era 1ª
    assert.equal(r[2].tendencia, "new"); // criada há 2 dias
  });
});

describe("descobertas", () => {
  it("só pouco ouvidas e em playlists; mais playlists primeiro", () => {
    const fx = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const plays = new Map([["a", 3], ["b", 500], ["c", 10], ["d", 0]]);
    const pl = new Map([["a", 1], ["b", 4], ["c", 2]]);
    assert.deepEqual(descobertas(fx, plays, pl).map((f) => f.id), ["c", "a"]);
  });
});

describe("programação", () => {
  const p = (id: string, s: number, e: number): Programa => ({ id, title: id, startHour: s, endHour: e, curatorName: null, playlistId: "x" });
  const lista = [p("manhã", 6, 12), p("tarde", 12, 18), p("noite", 18, 24)];
  it("atual e próximo", () => {
    const r = programacao(lista, 13);
    assert.equal(r.atual?.id, "tarde");
    assert.equal(r.proximo?.id, "noite");
  });
  it("próximo dá a volta no dia e atual pode não existir", () => {
    assert.equal(programacao(lista, 20).proximo?.id, "manhã");
    const r = programacao(lista, 3);
    assert.equal(r.atual, null);
    assert.equal(r.proximo?.id, "manhã");
    assert.equal(programacao([], 3).proximo, null);
  });
  it("hora em Brasília", () => {
    assert.equal(horaEmBrasilia(AGORA), 12);
  });
});

describe("ouvindoAgora", () => {
  it("conta usuários únicos com batimento nos últimos 3 min", () => {
    const l = [
      { user_id: "u1", last_beat_at: new Date(AGORA - 30_000).toISOString() },
      { user_id: "u1", last_beat_at: new Date(AGORA - 60_000).toISOString() },
      { user_id: "u2", last_beat_at: new Date(AGORA - 120_000).toISOString() },
      { user_id: "u3", last_beat_at: new Date(AGORA - 600_000).toISOString() },
      { user_id: "u4", last_beat_at: null },
    ];
    assert.equal(ouvindoAgora(l, AGORA), 2);
  });
});

describe("capaGerada", () => {
  it("é determinística e usa a inicial", () => {
    assert.deepEqual(capaGerada("Aurora"), capaGerada(" aurora "));
    assert.equal(capaGerada("aurora").letra, "A");
    assert.match(capaGerada("x").fundo, /^linear-gradient\(/);
  });
});

import { progressoMeta, resumirMinhaRadio } from "../lib/radio/minha.ts";

describe("minha rádio", () => {
  it("resume escutas, minutos e descobertas", () => {
    const eventos = [
      { track_id: "a", seconds_listened: 90, is_valid: true },
      { track_id: "a", seconds_listened: 45, is_valid: true },
      { track_id: "b", seconds_listened: 20, is_valid: false },
      { track_id: "c", seconds_listened: 60, is_valid: true },
    ];
    const totais = new Map([["a", 3], ["b", 1], ["c", 900]]);
    assert.deepEqual(resumirMinhaRadio(eventos, totais), { escutas: 3, minutos: 3, descobertas: 1 });
  });
  it("progresso da meta fica entre 0 e 100", () => {
    assert.equal(progressoMeta(50, 200), 25);
    assert.equal(progressoMeta(500, 200), 100);
    assert.equal(progressoMeta(10, 0), 0);
  });
});

import { parseNota, parsePrograma } from "../lib/radio/programa.ts";

describe("curadoria", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";
  const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  it("programa válido e inválidos", () => {
    assert.deepEqual(parsePrograma(form({ titulo: " Manhã ", playlist: uuid, inicio: "6", fim: "12" })), {
      title: "Manhã", playlistId: uuid, startHour: 6, endHour: 12,
    });
    assert.equal(parsePrograma(form({ titulo: "x", playlist: uuid, inicio: "12", fim: "6" })), null);
    assert.equal(parsePrograma(form({ titulo: "x", playlist: "nope", inicio: "1", fim: "2" })), null);
    assert.equal(parsePrograma(form({ titulo: "", playlist: uuid, inicio: "1", fim: "2" })), null);
    assert.equal(parsePrograma(form({ titulo: "x", playlist: uuid, inicio: "20", fim: "25" })), null);
  });
  it("nota: vazio apaga, longa é recusada", () => {
    assert.equal(parseNota("  bom  "), "bom");
    assert.equal(parseNota("  "), null);
    assert.equal(parseNota("x".repeat(281)), undefined);
    assert.equal(parseNota(3), undefined);
  });
});
