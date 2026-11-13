import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decidirTravada, rotuloStatus } from "../lib/tracks/envios.ts";
import { lerUploadKey, parseUploadInput } from "../lib/storage/rules.ts";

const ok = { title: "Faixa", contentType: "audio/mpeg", size: 1000, rightsConfirmed: true };

describe("envios idempotentes", () => {
  it("aceita chave de envio válida e rejeita inválida", () => {
    assert.equal(lerUploadKey("abcdef123456"), "abcdef123456");
    assert.equal(lerUploadKey(undefined), null);
    assert.equal(lerUploadKey("curta"), undefined);
    assert.equal(lerUploadKey("com espaço e símbolos!!"), undefined);
    assert.equal(parseUploadInput({ ...ok, uploadKey: "x" }).ok, false);
    const r = parseUploadInput({ ...ok, uploadKey: "abcdef123456" });
    assert.ok(r.ok && r.value.uploadKey === "abcdef123456");
  });
  it("faixa travada: publica se o arquivo existe, falha com motivo se não, espera se incerto", () => {
    assert.equal(decidirTravada(true, true).acao, "publicar");
    const f = decidirTravada(false, true);
    assert.ok(f.acao === "falhar" && f.motivo.length > 0);
    assert.equal(decidirTravada(null, true).acao, "aguardar");
    assert.equal(decidirTravada(true, false).acao, "falhar");
  });
  it("rótulos de status", () => {
    assert.equal(rotuloStatus("published"), undefined);
    assert.equal(rotuloStatus("processing"), "Em processamento");
    assert.match(rotuloStatus("failed", "motivo") ?? "", /Falhou: motivo/);
  });
});
