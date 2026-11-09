import assert from "node:assert/strict";
import { test } from "node:test";

import { itensDoCabecalho } from "../lib/menu.ts";

const hrefs = (s: { role: string | null } | null) => itensDoCabecalho(s).map((i) => i.href);

test("deslogado só vê Entrar", () => {
  assert.deepEqual(hrefs(null), ["/login"]);
});
test("artista vê Enviar música e Métricas", () => {
  assert.deepEqual(hrefs({ role: "artist" }), ["/enviar", "/metricas", "/pontos"]);
});
test("curador e ouvinte", () => {
  assert.deepEqual(hrefs({ role: "curator" }), ["/curador", "/pontos"]);
  assert.deepEqual(hrefs({ role: "listener" }), ["/pontos"]);
});
test("logado sem perfil é levado ao onboarding", () => {
  assert.deepEqual(hrefs({ role: null }), ["/onboarding", "/pontos"]);
});
