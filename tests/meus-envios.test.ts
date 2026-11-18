import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { acharDuplicatas, contagem, isAbaEnvios, normalizarTitulo, statusFaixa, statusPlaylist, textoNumeros } from "../lib/envios/rules.ts";

describe("Meus envios v2 (#125, item 4)", () => {
  it("status da faixa: Publicada, Preparando áudio, Falhou com motivo e Tentar de novo", () => {
    assert.deepEqual(statusFaixa("published"), { rotulo: "Publicada", tom: "ok" });
    const p = statusFaixa("processing");
    assert.equal(p.rotulo, "Preparando áudio");
    assert.equal(p.preparando, true);
    const f = statusFaixa("failed", "Arquivo não chegou");
    assert.equal(f.rotulo, "Falhou");
    assert.equal(f.motivo, "Arquivo não chegou");
    assert.equal(f.tentarDeNovo, true);
    assert.equal(statusFaixa("failed", null).motivo, undefined);
  });

  it("playlist privada é Rascunho; pública é Publicada", () => {
    assert.equal(statusPlaylist(false).rotulo, "Rascunho");
    assert.equal(statusPlaylist(true).rotulo, "Publicada");
  });

  it("números por tipo, com singular/plural e milhar em pt-BR", () => {
    assert.equal(contagem(1, "reprodução", "reproduções"), "1 reprodução");
    assert.equal(contagem(1200, "reprodução", "reproduções"), "1.200 reproduções");
    assert.equal(contagem(Number.NaN, "x", "xs"), "0 xs");
    assert.equal(textoNumeros("faixa", { reproducoes: 3, salvamentos: 1 }), "3 reproduções · 1 salvamento");
    assert.equal(textoNumeros("album", { faixas: 4, reproducoes: 0 }), "4 faixas · 0 reproduções");
    assert.equal(textoNumeros("playlist", { faixas: 1 }), "1 faixa · 0 salvamentos");
    assert.equal(textoNumeros("story", { visualizacoes: 2 }), "2 visualizações");
  });

  it("duplicatas: mesmo título (sem acento/caixa/pontuação) e duração ±1 s", () => {
    assert.equal(normalizarTitulo("  Canção, de Ninar! "), "cancao de ninar");
    const faixas = [
      { id: "a", title: "Canção de ninar", duration_sec: 200 },
      { id: "b", title: "cancao de NINAR", duration_sec: 201 },
      { id: "c", title: "Canção de ninar", duration_sec: 260 },
      { id: "d", title: "Outra", duration_sec: 200 },
      { id: "e", title: "Outra", duration_sec: null },
    ];
    const g = acharDuplicatas(faixas);
    assert.equal(g.length, 1);
    assert.deepEqual(g[0].map((f) => f.id), ["a", "b"]);
    assert.deepEqual(acharDuplicatas([]), []);
  });

  it("abas válidas", () => {
    assert.ok(isAbaEnvios("stories"));
    assert.ok(!isAbaEnvios("x"));
    assert.ok(!isAbaEnvios(undefined));
  });

  it("números: só leitura com service_role, ids das listas do próprio dono", () => {
    const src = readFileSync("lib/envios/numeros.ts", "utf8");
    assert.match(src, /import "server-only"/);
    assert.doesNotMatch(src, /\.(insert|update|upsert|delete|rpc)\(/);
    const pagina = readFileSync("app/meus-envios/page.tsx", "utf8");
    assert.match(pagina, /if \(!sessao\) redirect/);
    assert.match(pagina, /\.eq\("artist_id", userId\)/);
    assert.match(pagina, /\.eq\("curator_id", userId\)/);
    assert.match(pagina, /\.eq\("author_id", userId\)/);
  });
});
