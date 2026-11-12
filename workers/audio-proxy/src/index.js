import { AwsClient } from "aws4fetch";

import { CACHE_CONTROL, caminhoPermitido, kvEmRisco, lerRange, origemPermitida, podeGravar } from "./logic.js";

// Chave de controle (uma só): tamanho total no KV + contadores do dia (UTC, igual ao reset do KV).
// Escritas são contadas com exatidão (cada gravação do app já é uma escrita); leituras são
// estimadas por amostragem 1/AMOSTRA para não gastar a cota de escritas só contando.
const CTL = "ctl";
const AMOSTRA = 500;

const hoje = () => new Date().toISOString().slice(0, 10);

async function lerCtl(kv) {
  const c = (await kv.get(CTL, "json")) ?? {};
  const d = hoje();
  return c.dia === d
    ? { bytes: c.bytes ?? 0, dia: d, escritas: c.escritas ?? 0, leituras: c.leituras ?? 0, hits: c.hits ?? 0, miss: c.miss ?? 0, direto: c.direto ?? 0 }
    : { bytes: c.bytes ?? 0, dia: d, escritas: 0, leituras: 0, hits: 0, miss: 0, direto: 0 };
}

function cors(req, env) {
  const origem = origemPermitida(req.headers.get("Origin"), (env.ALLOWED_ORIGINS ?? "").split(","), env.ALLOWED_ORIGIN_REGEX);
  const h = new Headers({ Vary: "Origin", "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, X-Cache" });
  if (origem) {
    h.set("Access-Control-Allow-Origin", origem);
    h.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Range");
    h.set("Access-Control-Max-Age", "86400");
  }
  return h;
}

function resposta(req, corpo, tipo, size, range, base, extra) {
  const h = new Headers(base);
  h.set("Content-Type", tipo);
  h.set("Accept-Ranges", "bytes");
  h.set("Cache-Control", CACHE_CONTROL);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  const head = req.method === "HEAD";
  if (range === "invalido") {
    h.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers: h });
  }
  if (range) {
    h.set("Content-Range", `bytes ${range.ini}-${range.fim}/${size}`);
    h.set("Content-Length", String(range.fim - range.ini + 1));
    return new Response(head ? null : corpo.slice(range.ini, range.fim + 1), { status: 206, headers: h });
  }
  h.set("Content-Length", String(size));
  return new Response(head ? null : corpo, { status: 200, headers: h });
}

function assinador(env) {
  return new AwsClient({ accessKeyId: env.B2_READ_KEY_ID, secretAccessKey: env.B2_READ_KEY, service: "s3", region: env.B2_REGION });
}
function urlB2(env, caminho) {
  const host = env.B2_ENDPOINT.startsWith("http") ? env.B2_ENDPOINT : `https://${env.B2_ENDPOINT}`;
  return `${host.replace(/\/+$/, "")}/${env.B2_BUCKET}/${caminho.split("/").map(encodeURIComponent).join("/")}`;
}

/** Passa direto ao B2 (KV fora do ar/cheio/arquivo grande): repassa Range; cada chamada é 1 Classe B. */
async function direto(req, env, caminho, base) {
  const headers = {};
  const r = req.headers.get("Range");
  if (r) headers.Range = r;
  const up = await assinador(env).fetch(urlB2(env, caminho), { method: req.method === "HEAD" ? "HEAD" : "GET", headers });
  const h = new Headers(base);
  for (const k of ["Content-Type", "Content-Length", "Content-Range", "ETag"]) if (up.headers.get(k)) h.set(k, up.headers.get(k));
  h.set("Accept-Ranges", "bytes");
  h.set("Cache-Control", up.ok ? CACHE_CONTROL : "no-store");
  h.set("X-Cache", "BYPASS");
  return new Response(up.body, { status: up.status, headers: h });
}

const proxy = {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const base = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: base });
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("método não permitido", { status: 405, headers: base });
    if (!url.pathname.startsWith("/a/")) return new Response("não encontrado", { status: 404, headers: base });
    let caminho;
    try {
      caminho = decodeURIComponent(url.pathname.slice(3));
    } catch {
      return new Response("não encontrado", { status: 404, headers: base });
    }
    if (!caminhoPermitido(caminho, (env.ALLOWED_PREFIXES ?? "").split(","))) return new Response("não encontrado", { status: 404, headers: base });
    if (!env.B2_READ_KEY_ID || !env.B2_READ_KEY || !env.B2_ENDPOINT || !env.B2_BUCKET) return new Response("indisponível", { status: 503, headers: base });

    const cfg = {
      maxItem: Number(env.KV_MAX_ITEM_BYTES),
      maxTotal: Number(env.KV_MAX_TOTAL_BYTES),
      ttl: Number(env.KV_TTL_SECONDS),
      escritasDia: Number(env.KV_WRITES_DAILY),
      leiturasDia: Number(env.KV_READS_DAILY),
    };
    if (!env.CACHE) return direto(req, env, caminho, base);
    const t0 = Date.now();
    try {
      const ctl = await lerCtl(env.CACHE);
      const salvar = (alteracao) => env.CACHE.put(CTL, JSON.stringify({ ...ctl, ...alteracao }));
      if (kvEmRisco(ctl, cfg)) {
        ctx.waitUntil(salvar({ direto: ctl.direto + 1 }));
        return direto(req, env, caminho, base);
      }
      const chave = `o:${caminho}`;
      const { value, metadata } = await env.CACHE.getWithMetadata(chave, "arrayBuffer");
      if (value) {
        const size = value.byteLength;
        if (Math.random() < 1 / AMOSTRA) ctx.waitUntil(salvar({ leituras: ctl.leituras + AMOSTRA, hits: ctl.hits + AMOSTRA }));
        const range = lerRange(req.headers.get("Range"), size);
        return resposta(req, value, metadata?.tipo ?? "application/octet-stream", size, range, base, { "X-Cache": "HIT", "Server-Timing": `kv;dur=${Date.now() - t0}` });
      }
      // MISS: UM único GET completo ao B2 (sem Range), gravado no KV se couber.
      const up = await assinador(env).fetch(urlB2(env, caminho), { method: "GET" });
      if (!up.ok) return new Response(up.status === 404 ? "não encontrado" : "indisponível", { status: up.status === 404 ? 404 : 502, headers: { ...Object.fromEntries(base), "Cache-Control": "no-store" } });
      const tipo = up.headers.get("Content-Type") ?? "application/octet-stream";
      const declarado = Number(up.headers.get("Content-Length") ?? 0);
      if (declarado > cfg.maxItem) {
        // Grande demais para o KV: repassa o corpo desta requisição (já foi 1 GET) e não grava.
        const h = new Headers(base);
        h.set("Content-Type", tipo);
        h.set("Content-Length", String(declarado));
        h.set("Accept-Ranges", "bytes");
        h.set("Cache-Control", CACHE_CONTROL);
        h.set("X-Cache", "BYPASS");
        return new Response(req.method === "HEAD" ? null : up.body, { status: 200, headers: h });
      }
      const buf = await up.arrayBuffer();
      if (podeGravar(buf.byteLength, ctl, cfg)) {
        ctx.waitUntil(
          (async () => {
            await env.CACHE.put(chave, buf, { expirationTtl: cfg.ttl, metadata: { tipo } });
            await salvar({ bytes: ctl.bytes + buf.byteLength, escritas: ctl.escritas + 2, miss: ctl.miss + 1 });
          })().catch(() => {}),
        );
      }
      const range = lerRange(req.headers.get("Range"), buf.byteLength);
      return resposta(req, buf, tipo, buf.byteLength, range, base, { "X-Cache": "MISS", "Server-Timing": `b2;dur=${Date.now() - t0}` });
    } catch {
      return direto(req, env, caminho, base); // KV com falha: segue direto do B2
    }
  },
};

export default proxy;
