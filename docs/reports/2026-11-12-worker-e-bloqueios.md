# Relatório — Worker de áudio e bloqueios (2026-11-12, 7ª execução)

## Feito
- #81 e #83 já estavam na main. Disparei `worker-deploy` (`gh workflow run`): Worker no ar em `https://radioon-audio.radioon.workers.dev`
  (subdomínio `radioon` registrado via API).
- PR #95: URL gravada como padrão de `NEXT_PUBLIC_AUDIO_BASE_URL` (`lib/audio/base-url.ts`, com sobrescrita por variável e `off`). Mergeado.
- **Incidente evitado/revertido:** logo após o #95 o Worker respondia **503** (sem configuração), o que quebraria a reprodução. PR #96
  (rollback: `PROXY_LIGADO_POR_PADRAO = false`) mergeado minutos depois; produção volta a usar URLs assinadas do B2 (health 200).
  Causa: `B2_ENDPOINT`/`REGION`/`BUCKET` vazios no `worker-deploy` (secrets `S3_*` não existem no ambiente; o workflow gravava vazio em silêncio).
- **PR #97 (protegido, `.github/workflows/worker-deploy.yml`)**: deriva endpoint/região/bucket com `scripts/ci/derivar-env.sh` e falha se algo vier vazio.
  Aguarda a trava `travas`. Depois do merge: disparo `worker-deploy`, valido 200/206 e religo o proxy (um PR de uma linha).

## Bloqueio real (só o Julio)
- **Secret `SUPABASE_SECRET_KEY` no ambiente `producao-db`**: `transcodificar` (lote=5) pulou por falta dele. O agente não cria nem lê secrets.
  Sem ele não há faixas transcodificadas, logo os itens 4–5 do #78 (CPU/memória com `wrangler tail`, 206, KV, ganho) não podem ser medidos.
  Os itens que dependem só do Worker (bucket, 206, KV) seguem após o #97.
- **Aprovar a trava `travas` do #97.**

## Observação de segurança (para decisão)
O Worker serve `tracks/` (originais) sem assinatura (decisão 74 vs. regra 4: URLs assinadas). Já é o desenho aprovado; sugiro, antes de
religar, restringir o proxy a `audio/stream/`, `covers/`, `stories/` e manter `tracks/` por URL assinada. Proposta, não executada.

## Dependabot
#88–90, #92–93 são major: proposta (não mergeio). #91 (minor-patch): pedi rebase para rodar o E2E sem secrets; mergeio se passar.
