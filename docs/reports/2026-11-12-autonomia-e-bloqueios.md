# Autonomia, segurança e #78 — 2026-11-12

## Resumo
- **#78 (áudio):** PR #79 está mergeado. Os itens 3–5 (deploy do Worker, lote de 5 faixas, medição de CPU no Worker) **não foram feitos**: dependem do PR #81 (workflows, arquivo protegido), que aguarda sua aprovação no ambiente `travas`.
- **Causa real do bloqueio em .github/\*\*:** o `checkout` do autonomo usa o PAT (`AGENT_GH_TOKEN`), e o PAT atual **empurra** em `.github/workflows/` (testado hoje). O diagnóstico antigo vinha do PAT anterior. Não é preciso editar o `autonomo.yml`. O ruleset só protege a `main`.
- **Secrets de `producao-db`:** o job do agente não usa esse ambiente e o PAT não lista secrets (403), então **não consegui confirmar** `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `S3_*`, `B2_READ_KEY*`, `S3_WRITE_KEY*`, `CF_API_TOKEN`, `CF_ACCOUNT_ID`. A confirmação real é a 1ª execução do `transcodificar` (ele diz exatamente o que falta, sem expor valores).
- **PRs aguardando você (trava `travas`):** #81 (transcodificar.yml, worker-deploy.yml, dependabot.yml) e #83 (regras no CLAUDE.md, auditoria, headers, E2E mobile).

## O que fazer, em ordem
1. Aprovar `travas` no #81 → merge automático. Os workflows já usam `environment: producao-db`.
2. Rodar **worker-deploy** (Actions → Run workflow). A URL `*.workers.dev` aparece no log e no resumo; coloque em `NEXT_PUBLIC_AUDIO_BASE_URL` na Vercel. Exige `CF_API_TOKEN` e `CF_ACCOUNT_ID` no ambiente `producao-db`.
3. Rodar **transcodificar** com `lote=5`.
4. Aprovar `travas` no #83.
5. Na próxima execução o agente faz a medição (itens 4–5 do #78) e os E2E do Worker.
- **PAT:** acrescentar *Dependabot alerts*, *Code scanning alerts* e *Secret scanning alerts* (Read) ao `radioon-agente`; hoje a API devolve 403 e a auditoria não vê esses alertas.
- **Dependabot:** PRs dele não recebem os secrets de Actions; copie `VERCEL_AUTOMATION_BYPASS_SECRET` para *Dependabot secrets* ou o E2E da prévia falha.

## Propostas (próximas tarefas, responda "aprovado <n>")
1. **CSP completa com nonces** — objetivo: fechar XSS por script injetado; escopo: `proxy.ts`, `next.config.ts`; risco médio (pode quebrar scripts inline/Google login); não toca protegidos; 2–3 execuções.
2. **Medição do Worker e E2E do KV (itens 4–5 do #78)** — depois do #81; risco baixo; sem protegidos; 1 execução. Se a CPU passar de 10 ms, proponho alternativa (servir direto do B2 assinado) antes de mudar.
3. **Central de recompensas (item o)** — segue proposta antiga; risco médio; migration aditiva; 2 execuções.

## Segurança
## Segurança (auditoria estática)

**Médio** (1)
- [rls] Tabela story_reports sem policy (acesso só via service_role; confirmar que é intencional).

**Baixo** (4)
- [rls] Tabela profiles com GRANT explícito a anon; revisar contra a auditoria do PR #61 (tests/rls-anonimos.test.ts).
- [rls] Tabela tracks com GRANT explícito a anon; revisar contra a auditoria do PR #61 (tests/rls-anonimos.test.ts).
- [rls] Tabela playlists com GRANT explícito a anon; revisar contra a auditoria do PR #61 (tests/rls-anonimos.test.ts).
- [rls] Tabela playlist_tracks com GRANT explícito a anon; revisar contra a auditoria do PR #61 (tests/rls-anonimos.test.ts).

_Não cobre: alertas Dependabot/CodeQL/secret scanning (o PAT do agente não os lê; ver relatório) nem RLS contra banco real (tests/rls-anonimos.test.ts)._

Chaves a rotacionar (marco pré-lançamento, ordem segura): (1) secret key e senha do Supabase: gerar nova → atualizar Vercel, `.env.local` e `SUPABASE_DB_URL` → validar login e upload → revogar a antiga; (2) chave B2 do app: criar a nova (escopo só no bucket) → atualizar Vercel → validar upload → apagar a antiga; (3) por último a master key do B2 (apagar `B2_TEMP_*` dos Codespaces e gerar nova). O agente não rotaciona nada.

## Teste visual mobile (Fase C)
`e2e/mobile-visual.spec.ts` roda em `iphone` (iPhone 14, Chromium) e `android` (Pixel 7): Home, cada filtro, stories, mini player e player cheio (se houver faixa), Explorar, Perfil e Enviar. Passou localmente. Os screenshots ficam no relatório HTML do Playwright anexado ao run do gate do #83 (artefato). "O que mudou" só será comparável a partir da próxima execução (não havia baseline).

## Diagnóstico do fluxo (Fase D)
O `autonomo.yml` **não fixa modelo**: usa o padrão do `claude` CLI para o token OAuth (esta execução: Sonnet 5.5). Dentro do plano atual dá para escolher outro modelo sem custo extra de dinheiro (consome mais da cota do plano): o CLI aceita `--model` ou `ANTHROPIC_MODEL`. Opção sugerida: input `modelo` no `workflow_dispatch` (vazio = padrão) para usar um modelo mais forte só em arquitetura/auditoria. Mexe em arquivo protegido; **não alterei**.
