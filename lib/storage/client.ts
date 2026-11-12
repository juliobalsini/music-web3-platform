import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { limpar } from "../env";
import { PLAYBACK_TTL_SECONDS, UPLOAD_TTL_SECONDS, urlDoProxy } from "./rules";

export class StorageUnavailableError extends Error {
  constructor() {
    super("armazenamento indisponível");
  }
}

type Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function readConfig(): Config | null {
  const e = process.env;
  const endpoint = limpar(e.S3_ENDPOINT);
  const region = limpar(e.S3_REGION);
  const accessKeyId = limpar(e.S3_ACCESS_KEY_ID);
  const secretAccessKey = limpar(e.S3_SECRET_ACCESS_KEY);
  const bucket = limpar(e.S3_BUCKET);
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

function getClient(): { s3: S3Client; bucket: string } {
  const c = readConfig();
  if (!c) throw new StorageUnavailableError();
  const s3 = new S3Client({
    endpoint: c.endpoint.startsWith("http") ? c.endpoint : `https://${c.endpoint}`,
    region: c.region,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
    forcePathStyle: true,
    // O B2 não aceita os checksums padrão do SDK.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return { s3, bucket: c.bucket };
}

/** URL assinada de upload (10 min), com tipo e tamanho fixos. */
export async function signUpload(key: string, contentType: string, size: number) {
  const { s3, bucket } = getClient();
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: UPLOAD_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

/** URL assinada de reprodução (1 h). */
export async function signPlayback(key: string) {
  const proxy = urlDoProxy(key, process.env.NEXT_PUBLIC_AUDIO_BASE_URL);
  if (proxy) return proxy;
  const { s3, bucket } = getClient();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: PLAYBACK_TTL_SECONDS,
  });
}

/** URL assinada de capa (1 h); o navegador pode guardar a imagem por 1 h. */
export async function signCover(key: string) {
  const proxy = urlDoProxy(key, process.env.NEXT_PUBLIC_AUDIO_BASE_URL);
  if (proxy) return proxy;
  const { s3, bucket } = getClient();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key, ResponseCacheControl: "public, max-age=3600" }),
    { expiresIn: PLAYBACK_TTL_SECONDS },
  );
}
