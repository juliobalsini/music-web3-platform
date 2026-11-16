import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { chaveCapaValida, limitarEnquadramento, recorteQuadrado, urlCapaPlaylist, ZOOM_MAX } from "../lib/playlists/capa.ts";

const U = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const K = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("capa própria da playlist: recorte", () => {
  it("sem zoom nem arraste, recorta o quadrado central", () => {
    assert.deepEqual(recorteQuadrado(2000, 1000, { zoom: 1, x: 0, y: 0 }), { sx: 500, sy: 0, lado: 1000 });
    assert.deepEqual(recorteQuadrado(800, 1200, { zoom: 1, x: 0, y: 0 }), { sx: 0, sy: 200, lado: 800 });
  });
  it("zoom 2 recorta metade do lado, ainda centralizado", () => {
    assert.deepEqual(recorteQuadrado(1000, 1000, { zoom: 2, x: 0, y: 0 }), { sx: 250, sy: 250, lado: 500 });
  });
  it("arrastar a imagem para a direita mostra a parte da esquerda, sem sair da imagem", () => {
    const r = recorteQuadrado(2000, 1000, { zoom: 1, x: 0.5, y: 0 });
    assert.equal(r.sx, 0);
    const alem = recorteQuadrado(2000, 1000, { zoom: 1, x: 9, y: 0 });
    assert.equal(alem.sx, 0);
    const outro = recorteQuadrado(2000, 1000, { zoom: 1, x: -9, y: 0 });
    assert.equal(outro.sx, 1000);
  });
  it("limita zoom e deslocamento para a imagem cobrir o quadro", () => {
    assert.deepEqual(limitarEnquadramento(1000, 1000, { zoom: 0.2, x: 1, y: -1 }), { zoom: 1, x: 0, y: 0 });
    const e = limitarEnquadramento(1000, 1000, { zoom: 99, x: 5, y: 0 });
    assert.equal(e.zoom, ZOOM_MAX);
    assert.equal(e.x, (ZOOM_MAX - 1) / 2);
    assert.equal(limitarEnquadramento(1000, 1000, { zoom: Number.NaN, x: 0, y: 0 }).zoom, 1);
  });
});

describe("capa própria da playlist: chave e URL", () => {
  it("aceita só covers/<própria conta>/<uuid>", () => {
    assert.equal(chaveCapaValida(`covers/${U}/${K}`, U), true);
    assert.equal(chaveCapaValida(`covers/${K}/${K}`, U), false);
    assert.equal(chaveCapaValida(`tracks/${U}/${K}`, U), false);
    assert.equal(chaveCapaValida(`covers/${U}/../tracks/x`, U), false);
    assert.equal(chaveCapaValida(`covers/${U}/${K}/x`, U), false);
    assert.equal(chaveCapaValida(null, U), false);
  });
  it("URL da capa muda com a chave e some sem capa", () => {
    assert.equal(urlCapaPlaylist(U, null), null);
    assert.equal(urlCapaPlaylist(U, `covers/${U}/${K}`), `/api/playlists/${U}/capa?v=0a1b2c3d`);
  });
});

describe("capa própria da playlist: servidor", () => {
  const rota = readFileSync("app/api/playlists/[id]/capa/route.ts", "utf8");
  const acoes = readFileSync("app/playlist/actions.ts", "utf8");
  it("upload exige conta e dono, com tipo e tamanho de capa", () => {
    assert.match(rota, /getSessionRole\(\)/);
    assert.match(rota, /\.eq\("curator_id", sessao\.userId\)/);
    assert.match(rota, /ALLOWED_COVER_TYPES/);
    assert.match(rota, /MAX_COVER_BYTES/);
    assert.match(rota, /coverKey\(sessao\.userId, randomUUID\(\)\)/);
  });
  it("gravar a capa confere a chave e a existência do arquivo", () => {
    assert.match(acoes, /chaveCapaValida\(key, d\.userId\)/);
    assert.match(acoes, /objetoExiste\(key\)/);
  });
});
