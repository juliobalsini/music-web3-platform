# Contexto do radioOn

Fonte de verdade do agente autônomo. Ao iniciar: ler este arquivo, pegar o
próximo item livre da fila e executar. Atualizar ao fim de cada item (via PR).

## Estado atual

- **Fundação concluída** (ciclo 0): Next.js 16 + Supabase + CI.
- **Produção:** https://radioon-ten.vercel.app (Vercel `radioon`, pdx1; deploy a cada push na `main`).
- **Banco:** Supabase `radioon` (us-west-2), 6 tabelas com RLS (`profiles`, `tracks`,
  `playlists`, `playlist_tracks`, `listen_events`, `points_ledger`); migration
  `20261105000000` aplicada; `supabase link` confirmado no Codespace.
- **Redesenho mobile-first** em produção desde 2026-11-10 (r1–r2): Rádio/Explorar/Minha rádio,
  player global; migration `20261110000000` aplicada.
- **CI verde** na `main`. Modo autônomo configurado em 2026-11-05 (ver abaixo).

## Fila

Legenda: `[ ]` livre · `[~]` em andamento (tentativas: n) · `[x]` concluído · `[!]` bloqueado.

- [x] **a) Suíte E2E mínima (Playwright)** — concluído em 2026-11-07 (PR #10:
  `e2e/`, `playwright.config.ts`, `app/api/health/route.ts`). O #10 também corrigiu
  o `gate.yml`: o status da prévia do projeto `radioon` tem contexto `Vercel` e
  agora é identificado pelo `target_url` (`/juliobalsinis-projects/radioon/`).
- [x] **a2) PR #11 (hook de Notification só em `permission_prompt`)** — mergeado
  em 2026-11-07; issue #9 fechada.
- [x] **b) Ciclo 1 — armazenamento S3 (Backblaze B2) + upload de faixa + player real.**
  **Concluído em 2026-11-08** (PR item-b-storage-upload: `lib/storage/`, rotas
  `/api/tracks/upload`, `/[id]/publish`, `/[id]/play`, `components/player.tsx`, `/enviar`).
  Pendências: o `Player` ainda não está montado em nenhuma página (sem listagem de
  faixas até o ciclo 3/5); upload exige login de artista (ciclo 2); CORS segue pendente
  do Julio se não aplicado. Liberado em 2026-11-08 (R2 trocado por B2; decisões 22–25 no DECISIONS.md).
  Credenciais já na Vercel (**só Production**): `S3_ENDPOINT`, `S3_REGION`,
  `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`. Escopo:
  - `lib/storage/` (só servidor, `import "server-only"`): cliente
    `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` com `forcePathStyle`,
    `requestChecksumCalculation`/`responseChecksumValidation: "WHEN_REQUIRED"`
    (o B2 não aceita os checksums padrão do SDK). Sem as variáveis (prévias,
    testes), as rotas respondem 503 "armazenamento indisponível", sem quebrar a página.
  - Upload: rota de servidor assina `PutObject` (10 min) com `ContentType` e
    `ContentLength` fixos; aceita só áudio (`audio/mpeg`, `audio/mp4`, `audio/ogg`,
    `audio/flac`) até 25 MB; exige `rights_confirmed`; chave `tracks/<artist_id>/<uuid>`;
    upload direto do navegador ao bucket (não passa pela Vercel).
  - Playback: rota de servidor assina `GetObject` (1 h) só para faixa `published`.
  - **Player econômico (cota diária):** `<audio preload="none">`, sem pré-buscar a
    próxima faixa; um único elemento `<audio>` reaproveitado; uma URL assinada por
    faixa, guardada no cliente e reusada em pausa/retomada/seek até ~5 min antes de
    expirar; nenhum HEAD/LIST no bucket (duração vem de `tracks.duration_sec`, chaves
    vêm do banco); em 403/429 do bucket, mensagem curta "limite diário atingido" e no
    máximo 1 nova tentativa (sem loop).
  - Testes: unitários com mock do S3; E2E só com rotas públicas (prévias não têm
    as variáveis S3). Bucket de produção nunca é escrito por testes.
  - UI (upload e player) com a skill `impeccable`.
  - **Pendente do Julio, não bloqueia o código:** aplicar o CORS do bucket
    (`node --env-file=.env.local scripts/b2-cors.mjs`, chave com `writeBuckets`).
    Se o upload do navegador falhar por CORS em produção, registrar aqui e seguir.
- [x] **c) Ciclo 2 — auth por magic link**, onboarding com escolha de perfil
  (troca de `role` só no servidor), RLS testado por perfil. Concluído em 2026-11-08
  (PR item-c-auth: `/login`, `/auth/callback`, `/onboarding`, `proxy.ts`, `lib/auth/roles.ts`).
  Pendências: RLS testado só por análise estática da migration (sem credencial de banco
  no agente); Julio deve conferir no Supabase Auth: Site URL e Redirect URLs com
  `https://radioon-ten.vercel.app/auth/callback`, e o limite do e-mail embutido (gratuito).
  `lib/auth.ts` virou `lib/session.ts`.
- [x] **d) Ciclo 3 — playlists do curador**, playlists públicas na home, ranking.
  Concluído em 2026-11-09 (PR item-d-playlists: `/curador`, `/playlist/[id]`, home com
  ranking, `lib/playlists/`). Sem migration (schema/RLS do ciclo 0 bastaram). Pendências:
  RLS das escritas só por análise estática; ranking = nº de faixas (decisão 26); sem
  reordenar/ocultar playlist na UI ainda.
- [x] **e) Ciclo 4 — heartbeats de escuta**, validação no Postgres, `points_ledger`,
  painel de pontos. Concluído em 2026-11-09 (PR item-e-heartbeats: migration
  `20261109000000` com `listen_start`/`listen_beat`, rotas `/api/listen/*`, `/pontos`,
  heartbeat de 10 s no `Player`). Pendências: a lógica SQL não foi testada contra um
  banco (agente sem credencial) — Julio deve fazer uma escuta real logado e conferir
  `/pontos`; env opcionais `POINTS_PER_LISTEN` (10) e `POINTS_DAILY_LIMIT` (200);
  `SUPABASE_SECRET_KEY` precisa existir na Vercel Production.
- [x] **f) Ciclo 5 — home "play primeiro" polida**, métricas básicas. Concluído em 2026-11-09
  (PR item-f-home: home com `Player` grande na faixa mais recente + lista de faixas,
  `/metricas` para artistas, `lib/tracks/`). Sem migration. Pendências: sem faixas
  publicadas a home mostra o play inativo; `/metricas` usa service_role (só lê escutas das
  faixas do próprio artista) e ainda não tem link na UI; skill `impeccable` seguiu o caminho
  "Launcher unavailable", sem PRODUCT.md/DESIGN.md (não existem).

- [x] **g) Home/navegação (pedido do Julio, teste real em produção)** — cabeçalho com
  Entrar (deslogado) e, logado, Enviar música/Métricas (artista), Playlists (curador),
  Escolher perfil (sem perfil) e Pontos; estado vazio com convite ao artista e play inerte;
  `/enviar` agora redireciona (login/onboarding). E2E do estado vazio e da navegação.
  Concluído em 2026-11-09 (branch item-g-cabecalho-vazio). Obs.: E2E local de redirects
  exige `NEXT_PUBLIC_SUPABASE_URL`/`_PUBLISHABLE_KEY` (podem ser fictícias).

### Fase UX (pedido do Julio em 2026-11-10; relatório único só ao fim da fase)

Os itens do pedido eram "g–j", mas g)/f) já existiam acima; aqui levam sufixo 2 (decisão 30).

- [x] **g2) PRODUCT.md e DESIGN.md** para a skill `impeccable` — concluído em 2026-11-10 (PR #33).
  Escritos sem entrevista (não há humano); fatos inferidos estão marcados em PRODUCT.md.
- [x] **h2) Impeccable em todas as telas** (home, login, onboarding, enviar, métricas, curador,
  playlist, pontos): polimento visual, textos curtos, acessibilidade, mobile (tentativas: 1;
  `components/ui.tsx` com `campo`/`botao`/`Mensagem`/`Tela`; foco global, seleção, alvos 44 px,
  texto `night-900` sobre laranja; E2E local sem browser do Playwright, validado no gate).
  Concluído em 2026-11-10 (PR #34).
- [x] **i2) Login preservando o destino** — concluído em 2026-11-10 (PR item-i2-login-destino).
  Páginas protegidas redirecionam a `/login?next=<caminho>`; o destino vai num cookie httpOnly
  (`radioon_next`, path `/auth`, 1 h) e não na URL do magic link, porque o Supabase só aceita
  redirects da allowlist (query no `emailRedirectTo` poderia cair no Site URL). `/auth/callback`
  valida com `safeNext`. Limite: link aberto em outro navegador perde o destino (vai a `/onboarding`).
- [x] **j2) Estados vazios e mensagens de erro** de todas as telas (upload falho, limite diário
  do B2, sem pontos ainda) — concluído em 2026-11-10 (PR item-j2-estados-erros):
  `lib/storage/messages.ts` (erros do envio, 403/429 do bucket = limite diário), vazios em
  `/pontos`, `/metricas`, `/curador`, `/playlist`, `app/not-found.tsx` e `app/error.tsx` em pt-BR.
  Obs.: erro de rede no PUT ao B2 pode ser cota (sem CORS na resposta); a mensagem diz isso.

### Redesenho mobile-first (pedido do Julio em 2026-11-10; instrução extra da execução)

- [x] **r1) Identidade** (marinho/âmbar, gramofone, abertura, grão, frase, env com trim, e-mails em
  `docs/emails-autenticacao.md`, proposta "faixa bônus" no PLANO.md) — concluído em 2026-11-10 (PR #42).
- [x] **r2) Rádio, Explorar, Minha rádio, player global, envio com capa/ficha, curador com notas e
  programação** — concluído em 2026-11-10 (PR #43; migration aditiva `20261110000000`).
  Pendências: policies/consultas novas só revisadas por leitura (sem credencial de banco); catálogo
  de produção vazio, então listas e player cheio não foram vistos com dados; o `.jpeg` do pedido era
  um print do Audius, não o site de 2012 (ver relatório 2026-11-10-redesenho-mobile.md).
- [x] **r3) DESIGN.md/PRODUCT.md, DECISIONS 33–40, relatório e prints** — esta execução.

### Instrução prioritária do Julio (2026-11-10, teste real no celular)

- [x] **p0) Bug das faixas / dados de demo / fidelidade ao protótipo / envio no celular / login / PWA**
  — PR #47, em produção (commit 265268d) em 2026-11-10; ver DECISIONS 41–45 e `docs/reports/2026-11-10-correcoes-celular.md`.
  Pendências: confirmar em produção com faixa real; criar a credencial Google (passo a passo no
  relatório); Explorar do protótipo (busca, "por clima", gêneros) fica para o item k.

### Fase proposta: Descoberta e curadoria (Fase 1 do `docs/PLANO.md`)

Fila vazia em 2026-11-10; itens **propostos**, só executar após "aprovado" do Julio na issue do
relatório (ex.: "aprovado k, l"; "recusado n"). Nenhum exige serviço pago nem credencial nova.

- [x] **k) Busca de faixas e playlists** (título/artista/curador) — concluído em 2026-11-10 (PR item-k-busca): campo na Rádio e em `/explorar?q=` (GET, sem JS), filtro em memória sem acento (`buscar` em `lib/radio/rules.ts`). Sem migration. Limite: busca só no catálogo já carregado pela Rádio.
- [x] **l) Páginas públicas de artista e de curador** — concluído em 2026-11-10 (PR item-l-perfil): `/perfil/[id]` (nome, faixas publicadas, playlists públicas; 404 sem conteúdo), ligada por Playlisters em alta e pelo curador na playlist. Sem migration. Pendência: nome do artista ainda não é link nas listas de faixas.
- [x] **m) Curador: reordenar, ocultar e destacar faixas** — concluído em 2026-11-10 (PR item-m-curadoria; migration aditiva `20261111000000`; DECISIONS 46). Também corrige a nota do playlister (faltava grant). Pendência: lógica só validada por tipos/testes, sem banco; conferir logado como curador.
- [ ] **n) Ranking de playlists por escutas válidas** (troca a decisão 26) — aprovado (#45).
- [ ] **o) Central de recompensas (v1)**: `/pontos` com metas diárias e histórico por perfil — proposto.

Fora da fila até o Julio liberar: **Ciclo 6 (tokenização)**.

**Marco pré-lançamento (Julio, numa sessão no Codespace — não é item do agente):**
1. Rodar a skill `security-audit` da Cloudflare
   (https://github.com/cloudflare/security-audit-skill) sobre o repositório.
2. Na mesma sessão, rotacionar a secret key e a senha do banco do Supabase (foram
   expostas no chat do Claude Code) e atualizar Vercel, `.env.local` e o secret
   `SUPABASE_DB_URL`.
3. Rotacionar a application key do Backblaze B2 usada pelo app (exposta em conversa):
   criar outra com escopo só no bucket `radioon-audio` (sem `writeBuckets`), atualizar
   `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` na Vercel e apagar a antiga.
4. Apagar os secrets do Codespaces `B2_TEMP_KEY_ID` e `B2_TEMP_APP_KEY` (guardam a
   master key do Backblaze, usada em 2026-11-08 para aplicar o CORS) e gerar nova
   master key no Backblaze (invalida a anterior).

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
- **Testes sem cota:** prévias e testes nunca usam produção. Bucket S3 (B2) e serviços
  com cota gratuita: mocks, ou prefixo isolado `test/` (bucket de produção nunca é
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
- 2026-11-08 — sessão manual: armazenamento de áudio trocado de Cloudflare R2 para
  Backblaze B2 (S3-compatível; variáveis `S3_*` na Vercel Production). Item b)
  liberado; PR #14 (marcava o b) como bloqueado por falta de R2) substituído; issue
  #15 obsoleta.
- 2026-11-08 — CORS do bucket aplicado com a master key do B2 (conferido por
  preflight). Gate corrigido no #17: o job `merge` era sempre pulado pelo `success()`
  implícito sobre o `aprovacao` pulado; o próprio #17 foi mergeado pelo gate.
- 2026-11-09 — execução autônoma: itens d) (#24) e e) (#25) concluídos e em produção
  (migration do ciclo 4 aplicada pelo `migracao.yml`). Item f) fica para a próxima
  execução (usa a skill `impeccable` de forma completa). Julio: testar uma escuta real
  logado e conferir `/pontos`.
- 2026-11-09 (2ª execução) — issues #18 e #20 fechadas a pedido do Julio; CLAUDE.md ganhou as
  regras de fechar issues resolvidas ao fim da execução e de checar status.supabase.com /
  Knowledge Base em erros do Supabase (PR #27); ciclo 5 (item f) concluído.
- 2026-11-10 — Fase UX (g2–j2) concluída: PRs #33–#36 em produção. Relatório em
  `docs/reports/2026-11-10-fase-ux.md`. Ciclo 6 segue fora da fila.
- 2026-11-10 (3ª execução) — instrução prioritária do Julio: bug do play (currentTarget nulo), Rádio
  resiliente, demo + E2E sem skip, envio no celular, login e PWA (PR #47). k–n aprovados (#45), próximos.
- 2026-11-10 (2ª execução) — fila vazia; criado `docs/PLANO.md` (roadmap), regra de autoplanejamento
  no `CLAUDE.md` (fora das travas) e proposta da próxima fase (k–o). Sem comentários do Julio nas
  issues de relatório abertas (#32, #38).
