import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { emAltaPorSalvamentos, HUB_MINIMO, maisPlaylistados, playlistersEmDestaque, secaoVisivel, type PlaylistDoHub } from "../lib/playlists/hub.ts";

const AGORA = Date.parse("2026-11-16T12:00:00Z");
const DIA = 24 * 3600 * 1000;
const em = (dias: number) => new Date(AGORA - dias * DIA).toISOString();
const pl = (id: string, curatorId: string, itens: [string, number | null][]): PlaylistDoHub => ({
  id,
  curatorId,
  itens: itens.map(([trackId, d]) => ({ trackId, addedAt: d === null ? null : em(d) })),
});

describe("hub de playlists", () => {
  it("seção só aparece com o mínimo de itens", () => {
    assert.equal(HUB_MINIMO, 3);
    assert.equal(secaoVisivel([1, 2]), false);
    assert.equal(secaoVisivel([1, 2, 3]), true);
  });

  it("Em alta conta só salvamentos dos últimos 7 dias de playlists listadas", () => {
    const pls = [pl("a", "c1", [["t1", 1]]), pl("b", "c2", [["t2", 1]])];
    const r = emAltaPorSalvamentos(
      pls,
      [
        { playlistId: "a", createdAt: em(1) },
        { playlistId: "b", createdAt: em(2) },
        { playlistId: "b", createdAt: em(3) },
        { playlistId: "a", createdAt: em(8) }, // fora da semana
        { playlistId: "privada", createdAt: em(1) }, // não pública/listada
        { playlistId: "a", createdAt: new Date(AGORA + DIA).toISOString() }, // futuro
      ],
      AGORA,
    );
    assert.deepEqual(r, [
      { id: "b", salvos: 2 },
      { id: "a", salvos: 1 },
    ]);
  });

  it("Playlisters em destaque somam salvamentos e seguidores e ignoram quem não pontua", () => {
    const pls = [pl("a", "c1", [["t1", 1]]), pl("a2", "c1", [["t2", 1]]), pl("b", "c2", [["t3", 1]]), pl("vazia", "c3", [])];
    const r = playlistersEmDestaque(
      pls,
      [
        { playlistId: "a2", createdAt: em(20) },
        { playlistId: "a2", createdAt: em(1) },
        { playlistId: "b", createdAt: em(1) },
      ],
      new Map([["c2", 5], ["c3", 9]]),
    );
    assert.deepEqual(r, [
      { id: "c2", salvos: 1, seguidores: 5, playlists: 1, topPlaylistId: "b" },
      { id: "c1", salvos: 2, seguidores: 0, playlists: 2, topPlaylistId: "a2" },
    ]);
  });

  it("Mais playlistados: playlists distintas de outras pessoas na semana, com empate na mesma posição", () => {
    const artista = new Map([
      ["t1", "art1"],
      ["t2", "art1"],
      ["t3", "art2"],
      ["t4", "art3"],
      ["t5", "art4"],
    ]);
    const pls = [
      pl("p1", "c1", [["t1", 1], ["t2", 2], ["t3", 1]]), // art1 conta uma vez nesta playlist
      pl("p2", "c2", [["t1", 3], ["t4", 10]]), // t4 fora da semana
      pl("p3", "art2", [["t3", 1]]), // própria playlist do artista não conta
      pl("p4", "c3", [["t3", 2], ["t5", null]]), // sem data não conta
    ];
    assert.deepEqual(maisPlaylistados(pls, artista, AGORA), [
      { id: "art1", playlists: 2, posicao: 1 },
      { id: "art2", playlists: 2, posicao: 1 },
    ]);
    const tres = maisPlaylistados([...pls, pl("p5", "c4", [["t4", 1]])], artista, AGORA);
    assert.deepEqual(tres.map((a) => a.posicao), [1, 1, 3]);
  });
});
