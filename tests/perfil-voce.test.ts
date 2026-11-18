import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { descobertasDaSemana, diasSeguidos, escutasProprias, fatiasDeGeneros, minutosPorDia, perfilSonoro } from "../lib/radio/perfil.ts";

// Quarta-feira, 18/11/2026, 15h UTC.
const AGORA = Date.parse("2026-11-18T15:00:00Z");
const d = (dias: number, hora = 12) => new Date(Date.parse(`2026-11-18T${String(hora).padStart(2, "0")}:00:00Z`) - dias * 86_400_000).toISOString();
const ev = (track_id: string, started_at: string, is_valid = true, seconds_listened = 60) => ({ track_id, started_at, is_valid, seconds_listened });

describe("perfil: dias seguidos", () => {
  it("conta a sequência até hoje", () => {
    assert.equal(diasSeguidos([ev("a", d(0)), ev("a", d(1)), ev("a", d(2)), ev("a", d(4))], AGORA), 3);
  });
  it("hoje sem escuta mantém a sequência de ontem", () => {
    assert.equal(diasSeguidos([ev("a", d(1)), ev("a", d(2))], AGORA), 2);
  });
  it("escuta inválida não conta; dois dias sem ouvir zera", () => {
    assert.equal(diasSeguidos([ev("a", d(0), false), ev("a", d(2))], AGORA), 0);
    assert.equal(diasSeguidos([], AGORA), 0);
  });
});

describe("perfil: minutos por dia", () => {
  it("7 dias terminando em Hoje, com rótulos do dia da semana", () => {
    const r = minutosPorDia([ev("a", d(0), true, 125), ev("a", d(0), false, 60), ev("a", d(6), true, 600), ev("a", d(7), true, 600)], AGORA);
    assert.deepEqual(r.map((x) => x.rotulo), ["Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Hoje"]);
    assert.equal(r[6].valor, 3); // 185 s, inclui escuta curta
    assert.equal(r[0].valor, 10);
    assert.equal(r.reduce((s, x) => s + x.valor, 0), 13); // 7 dias atrás fica de fora
  });
});

describe("perfil: descobertas", () => {
  const faixas = [{ id: "a1", artistId: "A" }, { id: "b1", artistId: "B" }];
  it("% das escutas da semana em artistas ouvidos pela 1ª vez na semana", () => {
    const r = descobertasDaSemana([ev("a1", d(20)), ev("a1", d(1)), ev("b1", d(1)), ev("b1", d(0)), ev("b1", d(0))], faixas, AGORA);
    assert.equal(r, 75);
  });
  it("sem escutas na semana → null", () => {
    assert.equal(descobertasDaSemana([ev("a1", d(20))], faixas, AGORA), null);
  });
});

describe("perfil: faixas próprias e gêneros", () => {
  it("conta escutas válidas em faixas do próprio usuário", () => {
    assert.equal(escutasProprias([ev("a1", d(0)), ev("a1", d(0), false), ev("b1", d(0))], [{ id: "a1", artistId: "eu" }, { id: "b1", artistId: "B" }], "eu"), 1);
  });
  it("agrupa o excedente em Outros", () => {
    const g = [5, 4, 3, 2, 1, 1].map((n, i) => ({ id: `g${i}`, escutas: n }));
    const r = fatiasDeGeneros(g, (id) => id.toUpperCase());
    assert.deepEqual(r.at(-1), { rotulo: "Outros", valor: 2 });
    assert.equal(r.length, 5);
  });
});

describe("perfil sonoro", () => {
  it("rótulos pelos dados", () => {
    assert.equal(perfilSonoro([{ rotulo: "Jazz", valor: 3 }], 2, 0), null);
    assert.equal(perfilSonoro([{ rotulo: "Jazz", valor: 3 }], 3, 60), "Explorador de Jazz");
    assert.equal(perfilSonoro([{ rotulo: "MPB", valor: 7 }, { rotulo: "Rock", valor: 3 }], 10, 10), "Fã de MPB");
    assert.equal(perfilSonoro([{ rotulo: "MPB", valor: 4 }, { rotulo: "Rock", valor: 3 }, { rotulo: "Jazz", valor: 3 }], 10, 10), "Ouvido eclético");
    assert.equal(perfilSonoro([{ rotulo: "MPB", valor: 5 }, { rotulo: "Rock", valor: 5 }], 10, 10), "Na onda de MPB");
    assert.equal(perfilSonoro([], 5, null), "Ouvinte fiel");
  });
});
