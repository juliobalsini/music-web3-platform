import assert from "node:assert/strict";
import { test } from "node:test";

import { ACCEPT_AUDIO, dimensoesCapa, tipoDeAudio } from "../lib/storage/formatos.ts";
import { parseUploadInput } from "../lib/storage/rules.ts";

test("M4A com tipo vazio ou x-m4a é aceito (bug do celular)", () => {
  assert.equal(tipoDeAudio("faixa.m4a", ""), "audio/mp4");
  assert.equal(tipoDeAudio("faixa.M4A", "audio/x-m4a"), "audio/mp4");
  assert.equal(tipoDeAudio("sem-extensao", "audio/x-m4a"), "audio/mp4");
});

test("aceita MP3, AAC, OGG, FLAC, WAV e MP4; recusa o resto", () => {
  for (const [n, t] of [["a.mp3", "audio/mpeg"], ["a.aac", ""], ["a.ogg", "audio/ogg"], ["a.flac", "audio/flac"], ["a.wav", "audio/x-wav"], ["a.mp4", "video/mp4"]]) {
    assert.ok(tipoDeAudio(n, t), n);
  }
  assert.equal(tipoDeAudio("doc.pdf", "application/pdf"), null);
  assert.equal(tipoDeAudio("foto.png", "image/png"), null);
});

test("accept lista extensões explícitas", () => {
  for (const e of [".mp3", ".m4a", ".aac", ".ogg", ".flac", ".wav", ".mp4"]) assert.ok(ACCEPT_AUDIO.includes(e));
});

test("capa: lado maior até 1200 px, sem ampliar", () => {
  assert.deepEqual(dimensoesCapa(4000, 3000), { w: 1200, h: 900 });
  assert.deepEqual(dimensoesCapa(800, 600), { w: 800, h: 600 });
});

test("servidor aceita audio/aac e audio/wav", () => {
  const base = { title: "x", size: 10, rightsConfirmed: true, durationSec: null, cover: null, credits: {} };
  assert.equal(parseUploadInput({ ...base, contentType: "audio/aac" }).ok, true);
  assert.equal(parseUploadInput({ ...base, contentType: "audio/wav" }).ok, true);
  assert.equal(parseUploadInput({ ...base, contentType: "video/mp4" }).ok, false);
});
