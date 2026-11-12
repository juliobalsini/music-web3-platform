import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AUDIO_BASE_URL_PADRAO, resolverAudioBaseUrl } from "../lib/audio/base-url.ts";

describe("resolverAudioBaseUrl", () => {
  it("usa o Worker público como padrão", () => {
    assert.equal(resolverAudioBaseUrl(undefined), AUDIO_BASE_URL_PADRAO);
    assert.equal(resolverAudioBaseUrl("  "), AUDIO_BASE_URL_PADRAO);
  });
  it("aceita sobrescrita e remove barras finais", () => {
    assert.equal(resolverAudioBaseUrl(" https://x.example/ "), "https://x.example");
  });
  it('"off" desliga o proxy', () => {
    assert.equal(resolverAudioBaseUrl("off"), undefined);
  });
});
