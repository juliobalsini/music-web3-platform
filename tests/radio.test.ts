import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  rankingPlaylistsPorEscutas,
  buscar,
  lerBusca,
  normalizarBusca,
  capaGerada,
  fluxoRadio,
  menosOuvidas,
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
  it("títulos diferentes dão pares de cores/glifos diferentes", () => {
    const titulos = ["Aurora", "Faróis", "Ondas curtas", "Vitrola azul", "Porto sem pressa", "Sinal âmbar"];
    const assinaturas = new Set(titulos.map((t) => { const c = capaGerada(t); return `${c.cor}|${c.cor2}`; }));
    assert.equal(assinaturas.size, titulos.length);
    const c = capaGerada("Aurora");
    assert.match(c.cor, /^hsl\(/);
    assert.ok(c.aneis >= 0 && c.aneis <= 4);
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

describe("busca", () => {
  const itens = [{ t: "Faróis", a: "Ana Lúcia" }, { t: "Maré de domingo", a: "Beto" }];
  const campos = (i: { t: string; a: string }) => [i.t, i.a];
  it("ignora acento e caixa", () => {
    assert.equal(normalizarBusca("  FARÓIS  "), "farois");
    assert.deepEqual(buscar(itens, "farois", campos), [itens[0]]);
  });
  it("exige todos os termos, em qualquer campo", () => {
    assert.deepEqual(buscar(itens, "mare beto", campos), [itens[1]]);
    assert.deepEqual(buscar(itens, "mare ana", campos), []);
  });
  it("consulta vazia devolve tudo; lerBusca limita", () => {
    assert.equal(buscar(itens, "  ", campos).length, 2);
    assert.equal(lerBusca(undefined), "");
    assert.equal(lerBusca("x".repeat(100)).length, 60);
    assert.equal(lerBusca(["a", "b"]), "a");
  });
});

describe("rankingPlaylistsPorEscutas", () => {
  const agora = Date.parse("2026-11-10T12:00:00Z");
  const pl = (id: string, faixas: string[], criada = "2026-11-01T00:00:00Z") => ({ id, created_at: criada, playlist_tracks: faixas.map((track_id) => ({ track_id })) });
  const ouvida = (track_id: string, started_at = "2026-11-09T12:00:00Z") => ({ track_id, started_at });
  it("ordena por escutas válidas da semana, não por nº de faixas", () => {
    const grande = pl("grande", ["a", "b", "c"]);
    const pequena = pl("pequena", ["d"]);
    const r = rankingPlaylistsPorEscutas([grande, pequena], [ouvida("d"), ouvida("d")], agora);
    assert.deepEqual(r.map((p) => p.id), ["pequena", "grande"]);
  });
  it("ignora escutas com mais de 7 dias; empate cai em faixas e recência", () => {
    const a = pl("a", ["x"]);
    const b = pl("b", ["y", "z"]);
    const velha = ouvida("x", "2026-10-01T00:00:00Z");
    assert.deepEqual(rankingPlaylistsPorEscutas([a, b], [velha], agora).map((p) => p.id), ["b", "a"]);
    const c = pl("c", ["w"], "2026-11-05T00:00:00Z");
    assert.deepEqual(rankingPlaylistsPorEscutas([a, c], [], agora).map((p) => p.id), ["c", "a"]);
  });
  it("não altera a entrada", () => {
    const l = [pl("a", ["x"]), pl("b", ["y"])];
    rankingPlaylistsPorEscutas(l, [ouvida("y")], agora);
    assert.equal(l[0].id, "a");
  });
});

describe("fallbacks e fluxo da Rádio radioOn", () => {
  const f = (id: string, plays: number, likes: number, createdAt: string) => ({ id, plays, likes, createdAt });
  const base = [f("a", 10, 0, dias(1)), f("b", 0, 3, dias(5)), f("c", 40, 1, dias(9)), f("d", 2, 0, dias(0.5)), f("e", 0, 0, dias(20))];
  it("menos ouvidas: menos escutas primeiro, desempate pelo mais recente", () => {
    assert.deepEqual(menosOuvidas(base, 3).map((x) => x.id), ["b", "e", "d"]);
  });
  it("fluxo: sem repetir faixa nem a mesma em sequência, com todas as fontes", () => {
    const fluxo = fluxoRadio(base);
    assert.equal(new Set(fluxo.map((x) => x.id)).size, fluxo.length);
    assert.ok(fluxo.some((x) => x.id === "d")); // novidade
    assert.ok(fluxo.some((x) => x.id === "b")); // pouco ouvida e curtida
    for (let i = 1; i < fluxo.length; i++) assert.notEqual(fluxo[i].id, fluxo[i - 1].id);
  });
  it("giro muda a partida; vazio dá vazio", () => {
    assert.notEqual(fluxoRadio(base, 1)[0].id, fluxoRadio(base, 0)[0].id);
    assert.deepEqual(fluxoRadio([]), []);
  });
});
