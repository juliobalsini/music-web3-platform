import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createUrlCache } from "../lib/player/url-cache.ts";
import { erroDaRotaDeUpload, erroDoBucket } from "../lib/storage/messages.ts";
import { MAX_UPLOAD_BYTES, parseUploadInput, trackKey } from "../lib/storage/rules.ts";

const ok = { title: "Faixa", contentType: "audio/mpeg", size: 1000, rightsConfirmed: true };

describe("parseUploadInput", () => {
  it("aceita entrada válida", () => assert.equal(parseUploadInput(ok).ok, true));
  it("exige direitos confirmados", () =>
    assert.equal(parseUploadInput({ ...ok, rightsConfirmed: false }).ok, false));
  it("recusa formato não aceito", () =>
    assert.equal(parseUploadInput({ ...ok, contentType: "video/mp4" }).ok, false));
  it("recusa arquivo acima de 25 MB", () =>
    assert.equal(parseUploadInput({ ...ok, size: MAX_UPLOAD_BYTES + 1 }).ok, false));
  it("recusa título vazio", () =>
    assert.equal(parseUploadInput({ ...ok, title: "  " }).ok, false));
  it("chave segue tracks/<artist>/<uuid>", () =>
    assert.equal(trackKey("a", "b"), "tracks/a/b"));
});

describe("cache de URL assinada", () => {
  it("reusa a URL até 5 min antes de expirar e renova depois", async () => {
    let t = 0;
    let n = 0;
    const c = createUrlCache(async () => ({ url: `u${++n}`, expiresAt: 3_600_000 }), () => t);
    assert.equal(await c.get("x"), "u1");
    t = 3_000_000;
    assert.equal(await c.get("x"), "u1");
    t = 3_400_000;
    assert.equal(await c.get("x"), "u2");
    assert.equal(await c.get("x", true), "u3");
    assert.equal(n, 3);
  });
});


describe("mensagens de erro do envio", () => {
  it("rota: sessão, perfil e armazenamento", () => {
    assert.match(erroDaRotaDeUpload(401), /sessão expirou/);
    assert.match(erroDaRotaDeUpload(403), /artistas/);
    assert.match(erroDaRotaDeUpload(503), /indisponível/);
  });
  it("rota: validação traduzida e fallback", () => {
    assert.match(erroDaRotaDeUpload(400, "formato de áudio não aceito"), /Formato/);
    assert.match(erroDaRotaDeUpload(400, "arquivo vazio ou maior que 25 MB"), /25 MB/);
    assert.match(erroDaRotaDeUpload(500, "falha ao registrar a faixa"), /Tente de novo/);
  });
  it("bucket: 403/429 = limite diário; outros = falha comum", () => {
    assert.match(erroDoBucket(403), /Limite diário/);
    assert.match(erroDoBucket(429), /Limite diário/);
    assert.doesNotMatch(erroDoBucket(500), /Limite/);
  });
});
