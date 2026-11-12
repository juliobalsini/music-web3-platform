#!/usr/bin/env bash
# Preenche no GITHUB_ENV os valores NÃO secretos que faltarem: S3_ENDPOINT, S3_REGION, S3_BUCKET
# (derivados da chave B2 de leitura via b2_authorize_account) e SUPABASE_URL (derivado da ref em SUPABASE_DB_URL).
# Nunca imprime chaves nem URL com senha. Uso: bash scripts/ci/derivar-env.sh (env: B2_READ_KEY_ID, B2_READ_KEY, ...).
set -uo pipefail
if [ -z "${S3_ENDPOINT:-}" ] || [ -z "${S3_REGION:-}" ] || [ -z "${S3_BUCKET:-}" ]; then
  if [ -n "${B2_READ_KEY_ID:-}" ] && [ -n "${B2_READ_KEY:-}" ]; then
    r="$(curl -fsS -u "${B2_READ_KEY_ID}:${B2_READ_KEY}" https://api.backblazeb2.com/b2api/v3/b2_authorize_account 2>/dev/null || true)"
    url="$(printf '%s' "$r" | jq -r '.apiInfo.storageApi.s3ApiUrl // empty')"
    bucket="$(printf '%s' "$r" | jq -r '.apiInfo.storageApi.bucketName // (.apiInfo.storageApi.allowed.buckets[0].name // empty)')"
    if [ -n "$url" ]; then
      echo "S3_ENDPOINT=${S3_ENDPOINT:-$url}" >> "$GITHUB_ENV"
      reg="$(printf '%s' "$url" | sed -E 's#https://s3\.([^.]+)\.backblazeb2\.com.*#\1#')"
      echo "S3_REGION=${S3_REGION:-$reg}" >> "$GITHUB_ENV"
      echo "Derivados do B2: endpoint e região (valores públicos)."
    fi
    [ -n "$bucket" ] && echo "S3_BUCKET=${S3_BUCKET:-$bucket}" >> "$GITHUB_ENV" && echo "Bucket derivado: $bucket"
  fi
fi
if [ -z "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_DB_URL:-}" ]; then
  ref="$(printf '%s' "$SUPABASE_DB_URL" | sed -nE 's#.*postgres\.([a-z0-9]{20})[:@].*#\1#p; s#.*@db\.([a-z0-9]{20})\.supabase\.co.*#\1#p' | head -1)"
  if [ -n "$ref" ]; then echo "SUPABASE_URL=https://${ref}.supabase.co" >> "$GITHUB_ENV"; echo "SUPABASE_URL derivada da ref do projeto."; fi
fi
exit 0
