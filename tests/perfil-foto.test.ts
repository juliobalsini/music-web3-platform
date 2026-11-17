import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { caminhoFotoPerfil, chaveDaRota, chaveFotoValida, fotoDaConta, urlFotoPerfil } from "../lib/perfil/foto.ts";
import { fotoSegura } from "../lib/stories/bio.ts";

const U = "11111111-2222-4333-8444-555555555555";
const OUTRO = "99999999-2222-4333-8444-555555555555";
const V = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const KEY = `covers/${U}/${V}`;
const URL_REL = `/api/perfil/${U}/foto?v=${V}`;

describe("foto própria do perfil", () => {
  it("só aceita chave da própria conta em covers/", () => {
    assert.equal(chaveFotoValida(KEY, U), true);
    assert.equal(chaveFotoValida(KEY, OUTRO), false);
    assert.equal(chaveFotoValida(`audio/${U}/${V}`, U), false);
    assert.equal(chaveFotoValida(`${KEY}/../x`, U), false);
    assert.equal(chaveFotoValida(42, U), false);
  });

  it("URL relativa com o uuid do arquivo como versão", () => {
    assert.equal(urlFotoPerfil(U, KEY), URL_REL);
    assert.equal(urlFotoPerfil(OUTRO, KEY), null);
  });

  it("rota pública reconstrói só chaves válidas", () => {
    assert.equal(chaveDaRota(U, V), KEY);
    assert.equal(chaveDaRota(U, null), null);
    assert.equal(chaveDaRota(U, "../../audio/x"), null);
    assert.equal(chaveDaRota(U, `${V}/x`), null);
  });

  it("normaliza a URL gravada no banco para o caminho relativo, de qualquer host", () => {
    assert.equal(caminhoFotoPerfil(URL_REL), URL_REL);
    assert.equal(caminhoFotoPerfil(`https://radioon-ten.vercel.app${URL_REL}`), URL_REL);
    assert.equal(caminhoFotoPerfil(`https://malicioso.example${URL_REL}`), URL_REL);
    assert.equal(caminhoFotoPerfil(`http://radioon-ten.vercel.app${URL_REL}`), null);
    assert.equal(caminhoFotoPerfil(`${URL_REL}&x=1`), null);
    assert.equal(caminhoFotoPerfil("https://example.com/foto.jpg"), null);
    assert.equal(caminhoFotoPerfil("//example.com/api/perfil"), null);
    assert.equal(caminhoFotoPerfil(null), null);
  });

  it("a foto própria vence a do Google; chave alheia é ignorada", () => {
    const google = "https://lh3.googleusercontent.com/a/x";
    assert.equal(fotoDaConta({ foto_propria: KEY, avatar_url: google }, U), URL_REL);
    assert.equal(fotoDaConta({ foto_propria: `covers/${OUTRO}/${V}`, avatar_url: google }, U), google);
    assert.equal(fotoDaConta({ avatar_url: "http://inseguro" }, U), null);
    assert.equal(fotoDaConta({}, U), null);
  });

  it("story de bio aceita a foto própria (sempre relativa)", () => {
    assert.equal(fotoSegura(`https://qualquer.host${URL_REL}`), URL_REL);
    assert.equal(fotoSegura("https://lh3.googleusercontent.com/a/x"), "https://lh3.googleusercontent.com/a/x");
    assert.equal(fotoSegura("https://example.com/x.jpg"), null);
  });
});
