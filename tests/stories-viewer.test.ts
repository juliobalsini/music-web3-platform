import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseComentario, temOfensa } from "../lib/stories/moderacao.ts";
import { agruparPorAutor, type Story } from "../lib/stories/rules.ts";
import {
  anterior, classificarGesto, duracaoDoStory, lerVistos, marcarVisto, ordenarGrupos, primeiroNaoVisto, proxima, tempoRelativo, trocarPerfil, zonaDoToque,
} from "../lib/stories/viewer.ts";

const st = (id: string, autor: string, min: number, extra: Partial<Story> = {}, plataforma = false): Story => ({
  id, authorId: autor, authorName: autor, isPlatform: plataforma, body: "x", hasImage: false, trackId: null, clipStart: null,
  createdAt: new Date(Date.UTC(2026, 10, 13, 12, 0) - min * 60_000).toISOString(), ...extra,
});
const grupos = () => agruparPorAutor([st("a1", "ana", 10), st("a2", "ana", 5), st("b1", "bia", 20), st("r1", "radioOn", 30, {}, true)]);

describe("visualizador de stories — regras puras", () => {
  it("duração: 5 s sem música; com música, o trecho (≤ 15 s)", () => {
    assert.equal(duracaoDoStory({ trackId: null }, null), 5000);
    assert.equal(duracaoDoStory({ trackId: "t" }, 200), 15_000);
    assert.equal(duracaoDoStory({ trackId: "t" }, 8), 8000);
    assert.equal(duracaoDoStory({ trackId: "t" }, null), 15_000);
  });

  it("avança no perfil, passa ao próximo perfil e fecha no último", () => {
    const g = grupos();
    const ana = g.findIndex((x) => x.authorId === "ana");
    assert.deepEqual(proxima(g, { g: ana, i: 0 }), { g: ana, i: 1 });
    const seguinte = proxima(g, { g: ana, i: 1 });
    assert.deepEqual(seguinte, ana + 1 < g.length ? { g: ana + 1, i: 0 } : null);
    assert.equal(proxima(g, { g: g.length - 1, i: g[g.length - 1].stories.length - 1 }), null);
  });

  it("voltar nunca fecha: volta ao último do perfil anterior ou reinicia o primeiro", () => {
    const g = grupos();
    assert.deepEqual(anterior(g, { g: 1, i: 0 }), { g: 0, i: g[0].stories.length - 1 });
    assert.deepEqual(anterior(g, { g: 0, i: 0 }), { g: 0, i: 0 });
  });

  it("troca de perfil por deslize: limites devolvem null", () => {
    const g = grupos();
    assert.deepEqual(trocarPerfil(g, { g: 0, i: 1 }, 1), { g: 1, i: 0 });
    assert.equal(trocarPerfil(g, { g: 0, i: 0 }, -1), null);
    assert.equal(trocarPerfil(g, { g: g.length - 1, i: 0 }, 1), null);
  });

  it("zonas do toque: terço esquerdo volta, direito avança, meio nada", () => {
    assert.equal(zonaDoToque(10, 300), "esquerda");
    assert.equal(zonaDoToque(150, 300), "meio");
    assert.equal(zonaDoToque(290, 300), "direita");
    assert.equal(zonaDoToque(5, 0), "meio");
  });

  it("gestos: toque, segurar (pausa), deslize horizontal e para baixo", () => {
    assert.equal(classificarGesto({ dx: 2, dy: 3, ms: 120 }), "toque");
    assert.equal(classificarGesto({ dx: 2, dy: 3, ms: 900 }), "segurar");
    assert.equal(classificarGesto({ dx: -120, dy: 10, ms: 200 }), "horizontal");
    assert.equal(classificarGesto({ dx: 10, dy: 150, ms: 200 }), "baixo");
    assert.equal(classificarGesto({ dx: 10, dy: -150, ms: 200 }), "nada");
    assert.equal(classificarGesto({ dx: 30, dy: 30, ms: 200 }), "nada");
  });

  it("recência: agora, min, h e dias", () => {
    const agora = Date.UTC(2026, 10, 13, 12, 0);
    const antes = (min: number) => new Date(agora - min * 60_000).toISOString();
    assert.equal(tempoRelativo(antes(0), agora), "agora");
    assert.equal(tempoRelativo(antes(12), agora), "há 12 min");
    assert.equal(tempoRelativo(antes(4 * 60 + 5), agora), "há 4 h");
    assert.equal(tempoRelativo(antes(24 * 60), agora), "há 1 dia");
    assert.equal(tempoRelativo(antes(3 * 24 * 60), agora), "há 3 dias");
  });

  it("ordem: radioOn primeiro, depois não vistos, depois vistos; e abre no primeiro não visto", () => {
    const g = grupos();
    const vistos = new Set(["a1", "a2"]);
    assert.deepEqual(ordenarGrupos(g, vistos).map((x) => x.authorId), ["radioOn", "bia", "ana"]);
    assert.deepEqual(ordenarGrupos(g, new Set()).map((x) => x.authorId)[0], "radioOn");
    const ana = g.find((x) => x.authorId === "ana")!;
    assert.equal(primeiroNaoVisto(ana, new Set(["a1"])), 1);
    assert.equal(primeiroNaoVisto(ana, vistos), 0);
  });

  it("lista de vistos: lê com segurança, não duplica e limita", () => {
    assert.deepEqual(lerVistos("lixo"), []);
    assert.deepEqual(lerVistos(null), []);
    assert.deepEqual(lerVistos(marcarVisto(marcarVisto(null, "a"), "b")), ["a", "b"]);
    assert.deepEqual(lerVistos(marcarVisto(marcarVisto(marcarVisto(null, "a"), "b"), "a")), ["b", "a"]);
    let b: string | null = null;
    for (let i = 0; i < 400; i++) b = marcarVisto(b, `s${i}`);
    assert.equal(lerVistos(b).length, 300);
  });
});

describe("comentários de story — validação e moderação", () => {
  it("texto: até 140 caracteres, espaços normalizados", () => {
    assert.deepEqual(parseComentario({ body: "  que   solo  " }), { ok: true, kind: "texto", body: "que solo" });
    assert.equal(parseComentario({ body: "x".repeat(141) }).ok, false);
    assert.equal(parseComentario({ body: "x".repeat(140) }).ok, true);
    assert.equal(parseComentario({ body: "   " }).ok, false);
    assert.equal(parseComentario(null).ok, false);
  });
  it("reações e figurinhas só da lista da marca; sem GIF", () => {
    assert.equal(parseComentario({ kind: "reacao", body: "🔥" }).ok, true);
    assert.equal(parseComentario({ kind: "reacao", body: "💀" }).ok, false);
    assert.equal(parseComentario({ kind: "figurinha", body: "Hino" }).ok, true);
    assert.equal(parseComentario({ kind: "figurinha", body: "qualquer" }).ok, false);
    assert.equal(parseComentario({ kind: "gif", body: "http://x" }).ok, false);
  });
  it("filtro de palavras ofensivas (sem acento, com trocas por números)", () => {
    assert.equal(temOfensa("que MERDA"), true);
    assert.equal(temOfensa("m3rda"), true);
    assert.equal(temOfensa("Arrepiou demais, hino!"), false);
    assert.equal(temOfensa("computação"), false);
    assert.equal(parseComentario({ body: "seu idiota" }).ok, false);
  });
});
