import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ehStoryDeBio,
  faixaDaBio,
  fotoSegura,
  generoPrincipal,
  gruposDoExplorar,
  linhaDaHome,
  parseBio,
  storiesDeBio,
  storyDeBio,
  type FaixaBio,
  type PerfilBio,
} from "../lib/stories/bio.ts";
import type { Story } from "../lib/stories/rules.ts";

const AGORA = Date.parse("2026-11-15T12:00:00Z");
const h = (n: number) => new Date(AGORA - n * 3600 * 1000).toISOString();
const FOTO = "https://lh3.googleusercontent.com/a/abc=s96-c";

const faixa = (id: string, artistId: string, plays: number, horas: number, genre: string | null = "mpb"): FaixaBio => ({ id, artistId, genre, plays, createdAt: h(horas) });
const perfil = (id: string, extra: Partial<PerfilBio> = {}): PerfilBio => ({ id, nome: `Artista ${id}`, foto: FOTO, bio: "Frase.", oculto: false, ...extra });
const postado = (id: string, autor: string, horas: number, plataforma = false): Story => ({
  id, authorId: autor, authorName: autor, isPlatform: plataforma, body: "oi", hasImage: false, trackId: null, clipStart: null, createdAt: h(horas),
});

describe("story de bio: quando existe", () => {
  it("exige foto, nome e ao menos 1 faixa; oculto não gera", () => {
    const fs = [faixa("t1", "a", 0, 1)];
    assert.ok(storyDeBio(perfil("a"), fs));
    assert.equal(storyDeBio(perfil("a", { foto: null }), fs), null);
    assert.equal(storyDeBio(perfil("a", { nome: "  " }), fs), null);
    assert.equal(storyDeBio(perfil("a"), []), null);
    assert.equal(storyDeBio(perfil("a", { oculto: true }), fs), null);
  });

  it("conteúdo: foto, gênero principal, frase, trecho da mais ouvida", () => {
    const s = storyDeBio(perfil("a"), [faixa("t1", "a", 2, 1, "jazz"), faixa("t2", "a", 9, 5, "mpb"), faixa("t3", "a", 0, 2, "mpb")], (g) => g.toUpperCase());
    assert.ok(s && ehStoryDeBio(s));
    assert.equal(s.trackId, "t2");
    assert.equal(s.body, "Frase.");
    assert.deepEqual(s.bio, { foto: FOTO, genero: "MPB" });
  });

  it("id muda ao trocar foto, frase ou faixa mais ouvida (volta a contar como não visto)", () => {
    const fs = [faixa("t1", "a", 1, 1)];
    const base = storyDeBio(perfil("a"), fs)!.id;
    assert.equal(storyDeBio(perfil("a"), fs)!.id, base);
    assert.notEqual(storyDeBio(perfil("a", { bio: "Outra." }), fs)!.id, base);
    assert.notEqual(storyDeBio(perfil("a", { foto: `${FOTO}x` }), fs)!.id, base);
    assert.notEqual(storyDeBio(perfil("a"), [...fs, faixa("t9", "a", 5, 3)])!.id, base);
  });

  it("mais ouvida; sem escutas, a mais recente", () => {
    assert.equal(faixaDaBio([faixa("x", "a", 0, 9), faixa("y", "a", 0, 1)])?.id, "y");
    assert.equal(faixaDaBio([faixa("x", "a", 3, 9), faixa("y", "a", 0, 1)])?.id, "x");
  });

  it("gênero principal: o mais frequente; empate → o mais recente", () => {
    assert.equal(generoPrincipal([faixa("1", "a", 0, 5, "jazz"), faixa("2", "a", 0, 1, "mpb")]), "mpb");
    assert.equal(generoPrincipal([faixa("1", "a", 0, 5, "jazz"), faixa("2", "a", 0, 4, "jazz"), faixa("3", "a", 0, 1, "mpb")]), "jazz");
    assert.equal(generoPrincipal([faixa("1", "a", 0, 5, null)]), null);
  });

  it("foto só https do Google ou demo local", () => {
    assert.equal(fotoSegura(FOTO), FOTO);
    assert.equal(fotoSegura("/demo/artista-lia.svg"), "/demo/artista-lia.svg");
    assert.equal(fotoSegura("http://lh3.googleusercontent.com/a"), null);
    assert.equal(fotoSegura("https://evil.example/a.png"), null);
    assert.equal(fotoSegura("https://googleusercontent.com.evil.example/a"), null);
    assert.equal(fotoSegura("javascript:alert(1)"), null);
    assert.equal(fotoSegura("/demo/../x.svg"), null);
  });

  it("frase: até 140, espaços colapsados; vazia = sem frase", () => {
    assert.equal(parseBio("  oi   mundo "), "oi mundo");
    assert.equal(parseBio(""), null);
    assert.equal(parseBio(null), null);
    assert.equal(parseBio("a".repeat(141)), undefined);
    assert.equal(parseBio(3), undefined);
  });

  it("storiesDeBio: só artistas elegíveis, mais faixas primeiro", () => {
    const fs = [faixa("1", "a", 0, 1), faixa("2", "b", 0, 1), faixa("3", "b", 0, 2), faixa("4", "c", 0, 1)];
    const r = storiesDeBio([perfil("a"), perfil("b"), perfil("c", { foto: null })], fs);
    assert.deepEqual(r.map((s) => s.authorId), ["b", "a"]);
  });
});

describe("linha da Home (Artistas para conhecer)", () => {
  const bios = storiesDeBio([perfil("a"), perfil("b"), perfil("c")], [faixa("1", "a", 0, 1), faixa("2", "b", 0, 1), faixa("3", "c", 0, 1)]);
  const boasVindas = postado("bv", "radioOn", 0, true);

  it("nenhum story postado de quem não sigo; seguido com story novo vem primeiro e abre os postados", () => {
    const cards = linhaDaHome({ bios, postados: [postado("p1", "b", 2), postado("p2", "x", 1), boasVindas], seguidos: new Set(["b"]), vistos: new Set(), visitante: false, agora: AGORA });
    assert.equal(cards[0].tipo, "novidade");
    assert.equal(cards[0].grupo.authorId, "b");
    assert.equal(cards[0].grupo.stories[0].id, "p1");
    assert.ok(cards.slice(1).every((c) => c.tipo === "bio" && c.grupo.authorId !== "b"));
    assert.ok(!cards.some((c) => c.grupo.authorId === "x" || c.grupo.isPlatform));
  });

  it("story do seguido com mais de 7 dias não conta como novidade", () => {
    const cards = linhaDaHome({ bios, postados: [postado("p1", "b", 24 * 8)], seguidos: new Set(["b"]), vistos: new Set(), visitante: false, agora: AGORA });
    assert.ok(cards.every((c) => c.tipo === "bio"));
    assert.equal(cards.length, 3);
  });

  it("visitante novo: boas-vindas primeiro, até ver", () => {
    const novo = linhaDaHome({ bios, postados: [boasVindas], seguidos: new Set(), vistos: new Set(), visitante: true, agora: AGORA });
    assert.equal(novo[0].tipo, "boas-vindas");
    const viu = linhaDaHome({ bios, postados: [boasVindas], seguidos: new Set(), vistos: new Set(["bv"]), visitante: true, agora: AGORA });
    assert.ok(viu.every((c) => c.tipo === "bio"));
    const conta = linhaDaHome({ bios, postados: [boasVindas], seguidos: new Set(), vistos: new Set(), visitante: false, agora: AGORA });
    assert.ok(conta.every((c) => c.tipo === "bio"));
  });

  it("bios vistas vão para o fim", () => {
    const cards = linhaDaHome({ bios, postados: [], seguidos: new Set(), vistos: new Set([bios[0].id]), visitante: false, agora: AGORA });
    assert.equal(cards.at(-1)?.grupo.authorId, bios[0].authorId);
  });
});

describe("stories do Explorar", () => {
  it("ordem: postados de quem sigo, postados recentes (radioOn primeiro), bios não vistas, bios vistas", () => {
    const bios = storiesDeBio([perfil("a"), perfil("b")], [faixa("1", "a", 0, 1), faixa("2", "b", 0, 1)]);
    const g = gruposDoExplorar({
      bios,
      postados: [postado("x1", "x", 1), postado("s1", "s", 3), postado("bv", "radioOn", 5, true), postado("velho", "y", 24 * 9)],
      seguidos: new Set(["s"]),
      vistos: new Set([bios[0].id]),
      agora: AGORA,
    });
    assert.deepEqual(g.map((x) => x.authorId), ["s", "radioOn", "x", bios[1].authorId, bios[0].authorId]);
  });
});
