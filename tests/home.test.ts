import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  artistasParaConhecer, atalhosVisiveis, climaAgora, embaralhar, faixasDoClima, generosPresentes, lerAtalhos, ordenarFaixas,
  pontoDeRetomada, progressoAtalho, proximas, registrarAtalho, selecaoRadioOn, tituloSelecao, type Atalho,
} from "../lib/radio/home.ts";
import { agruparPorAutor, storyBoasVindas, storiesAtivos } from "../lib/stories/rules.ts";

// Datas em Brasília (UTC−3): 2026-11-12 é quinta; 13 sexta; 14 sábado; 15 domingo.
const br = (dia: number, hora: number) => Date.UTC(2026, 10, dia, hora + 3, 30);

describe("climaAgora (horário de Brasília)", () => {
  it("madrugada 0–5 h, foco 6–11 h, estrada 17–20 h", () => {
    assert.equal(climaAgora(br(12, 0)), "madrugada");
    assert.equal(climaAgora(br(12, 5)), "madrugada");
    assert.equal(climaAgora(br(12, 6)), "foco");
    assert.equal(climaAgora(br(12, 11)), "foco");
    assert.equal(climaAgora(br(12, 17)), "estrada");
    assert.equal(climaAgora(br(12, 20)), "estrada");
  });
  it("domingo o dia todo (menos a madrugada); pista sexta e sábado à noite", () => {
    assert.equal(climaAgora(br(15, 9)), "domingo");
    assert.equal(climaAgora(br(15, 22)), "domingo");
    assert.equal(climaAgora(br(15, 2)), "madrugada");
    assert.equal(climaAgora(br(13, 22)), "pista");
    assert.equal(climaAgora(br(14, 23)), "pista");
    assert.equal(climaAgora(br(12, 22)), "chuva");
  });
  it("chuva é a alternativa da tarde", () => {
    assert.equal(climaAgora(br(12, 14)), "chuva");
  });
  it("usa o fuso de Brasília, não o UTC", () => {
    // 02:00 UTC = 23:00 de Brasília da véspera.
    assert.equal(climaAgora(Date.UTC(2026, 10, 14, 2, 0)), "pista"); // sexta 23h em Brasília
  });
});

const f = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, createdAt: `2026-11-${10 + Number(id.replace(/\D/g, "") || 0)}T10:00:00Z`, genre: null as string | null, mood: null as string | null, plays: 0, likes: 0, artistId: "a", artistName: "A", ...extra });

describe("faixasDoClima", () => {
  it("devolve as do clima; sem nenhuma, as recentes", () => {
    const fs = [f("f1", { mood: "foco" }), f("f2"), f("f3", { mood: "foco" })];
    const r = faixasDoClima(fs, "foco");
    assert.deepEqual(r.faixas.map((x) => x.id), ["f3", "f1"]);
    assert.equal(r.doClima, true);
    const v = faixasDoClima(fs, "chuva");
    assert.equal(v.doClima, false);
    assert.equal(v.faixas[0].id, "f3");
  });
});

describe("proximas (A seguir)", () => {
  const fila = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  it("as 3 seguintes à atual", () => assert.deepEqual(proximas(fila, "b").map((x) => x.id), ["c", "d", "e"]));
  it("contínua dá a volta; não contínua para no fim", () => {
    assert.deepEqual(proximas(fila, "d").map((x) => x.id), ["e", "a", "b"]);
    assert.deepEqual(proximas(fila, "d", 3, false).map((x) => x.id), ["e"]);
  });
  it("sem atual começa do início e nunca repete a atual", () => {
    assert.deepEqual(proximas(fila, null).map((x) => x.id), ["b", "c", "d"]);
    assert.deepEqual(proximas([{ id: "a" }], "a").length, 0);
  });
});

describe("selecaoRadioOn", () => {
  const agora = Date.parse("2026-11-12T12:00:00Z");
  const dias = (n: number) => new Date(agora - n * 86400000).toISOString();
  it("novidades da semana, gêneros com ≥3 faixas e um clima por humor", () => {
    const fs = [
      f("f1", { createdAt: dias(1), genre: "indie", mood: "foco" }),
      f("f2", { createdAt: dias(2), genre: "indie", mood: "foco" }),
      f("f3", { createdAt: dias(3), genre: "indie" }),
      f("f4", { createdAt: dias(20), genre: "jazz" }),
      f("f5", { createdAt: dias(21), genre: "jazz" }),
    ];
    const s = selecaoRadioOn(fs, agora);
    assert.deepEqual(s.map((x) => x.id), ["novidades", "genero-indie", "clima-foco"]);
    assert.deepEqual(s[0].faixas, ["f1", "f2", "f3"]);
    assert.equal(s[0].titulo, "Novidades da semana");
  });
  it("sem faixas da semana, novidades cai nas mais recentes; sem catálogo, vazio", () => {
    const s = selecaoRadioOn([f("f1", { createdAt: dias(30) })], agora);
    assert.deepEqual(s.map((x) => x.id), ["novidades"]);
    assert.deepEqual(selecaoRadioOn([], agora), []);
  });
  it("título pelo id", () => {
    assert.equal(tituloSelecao("genero-hip-hop"), "Hip hop");
    assert.equal(tituloSelecao("clima-chuva"), "Chuva");
    assert.equal(tituloSelecao("xyz"), null);
  });
});

describe("artistasParaConhecer, ordenação e gêneros", () => {
  it("menos ouvidos primeiro, com nº de faixas", () => {
    const r = artistasParaConhecer([
      f("f1", { artistId: "x", artistName: "X", plays: 50 }),
      f("f2", { artistId: "y", artistName: "Y", plays: 1 }),
      f("f3", { artistId: "y", artistName: "Y", plays: 1 }),
    ]);
    assert.deepEqual(r, [{ id: "y", nome: "Y", faixas: 2 }, { id: "x", nome: "X", faixas: 1 }]);
  });
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
    const { pos: _p, dur: _d, ...semPos } = a("faixa", "t1", 3);
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

describe("story fixo do radioOn", () => {
  it("existe sempre, está ativo e vem primeiro no grupo da plataforma", () => {
    const agora = Date.now();
    const b = storyBoasVindas(agora);
    assert.equal(storiesAtivos([b], agora).length, 1);
    const g = agruparPorAutor([{ ...b, id: "x", pinned: false, createdAt: new Date(agora + 5).toISOString() }, b, { ...b, id: "o", authorId: "o", authorName: "O", isPlatform: false, pinned: false }]);
    assert.equal(g[0].isPlatform, true);
    assert.equal(g[0].stories[0].pinned, true);
  });
});
