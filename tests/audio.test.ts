import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chaveDeReproducao, ganhoDb, lerLufs, planejar } from "../lib/audio/transcode.ts";

describe("planejar", () => {
  it("WAV/FLAC → AAC 192 com taxa original até 48 kHz", () => {
    assert.deepEqual(planejar({ codec: "pcm_s16le", bitrateKbps: 1411, sampleRate: 44100 }), { acao: "aac192", sampleRate: 44100 });
    assert.deepEqual(planejar({ codec: "flac", bitrateKbps: 900, sampleRate: 96000 }), { acao: "aac192", sampleRate: 48000 });
  });
  it("lossy ≥ 256 kbps → AAC 192", () => assert.equal(planejar({ codec: "mp3", bitrateKbps: 320, sampleRate: 44100 }).acao, "aac192"));
  it("lossy < 256 kbps não recodifica", () => {
    assert.deepEqual(planejar({ codec: "mp3", bitrateKbps: 128, sampleRate: 44100 }), { acao: "original", remuxM4a: false });
    assert.deepEqual(planejar({ codec: "aac", bitrateKbps: 192, sampleRate: 44100 }), { acao: "original", remuxM4a: true });
  });
  it("desconhecido mantém o original", () => assert.equal(planejar({ codec: "xyz", bitrateKbps: null, sampleRate: 0 }).acao, "original"));
});

describe("loudness", () => {
  it("ganho leva a −14 LUFS, máx. +6 dB", () => {
    assert.equal(ganhoDb(-10), -4);
    assert.equal(ganhoDb(-20), 6);
    assert.equal(ganhoDb(-30), 6);
    assert.equal(ganhoDb(null), 0);
  });
  it("lê o I: do resumo do ebur128", () => {
    const s = "[Parsed_ebur128_0] Summary:\n\n  Integrated loudness:\n    I:         -13.2 LUFS\n    Threshold: -23.4 LUFS\n";
    assert.equal(lerLufs(s), -13.2);
    assert.equal(lerLufs("nada"), null);
  });
});

describe("chaveDeReproducao", () => {
  it("usa stream só com status done", () => {
    assert.equal(chaveDeReproducao({ r2_key: "o", stream_path: "s", transcode_status: "done" }), "s");
    assert.equal(chaveDeReproducao({ r2_key: "o", stream_path: "s", transcode_status: "pending" }), "o");
    assert.equal(chaveDeReproducao({ r2_key: "o", stream_path: null, transcode_status: "done" }), "o");
  });
});

import { urlDoProxy } from "../lib/storage/rules.ts";
describe("urlDoProxy", () => {
  it("monta a URL do Worker e cai no B2 sem variável ou prefixo", () => {
    assert.equal(urlDoProxy("audio/stream/x.m4a", "https://p.workers.dev/"), "https://p.workers.dev/a/audio/stream/x.m4a");
    assert.equal(urlDoProxy("audio/stream/x.m4a", undefined), undefined);
    assert.equal(urlDoProxy("outro/x", "https://p.workers.dev"), undefined);
    assert.equal(urlDoProxy("covers/a/b", "http://inseguro"), undefined);
  });
});
