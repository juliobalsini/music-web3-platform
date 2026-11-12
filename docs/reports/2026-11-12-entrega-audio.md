# Entrega de áudio econômica — 2026-11-12 (issue #78)

**Vestígio Cloudflare/R2:** só nos docs. O R2 saiu em 2026-11-08 por exigir cartão (DECISIONS 22). Não havia wrangler, dependência,
variável nem código de R2; nada foi removido. Workers + KV gratuitos não pedem cartão, e o B2 segue como único armazenamento.

## Feito (PR entrega-audio-economica)
- **Fase A:** migration aditiva (`stream_path`, `stream_bytes`, `loudness_lufs`, `transcode_status`, `transcode_error`, `transcode_attempts`);
  `lib/audio/transcode.ts` (regra AAC 192 / sem reencode abaixo de 256 kbps, ganho −14 LUFS, máx. +6 dB); `scripts/transcodificar.mjs`
  (3 tentativas → `failed`, lote limitado por faixas e bytes); `/api/tracks/[id]/play` usa `stream_path` só com `done`; player com
  ganho via Web Audio + limitador; `/ajustes` › Normalizar volume (rodapé). Testes: 12 novos.
- **Fase B:** `workers/audio-proxy` (aws4fetch, 206/Range, prefixos fixos, CORS, KV com limites de 25 MB/900 MB/80% da cota);
  `NEXT_PUBLIC_AUDIO_BASE_URL` com fallback ao B2.

## Não feito / precisa do Julio
1. **Workflows** (`transcodificar.yml`, `worker-deploy.yml`) estão em `docs/propostas/workflows/`: `.github/**` é protegido e o PAT não
   tem *Workflows*. Copiar para `.github/workflows/` (aprovação na trava).
2. **Chave B2 de escrita restrita a `audio/stream/`** (`S3_WRITE_KEY_ID`, `S3_WRITE_KEY`) para o transcodificador subir o `.m4a`;
   a de leitura (`B2_READ_KEY*`) não escreve. Também conferir `SUPABASE_URL`/`SUPABASE_SECRET_KEY` e `S3_ENDPOINT/REGION/BUCKET` nos secrets
   do ambiente `producao-db`. Depois do deploy, definir `NEXT_PUBLIC_AUDIO_BASE_URL` na Vercel (a URL `*.workers.dev`).
3. **Medições não feitas** (nada no ar): CPU/memória do Worker servindo ~10 MB do KV, bucket público/privado (assumido **privado**, assinado),
   E2E na prévia (206, 2ª reprodução do KV, ganho) e a Fase C. A CPU do plano gratuito (10 ms) deve ser medida com `wrangler tail` após o deploy;
   se não couber, proponho alternativa aqui antes de mudar a abordagem.
4. Sem ffmpeg no ambiente do agente: o parser do ebur128 e o pipeline ffmpeg foram revisados, não executados.
5. Ganho com Web Audio só vale pelo Worker (CORS); enquanto o app tocar do B2 assinado há só atenuação. UI de Ajustes feita sem rodar a skill
   `impeccable` completa (peça única, reaproveita os padrões de `components/ui`).
