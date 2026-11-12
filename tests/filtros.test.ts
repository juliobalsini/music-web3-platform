import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { embaralhar, generosPresentes, ordenarFaixas } from "../lib/radio/catalogo.ts";
import { atalhosVisiveis, lerAtalhos, pontoDeRetomada, progressoAtalho, registrarAtalho, type Atalho } from "../lib/radio/continuar.ts";

const f = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, createdAt: `2026-11-${10 + Number(id.replace(/\D/g, "") || 0)}T10:00:00Z`, genre: null as string | null, plays: 0, likes: 0, ...extra });

describe("ordenação e gêneros do catálogo", () => {
  it("ordena por recentes, ouvidas, curtidas e A–Z", () => {
    const fs = [f("f1", { title: "Zeta", plays: 5, likes: 1 }), f("f2", { title: "Álbum", plays: 9, likes: 0 }), f("f3", { title: "beta", plays: 1, likes: 7 })];
    assert.deepEqual(ordenarFaixas(fs, "recentes").map((x) => x.id), ["f3", "f2", "f1"]);
    assert.deepEqual(ordenarFaixas(fs, "ouvidas").map((x) => x.id), ["f2", "f1", "f3"]);
    assert.deepEqual(ordenarFaixas(fs, "curtidas").map((x) => x.id), ["f3", "f1", "f2"]);
    assert.deepEqual(ordenarFaixas(fs, "az").map((x) => x.id), ["f2", "f3", "f1"]);
  });
  it("gêneros presentes e embaralhar preservam os elementos", () => {
    assert.deepEqual(generosPresentes([f("f1", { genre: "jazz" }), f("f2", { genre: "jazz" }), f("f3")]), [{ id: "jazz", label: "Jazz", total: 2 }]);
    const e = embaralhar([1, 2, 3, 4, 5], () => 0.3);
    assert.deepEqual([...e].sort(), [1, 2, 3, 4, 5]);
  });
});

describe("Continue ouvindo", () => {
  const a = (tipo: Atalho["tipo"], id: string, ts: number, pos = 0, dur = 0): Atalho => ({ tipo, id, titulo: id, sub: "", capaId: id, temCapa: false, pos, dur, ts });
  it("registra no topo, um por item, preservando a posição", () => {
    let l: Atalho[] = [];
    l = registrarAtalho(l, a("faixa", "t1", 1, 40, 100));
    l = registrarAtalho(l, a("album", "al", 2));
    const semPos = { ...a("faixa", "t1", 3), pos: undefined, dur: undefined };
    l = registrarAtalho(l, semPos);
    assert.deepEqual(l.map((x) => `${x.tipo}:${x.id}`), ["faixa:t1", "album:al"]);
    assert.equal(l[0].pos, 40);
  });
  it("lê JSON inválido como vazio e descarta itens malformados", () => {
    assert.deepEqual(lerAtalhos("{"), []);
    assert.deepEqual(lerAtalhos(null), []);
    assert.equal(lerAtalhos(JSON.stringify([{ tipo: "x" }, a("faixa", "ok", 1)])).length, 1);
  });
  it("progresso e ponto de retomada", () => {
    assert.equal(progressoAtalho({ pos: 25, dur: 100 }), 0.25);
    assert.equal(progressoAtalho({ pos: 5, dur: 0 }), 0);
    assert.equal(pontoDeRetomada(42.7, 100), 42);
    assert.equal(pontoDeRetomada(99, 100), 0);
    assert.equal(pontoDeRetomada(0.5, 100), 0);
  });
  it("até 6 itens misturando tipos; menos de 2 oculta", () => {
    const lista = [
      ...Array.from({ length: 8 }, (_, i) => a("faixa", `t${i}`, 100 - i)),
      a("playlist", "p1", 50), a("album", "al1", 40), a("perfil", "pe1", 30),
    ];
    const v = atalhosVisiveis(lista, () => true);
    assert.equal(v.length, 6);
    assert.deepEqual([...new Set(v.map((x) => x.tipo))].sort(), ["album", "faixa", "perfil", "playlist"]);
    assert.equal(atalhosVisiveis([a("faixa", "t", 1)], () => true).length, 0);
    assert.equal(atalhosVisiveis(lista, (x) => x.id === "t0").length, 0);
  });
});

