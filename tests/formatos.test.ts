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

const base = { title: "Faixa", contentType: "audio/mpeg", size: 1000, rightsConfirmed: true, durationSec: 100 };

test("gênero e clima: opcionais, lista fixa", () => {
  const ok = parseUploadInput({ ...base, genre: "mpb", mood: "chuva" });
  assert.equal(ok.ok && ok.value.genre, "mpb");
  assert.equal(ok.ok && ok.value.mood, "chuva");
  const vazio = parseUploadInput({ ...base, genre: "", mood: null });
  assert.equal(vazio.ok && vazio.value.genre, null);
  assert.equal(parseUploadInput({ ...base, genre: "xyz" }).ok, false);
  assert.equal(parseUploadInput({ ...base, mood: "triste" }).ok, false);
});

import { parseAlbumInput } from "../lib/storage/albuns.ts";
import { contarCampo, montarAlbuns, recomendar, resumoSemana } from "../lib/radio/rules.ts";

const faixaOk = (t: string) => ({ title: t, contentType: "audio/mpeg", size: 1000, durationSec: 120 });
const albumBase = { title: "Sinais", kind: "ep", rightsConfirmed: true, genre: "mpb", mood: "chuva", faixas: [faixaOk("A"), faixaOk("B")] };

test("álbum/EP: 2 a 20 faixas, capa única, herda gênero/clima/direitos", () => {
  const ok = parseAlbumInput({ ...albumBase, cover: { contentType: "image/webp", size: 5000 } });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.faixas.length, 2);
    assert.equal(ok.value.faixas[1].genre, "mpb");
    assert.equal(ok.value.faixas[0].credits.album, "Sinais");
    assert.equal(ok.value.cover?.contentType, "image/webp");
  }
  assert.equal(parseAlbumInput({ ...albumBase, faixas: [faixaOk("A")] }).ok, false);
  assert.equal(parseAlbumInput({ ...albumBase, faixas: Array.from({ length: 21 }, (_, i) => faixaOk(String(i))) }).ok, false);
  assert.equal(parseAlbumInput({ ...albumBase, kind: "single" }).ok, false);
  assert.equal(parseAlbumInput({ ...albumBase, rightsConfirmed: false }).ok, false);
  assert.equal(parseAlbumInput({ ...albumBase, title: " " }).ok, false);
  assert.equal(parseAlbumInput({ ...albumBase, faixas: [faixaOk("A"), { ...faixaOk("B"), contentType: "text/plain" }] }).ok, false);
});

const fx = (id: string, o: Partial<{ genre: string | null; likes: number; plays: number; createdAt: string; artistId: string; artistName: string; albumId: string | null; trackNo: number | null }> = {}) => ({
  id, genre: null, likes: 0, plays: 0, createdAt: "2026-11-01T00:00:00Z", artistId: "ar1", artistName: "Ana", albumId: null, trackNo: null, ...o,
});

test("recomendar: gêneros curtidos primeiro, nunca o já curtido; sem curtidas, as mais populares", () => {
  const faixas = [fx("a", { genre: "jazz" }), fx("b", { genre: "jazz", likes: 1 }), fx("c", { genre: "rock", likes: 9 }), fx("d", { genre: "jazz" })];
  assert.deepEqual(recomendar(faixas, new Set(["a"])).map((f) => f.id), ["b", "d", "c"]);
  assert.deepEqual(recomendar(faixas, new Set()).map((f) => f.id)[0], "c");
  assert.equal(recomendar(faixas, new Set(["a", "b", "c", "d"])).length, 0);
});

test("contarCampo ignora nulos e ordena por frequência", () => {
  const r = contarCampo([fx("a", { genre: "x" }), fx("b", { genre: "y" }), fx("c", { genre: "y" }), fx("d")], (f) => f.genre);
  assert.deepEqual(r, [{ id: "y", total: 2 }, { id: "x", total: 1 }]);
});

test("resumo da semana: só escutas válidas dos últimos 7 dias", () => {
  const agora = Date.parse("2026-11-11T12:00:00Z");
  const dia = (d: number) => new Date(agora - d * 86400000).toISOString();
  const faixas = [fx("a", { genre: "jazz" }), fx("b", { genre: "rock", artistId: "ar2", artistName: "Beto" })];
  const ev = [
    { track_id: "a", started_at: dia(1), is_valid: true },
    { track_id: "a", started_at: dia(2), is_valid: true },
    { track_id: "b", started_at: dia(1), is_valid: true },
    { track_id: "b", started_at: dia(1), is_valid: false },
    { track_id: "b", started_at: dia(9), is_valid: true },
  ];
  const r = resumoSemana(ev, faixas, agora);
  assert.equal(r.escutas, 3);
  assert.deepEqual(r.artistas.map((a) => [a.nome, a.escutas]), [["Ana", 2], ["Beto", 1]]);
  assert.deepEqual(r.generos, [{ id: "jazz", escutas: 2 }, { id: "rock", escutas: 1 }]);
});

test("montarAlbuns ordena faixas pelo nº e esconde álbum sem faixa publicada", () => {
  const f = [fx("a", { albumId: "al1", trackNo: 2 }), fx("b", { albumId: "al1", trackNo: 1 })] as never;
  const linhas = [
    { id: "al1", title: "X", kind: "ep", artist_id: "ar1", created_at: "2026-11-02T00:00:00Z" },
    { id: "al2", title: "Vazio", kind: "album", artist_id: "ar1", created_at: "2026-11-03T00:00:00Z" },
  ];
  const r = montarAlbuns(linhas, f, () => "Ana");
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].faixas.map((x) => x.id), ["b", "a"]);
  assert.equal(r[0].kind, "ep");
});
