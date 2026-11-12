import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AUDIO_BASE_URL_PADRAO, PROXY_LIGADO_POR_PADRAO, resolverAudioBaseUrl } from "../lib/audio/base-url.ts";

describe("resolverAudioBaseUrl", () => {
  it("segue o interruptor do padrão (desligado até o Worker ficar saudável)", () => {
    const esperado = PROXY_LIGADO_POR_PADRAO ? AUDIO_BASE_URL_PADRAO : undefined;
    assert.equal(resolverAudioBaseUrl(undefined), esperado);
    assert.equal(resolverAudioBaseUrl("  "), esperado);
  });
  it("aceita sobrescrita e remove barras finais", () => {
    assert.equal(resolverAudioBaseUrl(" https://x.example/ "), "https://x.example");
  });
  it('"off" desliga o proxy', () => {
    assert.equal(resolverAudioBaseUrl("off"), undefined);
  });
});
