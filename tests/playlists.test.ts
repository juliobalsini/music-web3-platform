import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isUuid, parseTitle, rankPlaylists } from "../lib/playlists/rules.ts";

const p = (id: string, trackCount: number, createdAt: string) => ({ id, title: id, createdAt, trackCount });

describe("playlists", () => {
  it("parseTitle respeita 1–200 após trim", () => {
    assert.equal(parseTitle("  Rock  "), "Rock");
    assert.equal(parseTitle("   "), null);
    assert.equal(parseTitle("a".repeat(201)), null);
    assert.equal(parseTitle(null), null);
  });
  it("isUuid", () => {
    assert.equal(isUuid("3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f"), true);
    assert.equal(isUuid("x"), false);
  });
  it("rankPlaylists: mais faixas, desempate por recência, sem vazias", () => {
    const r = rankPlaylists([p("a", 2, "2026-01-01"), p("b", 5, "2026-01-01"), p("c", 2, "2026-02-01"), p("d", 0, "2026-03-01")]);
    assert.deepEqual(r.map((x) => x.id), ["b", "c", "a"]);
  });
});

import { trocarPosicao } from "../lib/playlists/rules.ts";

describe("trocarPosicao", () => {
  const itens = [{ trackId: "a", position: 0 }, { trackId: "b", position: 1 }, { trackId: "c", position: 4 }];
  it("troca com a vizinha", () => {
    assert.deepEqual(trocarPosicao(itens, "b", "down"), [{ trackId: "b", position: 4 }, { trackId: "c", position: 1 }]);
    assert.deepEqual(trocarPosicao(itens, "b", "up"), [{ trackId: "b", position: 0 }, { trackId: "a", position: 1 }]);
  });
  it("não move além das pontas nem faixa inexistente", () => {
    assert.equal(trocarPosicao(itens, "a", "up"), null);
    assert.equal(trocarPosicao(itens, "c", "down"), null);
    assert.equal(trocarPosicao(itens, "x", "up"), null);
  });
});

import { MIN_FAIXAS_PUBLICAR, parseCreateKey, parseDescricao, podePublicar, reordenar, tituloPadrao } from "../lib/playlists/rules.ts";

describe("playlists v2 (regras)", () => {
  it("publica só com 5 faixas ou mais", () => {
    assert.equal(MIN_FAIXAS_PUBLICAR, 5);
    assert.equal(podePublicar(4), false);
    assert.equal(podePublicar(5), true);
  });
  it("título padrão numerado", () => {
    assert.equal(tituloPadrao(0), "Minha playlist 1");
    assert.equal(tituloPadrao(2), "Minha playlist 3");
  });
  it("chave de criação valida formato", () => {
    assert.equal(parseCreateKey("3f2c1a9e-aaaa-bbbb-cccc-123456789012"), "3f2c1a9e-aaaa-bbbb-cccc-123456789012");
    assert.equal(parseCreateKey("x"), null);
    assert.equal(parseCreateKey("a b c d e f g h"), null);
    assert.equal(parseCreateKey(5), null);
  });
  it("descrição opcional até 500", () => {
    assert.equal(parseDescricao("  "), null);
    assert.equal(parseDescricao(" oi "), "oi");
    assert.equal(parseDescricao("x".repeat(501)), undefined);
    assert.equal(parseDescricao(3), undefined);
  });
  it("reordena sem mutar", () => {
    const l = ["a", "b", "c"];
    assert.deepEqual(reordenar(l, 0, 2), ["b", "c", "a"]);
    assert.deepEqual(l, ["a", "b", "c"]);
    assert.deepEqual(reordenar(l, 5, 0), l);
  });
});

import { contarPresenca, rotuloEmPlaylists, textoPresenca } from "../lib/playlists/rules.ts";

describe("presença do artista em playlists", () => {
  const A = "artista";
  const l = (playlist_id: string, track_id: string, o: { curator?: string; publica?: boolean; artista?: string; status?: string; hidden?: boolean | null; arr?: boolean } = {}) => {
    const p = { curator_id: o.curator ?? "outro", is_public: o.publica ?? true };
    const t = { artist_id: o.artista ?? A, status: o.status ?? "published" };
    return { playlist_id, track_id, hidden: o.hidden ?? null, playlists: o.arr ? [p] : p, tracks: o.arr ? [t] : t };
  };
  it("conta playlists distintas no total e por faixa", () => {
    const r = contarPresenca([l("p1", "t1"), l("p1", "t2"), l("p2", "t1", { arr: true }), l("p3", "t2")], A);
    assert.equal(r.total, 3);
    assert.equal(r.porFaixa.get("t1"), 2);
    assert.equal(r.porFaixa.get("t2"), 2);
  });
  it("ignora playlist própria, privada, item oculto, faixa não publicada e de outro artista", () => {
    const r = contarPresenca([
      l("p1", "t1", { curator: A }),
      l("p2", "t1", { publica: false }),
      l("p3", "t1", { hidden: true }),
      l("p4", "t1", { status: "processing" }),
      l("p5", "t9", { artista: "x" }),
      { playlist_id: "p6", track_id: "t1", playlists: null, tracks: null },
    ], A);
    assert.equal(r.total, 0);
    assert.equal(r.porFaixa.size, 0);
  });
  it("textos no singular e no plural", () => {
    assert.equal(textoPresenca(0, 3), null);
    assert.equal(textoPresenca(1, 1), "Sua faixa está em 1 playlist");
    assert.equal(textoPresenca(4, 2), "Suas faixas estão em 4 playlists");
    assert.equal(rotuloEmPlaylists(0), undefined);
    assert.equal(rotuloEmPlaylists(1), "Em 1 playlist");
    assert.equal(rotuloEmPlaylists(5), "Em 5 playlists");
  });
});
