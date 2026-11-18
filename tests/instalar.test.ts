import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PAUSA_AVISO_MS, lerNumero, mostrarAviso, plataformaDe } from "../lib/instalar.ts";

const UA = {
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0",
  facebook: "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0;]",
  whatsapp: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WhatsApp/24.1",
  webview: "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131 Mobile Safari/537.36",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

describe("instalar o app", () => {
  it("detecta a plataforma pelo navegador", () => {
    assert.equal(plataformaDe(UA.chromeAndroid), "android");
    assert.equal(plataformaDe(UA.safariIphone), "ios");
    assert.equal(plataformaDe(UA.ipad, 5), "ios");
    assert.equal(plataformaDe(UA.ipad, 0), "outro");
    assert.equal(plataformaDe(UA.instagram), "interno");
    assert.equal(plataformaDe(UA.facebook), "interno");
    assert.equal(plataformaDe(UA.whatsapp), "interno");
    assert.equal(plataformaDe(UA.webview), "interno");
    assert.equal(plataformaDe(UA.desktop), "outro");
  });

  it("aviso da Home: só a partir da 2ª visita e some por 14 dias depois de fechado", () => {
    const agora = 1_000_000_000_000;
    assert.equal(mostrarAviso({ visitas: 1, fechadoEm: null, agora }), false);
    assert.equal(mostrarAviso({ visitas: 2, fechadoEm: null, agora }), true);
    assert.equal(mostrarAviso({ visitas: 5, fechadoEm: agora - 1000, agora }), false);
    assert.equal(mostrarAviso({ visitas: 5, fechadoEm: agora - PAUSA_AVISO_MS + 1, agora }), false);
    assert.equal(mostrarAviso({ visitas: 5, fechadoEm: agora - PAUSA_AVISO_MS, agora }), true);
    assert.equal(mostrarAviso({ visitas: NaN, fechadoEm: null, agora }), false);
  });

  it("lê números do armazenamento local com segurança", () => {
    assert.equal(lerNumero(null), null);
    assert.equal(lerNumero("3"), 3);
    assert.equal(lerNumero("x"), null);
    assert.equal(lerNumero("-1"), null);
  });
});
