#!/usr/bin/env node
// Configura o CORS do bucket de áudio no Backblaze B2 (API nativa, sem dependências).
// Uso: node --env-file=.env.local scripts/b2-cors.mjs
// Lê S3_ACCESS_KEY_ID (keyID), S3_SECRET_ACCESS_KEY (applicationKey) e S3_BUCKET.
// A chave precisa da capability "writeBuckets"; a chave do app normalmente não tem
// (e não deve ter) — rode com uma chave administrativa só para este passo.
// Nunca imprime valores de chaves.

const ORIGENS = ["https://radioon-ten.vercel.app", "http://localhost:3000"];

const CORS_RULES = [
  {
    corsRuleName: "radioon-s3",
    allowedOrigins: ORIGENS,
    // Upload direto por URL assinada (PUT) e playback (GET/HEAD, com Range).
    allowedOperations: ["s3_put", "s3_get", "s3_head"],
    allowedHeaders: ["*"],
    exposeHeaders: ["content-length", "content-range", "accept-ranges", "etag"],
    // 1 dia: o navegador não repete o preflight a cada requisição.
    maxAgeSeconds: 86400,
  },
];

const lerEnv = (n) => process.env[n]?.trim() || undefined;
const keyId = lerEnv("S3_ACCESS_KEY_ID");
const appKey = lerEnv("S3_SECRET_ACCESS_KEY");
const bucketName = lerEnv("S3_BUCKET");
for (const [nome, valor] of Object.entries({
  S3_ACCESS_KEY_ID: keyId,
  S3_SECRET_ACCESS_KEY: appKey,
  S3_BUCKET: bucketName,
})) {
  if (!valor) {
    console.error(`Falta a variável ${nome}.`);
    process.exit(1);
  }
}

async function chamar(url, init) {
  const res = await fetch(url, init);
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    const erro = new Error(`${res.status} ${corpo.code ?? ""} ${corpo.message ?? ""}`.trim());
    erro.code = corpo.code;
    throw erro;
  }
  return corpo;
}

const auth = await chamar("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
  headers: { Authorization: "Basic " + Buffer.from(`${keyId}:${appKey}`).toString("base64") },
});
const api = auth.apiInfo.storageApi;
if (!api.capabilities.includes("writeBuckets")) {
  console.error(
    "A chave não tem a capability writeBuckets: não pode alterar o CORS.\n" +
      "Crie (ou use) uma application key com writeBuckets e rode de novo, ou siga o passo manual do PR.",
  );
  process.exit(2);
}

const headers = { Authorization: auth.authorizationToken, "Content-Type": "application/json" };
const { buckets } = await chamar(`${api.apiUrl}/b2api/v3/b2_list_buckets`, {
  method: "POST",
  headers,
  body: JSON.stringify({ accountId: auth.accountId, bucketName }),
});
if (!buckets?.length) {
  console.error(`Bucket "${bucketName}" não encontrado para esta chave.`);
  process.exit(1);
}

const atualizado = await chamar(`${api.apiUrl}/b2api/v3/b2_update_bucket`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    accountId: auth.accountId,
    bucketId: buckets[0].bucketId,
    corsRules: CORS_RULES,
  }),
});

console.log(`CORS aplicado em "${bucketName}" (tipo: ${atualizado.bucketType}):`);
console.log(JSON.stringify(atualizado.corsRules, null, 2));
if (atualizado.bucketType !== "allPrivate") {
  console.warn("Atenção: o bucket não é allPrivate; o áudio deve ser acessado só por URL assinada.");
}
