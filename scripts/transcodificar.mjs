#!/usr/bin/env node
// Transcodificador (Fase A da entrega de áudio econômica). Roda no GitHub Actions (ffmpeg via apt).
// - Busca faixas com transcode_status NULL/'pending' (NULL = backfill implícito das faixas antigas).
// - Baixa o original do B2, decide com ffprobe (lib/audio/transcode.ts), mede a loudness (ebur128,
//   só análise) e grava stream_path/stream_bytes/loudness_lufs. Nunca normaliza o arquivo.
// - Não apaga nada. 3 falhas → 'failed' (vai ao relatório).
// - Respeita a cota do B2: cada download do original é 1 Classe B; por execução há teto de
//   faixas e de bytes (LOTE_MAX, LOTE_MAX_MB), pensado para rodar a cada 30 min.
// Banco: usa SUPABASE_DB_URL (a mesma conexão do workflow migracao), sem secret novo; só toca em `tracks`.
// Env: SUPABASE_DB_URL, S3_ENDPOINT, S3_REGION, S3_BUCKET e a chave S3 de ESCRITA
// restrita a audio/stream/ (S3_WRITE_KEY_ID/S3_WRITE_KEY; leitura pode usar B2_READ_KEY_ID/B2_READ_KEY).
// Nunca imprime valores de chaves.

import { execFileSync, spawnSync } from "node:child_process";
import { createReadStream, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

import pg from "pg";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { TENTATIVAS_MAX, chaveStream, lerLufs, planejar } from "../lib/audio/transcode.ts";

const e = process.env;
const faltam = ["SUPABASE_DB_URL", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET"].filter((k) => !e[k]);
const leitura = { accessKeyId: e.B2_READ_KEY_ID || e.S3_ACCESS_KEY_ID, secretAccessKey: e.B2_READ_KEY || e.S3_SECRET_ACCESS_KEY };
const escrita = { accessKeyId: e.S3_WRITE_KEY_ID, secretAccessKey: e.S3_WRITE_KEY };
if (faltam.length || !leitura.accessKeyId || !escrita.accessKeyId) {
  console.log(`Transcodificação pulada: configuração ausente (${[...faltam, !leitura.accessKeyId && "chave de leitura", !escrita.accessKeyId && "chave de escrita"].filter(Boolean).join(", ")}).`);
  process.exit(0);
}
const LOTE_MAX = Number(e.LOTE_MAX ?? 15);
const LOTE_MAX_BYTES = Number(e.LOTE_MAX_MB ?? 250) * 1024 * 1024;
const endpoint = e.S3_ENDPOINT.startsWith("http") ? e.S3_ENDPOINT : `https://${e.S3_ENDPOINT}`;
const cliente = (credentials) =>
  new S3Client({ endpoint, region: e.S3_REGION, credentials, forcePathStyle: true, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
const s3Leitura = cliente(leitura);
const s3Escrita = cliente(escrita);

const db = new pg.Client({ connectionString: e.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const COLUNAS = new Set(["stream_path", "stream_bytes", "loudness_lufs", "transcode_status", "transcode_error", "transcode_attempts"]);
const patch = async (id, corpo) => {
  const chaves = Object.keys(corpo);
  if (!chaves.every((k) => COLUNAS.has(k))) throw new Error("coluna não permitida");
  await db.query(`update public.tracks set ${chaves.map((k, i) => `${k} = $${i + 2}`).join(", ")} where id = $1`, [id, ...chaves.map((k) => corpo[k])]);
};

const rodar = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} falhou: ${(r.stderr || "").slice(-300)}`);
  return r;
};

function sondar(arq) {
  const j = JSON.parse(rodar("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name,bit_rate,sample_rate:format=bit_rate", "-of", "json", arq]).stdout);
  const s = j.streams?.[0];
  if (!s) throw new Error("sem faixa de áudio");
  const bps = Number(s.bit_rate ?? j.format?.bit_rate);
  return { codec: s.codec_name, bitrateKbps: Number.isFinite(bps) && bps > 0 ? bps / 1000 : null, sampleRate: Number(s.sample_rate) || 44100 };
}

function loudness(arq) {
  // Apenas análise (-f null): o arquivo de saída não é gerado.
  const r = spawnSync("ffmpeg", ["-nostats", "-hide_banner", "-i", arq, "-vn", "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return lerLufs(r.stderr ?? "");
}

async function processar(t, dir) {
  const orig = join(dir, "original");
  const r = await s3Leitura.send(new GetObjectCommand({ Bucket: e.S3_BUCKET, Key: t.r2_key })); // 1 Classe B
  await pipeline(r.Body, createWriteStream(orig));
  const plano = planejar(sondar(orig));
  const lufs = loudness(orig);
  let streamPath = t.r2_key;
  let bytes = statSync(orig).size;
  if (plano.acao === "aac192" || plano.remuxM4a) {
    const saida = join(dir, "stream.m4a");
    const audio = plano.acao === "aac192" ? ["-c:a", "aac", "-b:a", "192k", "-ar", String(plano.sampleRate)] : ["-c:a", "copy"];
    rodar("ffmpeg", ["-y", "-v", "error", "-i", orig, "-vn", "-map", "0:a:0", ...audio, "-movflags", "+faststart", saida]); // sem filtro de áudio
    bytes = statSync(saida).size;
    streamPath = chaveStream(t.id);
    await s3Escrita.send(new PutObjectCommand({ Bucket: e.S3_BUCKET, Key: streamPath, Body: createReadStream(saida), ContentLength: bytes, ContentType: "audio/mp4", CacheControl: "public, max-age=31536000, immutable" }));
  }
  await patch(t.id, { stream_path: streamPath, stream_bytes: bytes, loudness_lufs: lufs, transcode_status: "done", transcode_error: null });
  return { id: t.id, acao: plano.acao === "aac192" ? "aac192" : plano.remuxM4a ? "remux" : "original", de: statSync(orig).size, para: bytes, lufs };
}

execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
const { rows: faixas } = await db.query(
  `select id, r2_key, transcode_attempts from public.tracks where status <> 'removed' and (transcode_status is null or transcode_status = 'pending') order by created_at asc limit $1`,
  [LOTE_MAX],
);
console.log(`${faixas.length} faixa(s) pendente(s) neste lote.`);
let usados = 0;
const resultados = [];
for (const t of faixas) {
  if (usados >= LOTE_MAX_BYTES) { console.log("Teto de bytes do lote atingido; o resto fica para a próxima execução."); break; }
  const dir = mkdtempSync(join(tmpdir(), "trans-"));
  try {
    const r = await processar(t, dir);
    usados += r.de;
    resultados.push(r);
    console.log(`ok ${r.id} ${r.acao} ${r.de}→${r.para} bytes, ${r.lufs ?? "?"} LUFS`);
  } catch (err) {
    const tent = (t.transcode_attempts ?? 0) + 1;
    const msg = String(err?.message ?? err).replace(/\s+/g, " ").slice(0, 300);
    console.log(`falha ${t.id} (tentativa ${tent}/${TENTATIVAS_MAX}): ${msg}`);
    await patch(t.id, { transcode_attempts: tent, transcode_error: msg, transcode_status: tent >= TENTATIVAS_MAX ? "failed" : "pending" }).catch(() => {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
if (e.GITHUB_STEP_SUMMARY) writeFileSync(e.GITHUB_STEP_SUMMARY, `Transcodificadas: ${resultados.length}\n`, { flag: "a" });
await db.end();
