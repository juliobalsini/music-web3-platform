# Contexto do radioOn

Fonte de verdade do agente autônomo. Ao iniciar: ler este arquivo, pegar o
próximo item livre da fila e executar. Atualizar ao fim de cada item (via PR).

## Estado atual

- **Fundação concluída** (ciclo 0): Next.js 16 + Supabase + CI.
- **Produção:** https://radioon-ten.vercel.app (Vercel `radioon`, pdx1; deploy a cada push na `main`).
- **Banco:** Supabase `radioon` (us-west-2), 6 tabelas com RLS (`profiles`, `tracks`,
  `playlists`, `playlist_tracks`, `listen_events`, `points_ledger`); migration
  `20261105000000` aplicada; `supabase link` confirmado no Codespace.
- **CI verde** na `main`. Modo autônomo configurado em 2026-11-05 (ver abaixo).

## Fila

Legenda: `[ ]` livre · `[~]` em andamento (tentativas: n) · `[x]` concluído · `[!]` bloqueado.

- [x] **a) Suíte E2E mínima (Playwright)** — concluído em 2026-11-07 (PR #10:
  `e2e/`, `playwright.config.ts`, `app/api/health/route.ts`). O #10 também corrigiu
  o `gate.yml`: o status da prévia do projeto `radioon` tem contexto `Vercel` e
  agora é identificado pelo `target_url` (`/juliobalsinis-projects/radioon/`).
- [x] **a2) PR #11 — mergeado em 2026-11-07; issue #9 fechada.** (histórico: (hook de Notification só em `permission_prompt`)** — atualizado
  com a main; gate verde, aguardando aprovação do Julio no ambiente `travas`
  (`.claude/**`); alerta na issue #9. Agente: não refazer em outro PR; se o #11
  já estiver mergeado, marcar `[x]` e fechar a issue #9; senão, seguir para o b).) — home carrega, identidade visual
  (fundo, logo "radio"+"On" laranja, botão de play), rota `GET /api/health`
  (200, JSON `{ ok: true, commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null }`,
  dinâmica, sem tocar no banco — o gate usa `commit` para confirmar que a prévia
  é a do PR). Contrato com o gate: script
  `pnpm e2e`; base em `E2E_BASE_URL` (padrão `http://localhost:3000`); se
  `VERCEL_AUTOMATION_BYPASS_SECRET` existir, enviar os headers
  `x-vercel-protection-bypass` e `x-vercel-set-bypass-cookie: true`.
  **Sem ela, nada é mergeado** (o gate exige o script `e2e`).
- [!] **b) Ciclo 1 — R2 + upload de faixa + player real.** Depende das credenciais
  R2 (não existem ainda). Se faltarem: abrir "⚠️ Ação necessária" com o passo a
  passo (criar bucket, token R2 com escopo só no bucket, cadastrar na Vercel como
  variáveis de servidor) e pular para o próximo item que não dependa delas.
  **2026-11-08:** credenciais R2 ausentes; alerta aberto, item pulado (retomar quando existirem).
- [ ] **c) Ciclo 2 — auth por magic link**, onboarding com escolha de perfil
  (troca de `role` só no servidor), RLS testado por perfil.
- [ ] **d) Ciclo 3 — playlists do curador**, playlists públicas na home, ranking.
- [ ] **e) Ciclo 4 — heartbeats de escuta**, validação no Postgres, `points_ledger`,
  painel de pontos.
- [ ] **f) Ciclo 5 — home "play primeiro" polida**, métricas básicas.

Fora da fila até o Julio liberar: **Ciclo 6 (tokenização)**.

**Marco pré-lançamento (Julio, numa sessão no Codespace — não é item do agente):**
1. Rodar a skill `security-audit` da Cloudflare
   (https://github.com/cloudflare/security-audit-skill) sobre o repositório.
2. Na mesma sessão, rotacionar a secret key e a senha do banco do Supabase (foram
   expostas no chat do Claude Code) e atualizar Vercel, `.env.local` e o secret
   `SUPABASE_DB_URL`.

## Como o modo autônomo funciona

- **Branches do agente:** só `[a-z0-9-]`, no máx. 28 caracteres (ex.: `item-a-e2e`):
  o gate acessa a prévia por `radioon-git-<branch>-juliobalsinis-projects.vercel.app`.
- **Dois projetos Vercel** estão ligados a este repo: `radioon` (o oficial) e o
  antigo `music-web3-platform` (gera deploys duplicados; o gate o ignora).

- **Agendamento:** `.github/workflows/autonomo.yml`, 08:00 e 20:00 de Brasília
  (STRATEX OS usa 02:00 e 14:00) + disparo manual. **O agendamento do GitHub
  pode atrasar horas ou pular execuções** em horários de pico; não é falha.
  Repositórios públicos sem atividade por 60 dias têm o cron desativado.
- **Agente:** Claude Code com `CLAUDE_CODE_OAUTH_TOKEN` e `AGENT_GH_TOKEN`
  (PAT fine-grained do Julio, sem permissão *Workflows* nem *Administration*:
  não consegue alterar `.github/`, rulesets nem secrets). Sem credencial do banco.
  `VERCEL_TOKEN` (opcional) só para rollback.
- **Gate** (`gate.yml`): travas → lint/typecheck/testes/build → E2E na prévia da
  Vercel (bypass de proteção) → `gate-ok` → merge squash automático.
  PR com arquivo protegido espera aprovação do Julio no ambiente `travas` e vira
  "⚠️ Ação necessária".
- **Arquivos protegidos:** `.github/**`, `.claude/**`, `scripts/notify.sh`,
  `scripts/ci/**`, `supabase/config.toml`, migrations já existentes e a seção
  de travas do `CLAUDE.md`. Mudança nesses arquivos: o agente não consegue nem
  empurrar `.github/` (PAT sem *Workflows*); para os demais, abre PR e aguarda.
- **Migrations** (`migracao.yml`): após o merge, aplica só SQL da allowlist
  (`scripts/ci/validar-sql.mjs`): CREATE TABLE (com ENABLE RLS no mesmo arquivo),
  CREATE INDEX, ADD COLUMN anulável, ENABLE RLS, CREATE POLICY, ADD VALUE,
  CREATE FUNCTION (sql/plpgsql, sem SECURITY DEFINER, corpo sem DDL/DELETE/EXECUTE)
  e CREATE TRIGGER, nunca `OR REPLACE`. GRANT/REVOKE e o resto → "⚠️ Ação
  necessária". `SUPABASE_DB_URL` só existe no ambiente `producao-db` (branch main).
- **Testes sem cota:** prévias e testes nunca usam produção. R2 e serviços com
  cota gratuita: mocks, ou prefixo isolado `test/` (bucket de produção nunca é
  escrito por testes). E2E só lê páginas públicas e `/api/health`.
- **Alertas:** `scripts/notify.sh` → `notify.yml` (github-actions[bot],
  "@juliobalsini" na 1ª linha); no máximo uma issue "⚠️ Ação necessária" por dia.
  Issue fixada **"Painel radioOn"** atualizada por `scripts/painel.sh` ao fim de
  cada execução.
- **Codespace:** `.claude/settings.json` (hook de Notification → notify.sh) vale
  quando o Julio usar o Codespace; no Actions o hook é ignorado.

## Histórico de execuções

- 2026-11-05 — configuração do modo autônomo (PR manual, única exceção às travas).
- 2026-11-07 — sessão manual: o gate falhava por falta do script `e2e` e por buscar o
  status `Vercel – radioon` (o real é `Vercel`). Suíte E2E + correção do gate no
  #10 (mergeado). #8 fechado (branch longo demais para a URL da prévia) e
  substituído pelo #11. Issue #7 (configuração inicial) fechada.
