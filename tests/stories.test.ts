import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agruparPorAutor,
  ativo,
  chaveImagemStory,
  deveOcultar,
  diasRestantes,
  idsDaPlataforma,
  inicioDoTrecho,
  linksCompartilhar,
  parseStoryInput,
  podePublicarStory,
  storiesAtivos,
  type Story,
} from "../lib/stories/rules.ts";

const AGORA = Date.parse("2026-11-11T12:00:00Z");
const dia = (d: number) => new Date(AGORA - d * 86400000).toISOString();
const st = (id: string, authorId: string, createdAt: string): Story => ({ id, authorId, authorName: authorId.toUpperCase(), isPlatform: false, body: id, hasImage: false, trackId: null, clipStart: null, createdAt });
const T = "00000000-0000-4000-8000-000000000001";

describe("stories: validade de 7 dias", () => {
  it("ativo por 7 dias; depois fica só no perfil", () => {
    assert.equal(ativo(dia(6.9), AGORA), true);
    assert.equal(ativo(dia(7.1), AGORA), false);
    assert.equal(diasRestantes(dia(1), AGORA), 6);
    assert.equal(diasRestantes(dia(9), AGORA), 0);
  });
  it("storiesAtivos: só os ativos, mais recentes primeiro", () => {
    const r = storiesAtivos([st("a", "x", dia(3)), st("b", "x", dia(1)), st("c", "y", dia(8))], AGORA);
    assert.deepEqual(r.map((s) => s.id), ["b", "a"]);
  });
  it("agrupa por autor; dentro do grupo, do mais antigo ao mais novo", () => {
    const g = agruparPorAutor([st("a", "x", dia(3)), st("b", "y", dia(2)), st("c", "x", dia(1))]);
    assert.deepEqual(g.map((x) => x.authorId), ["x", "y"]);
    assert.deepEqual(g[0].stories.map((s) => s.id), ["a", "c"]);
  });
});

describe("stories: entrada", () => {
  it("exige texto, imagem ou faixa", () => {
    assert.equal(parseStoryInput({}).ok, false);
    assert.equal(parseStoryInput({ body: "  " }).ok, false);
    assert.equal(parseStoryInput({ body: "Oi" }).ok, true);
    assert.equal(parseStoryInput({ trackId: T }).ok, true);
  });
  it("texto até 280; imagem só JPG/PNG/WebP até 1,5 MB; faixa uuid", () => {
    assert.equal(parseStoryInput({ body: "x".repeat(281) }).ok, false);
    assert.equal(parseStoryInput({ image: { contentType: "image/webp", size: 1000 } }).ok, true);
    assert.equal(parseStoryInput({ image: { contentType: "video/mp4", size: 1000 } }).ok, false);
    assert.equal(parseStoryInput({ image: { contentType: "image/png", size: 2_000_000 } }).ok, false);
    assert.equal(parseStoryInput({ trackId: "nao-uuid" }).ok, false);
    assert.equal(parseStoryInput({ body: "a", clipStart: -1, trackId: T }).ok, false);
  });
  it("trecho de 15 s cabe na duração da faixa", () => {
    assert.equal(inicioDoTrecho(100, 60), 45);
    assert.equal(inicioDoTrecho(10, 8), 0);
    assert.equal(inicioDoTrecho(null, null), 0);
    assert.equal(inicioDoTrecho(20, 200), 20);
  });
  it("chave da imagem fica no prefixo do autor", () => {
    assert.equal(chaveImagemStory("a", "b"), "stories/a/b");
  });
});

describe("stories: quem publica e moderação", () => {
  it("artistas, playlisters e plataforma publicam; ouvinte não", () => {
    assert.equal(podePublicarStory("artist", "u", []).pode, true);
    assert.equal(podePublicarStory("curator", "u", []).pode, true);
    assert.equal(podePublicarStory("listener", "u", []).pode, false);
    assert.equal(podePublicarStory(null, "u", []).pode, false);
    const p = podePublicarStory("listener", T, [T]);
    assert.deepEqual(p, { pode: true, plataforma: true });
  });
  it("lista da plataforma ignora lixo", () => {
    assert.deepEqual(idsDaPlataforma(` ${T}, x ,`), [T]);
    assert.deepEqual(idsDaPlataforma(undefined), []);
  });
  it("oculta com 3 denunciantes distintos", () => {
    assert.equal(deveOcultar(2), false);
    assert.equal(deveOcultar(3), true);
  });
  it("links de compartilhar", () => {
    const l = linksCompartilhar("https://x.com/story/1", "Oi");
    assert.match(l.whatsapp, /^https:\/\/wa\.me\/\?text=Oi%20https%3A%2F%2Fx\.com/);
    assert.match(l.facebook, /sharer\.php\?u=https%3A%2F%2Fx\.com%2Fstory%2F1$/);
    assert.match(l.linkedin, /share-offsite\/\?url=/);
  });
});
