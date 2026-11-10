# Decisões técnicas — radioOn

Formato: data · decisão · motivo. Mais recente no fim.

## 2026-11-05 · Ciclo 0

1. **Protótipo arquivado em `legacy-vite`.** A main recomeça do zero com
   Next.js; contratos Solidity ficam em `legacy/contracts/` só como referência
   (tokens/NFTs estão fora do MVP).
2. **Next.js 16 (App Router) com Turbopack, pnpm via corepack, Node 24.**
   Versões atuais estáveis; Node 24 é o padrão LTS na Vercel.
3. **Chaves Supabase novas e legadas.** `lib/supabase/env.ts` aceita
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (publishable tem prioridade), e `SUPABASE_SECRET_KEY` ou
   `SUPABASE_SERVICE_ROLE_KEY` no cliente admin. O cliente admin e o server
   importam `server-only` para impedir vazamento ao bundle do browser.
4. **Três clientes Supabase:** `client.ts` (browser, chave pública),
   `server.ts` (RSC/Actions, sessão via cookies, respeita RLS) e `admin.ts`
   (service role, ignora RLS — apenas para pontos, escutas e moderação).
   Proxy de renovação de sessão será adicionado quando houver login.
5. **Escrita restrita ao servidor por desenho de RLS + GRANTs.**
   - `tracks`, `listen_events`, `points_ledger`: sem policies de escrita para
     `anon`/`authenticated`; somente service_role escreve.
   - `profiles`: usuário só pode alterar `display_name` (GRANT por coluna);
     `role` só muda no servidor. Profile criado por trigger em `auth.users`
     sempre como `listener`.
   - `playlists`/`playlist_tracks`: curador gerencia as próprias via RLS;
     só faixas `published` podem ser adicionadas; update só de `position`.
6. **`points_ledger` append-only em três camadas:** sem GRANT de
   update/delete (nem para service_role), triggers que abortam UPDATE/DELETE/
   TRUNCATE, e índice único `(user_id, reason, ref_id)` para idempotência.
7. **Faixa só pode ser `published` com `rights_confirmed = true`** (CHECK).
8. **Testes com `node --test`** (type stripping nativo do Node 24) para não
   adicionar dependências enquanto a suíte é pequena.
9. **`vercel.json` com `regions: ["pdx1"]`** (mais próximo de Supabase
   us-west-2). Mantido JSON em vez de `vercel.ts` para não adicionar
   dependência só por uma chave.
10. **Limite diário de pontos “configurável”** ainda não modelado; será
    definido no ciclo de listen-to-earn (provavelmente variável de ambiente
    lida no servidor).

## 2026-11-05 · Etapa D (conexão e publicação)

11. **Migration aplicada sem `supabase link`.** O Supabase CLI estava sem
    login (access token) no Codespace; o `db push` foi feito com
    `--remote=<db-url>` pelo pooler de sessão
    `aws-1-us-west-2.pooler.supabase.com:5432`, usando a senha do banco
    do `.env.local`. Para rodar `supabase link`, fazer `npx supabase login`.
12. **Projeto Vercel `radioon`** (escopo `juliobalsinis-projects`, Hobby),
    conectado a `juliobalsini/music-web3-platform`; deploy de produção a
    cada push na `main`. `SUPABASE_SERVICE_ROLE_KEY` cadastrada como
    variável sensível; chave publishable cadastrada como
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o código aceita os dois formatos).
    `vercel.json` declara `"framework": "nextjs"`: o projeto criado pelo CLI
    veio com preset "Other" e o primeiro deploy falhou procurando `public/`.

## 2026-11-05 · Modo autonomia total

13. **Agente agendado no GitHub Actions** (`autonomo.yml`, 08:00 e 20:00 BRT =
    `0 11,23 * * *` UTC). Claude Code headless com `--dangerously-skip-permissions`
    num runner efêmero; credenciais mínimas e nenhuma de escrita no banco.
14. **PAT do agente = fine-grained do Julio** (não conta-máquina): commits
    autorados pela conta do Julio porque o plano Hobby da Vercel só faz deploy de
    commits de membros. Sem permissão *Workflows* (não altera `.github/`, logo
    não cria workflow para ler secrets) nem *Administration* (não mexe em
    rulesets/secrets/ambientes).
15. **Aprovação das travas por ambiente com revisor** (`travas`), não por review
    de PR: o PR é do mesmo usuário do Julio, então review não distinguiria
    agente de humano; aprovar ambiente exige o login do Julio (o PAT não tem
    *Deployments*). O job verifica que o ambiente tem revisor; se não tiver, falha.
16. **Ruleset na `main`:** exige PR e o check `gate-ok`, sem bypass. Push direto
    do agente na `main` é impossível; o gate mergeia com `GITHUB_TOKEN`.
17. **Scripts de trava rodam da main** (checkout do `base.sha`), nunca do PR.
    Merge por `GITHUB_TOKEN` não dispara `push`, então o gate aciona
    `migracao.yml` por `workflow_dispatch`.
18. **Allowlist de SQL** (`scripts/ci/validar-sql.mjs`) mais estrita que a lista
    pedida em dois pontos, por coerência com as regras invioláveis: tabela nova
    exige `ENABLE ROW LEVEL SECURITY` no mesmo arquivo, e `SECURITY DEFINER` é
    recusado (sem `REVOKE` permitido, a função ficaria exposta via RPC).
    `GRANT`/`REVOKE` vão para revisão humana.
19. **`SUPABASE_DB_URL` como secret de ambiente** (`producao-db`, só branch main),
    não de repositório: nenhum outro workflow nem branch acessa. `migracao.yml`
    não roda `pnpm install` (nenhum código do app executa com a credencial).
20. **`.claude/settings.json` versionado** com hook de Notification → notify.sh,
    ignorado quando `GITHUB_ACTIONS` está definido.
21. **Skill `impeccable` vendorizada** em `.claude/skills/impeccable` (commit
    `687bc38` da `pbakaus/impeccable`, sem alterações) e obrigatória em tarefas de UI.
    SKILL.md revisado: nenhuma instrução acessa secrets ou tokens; o único acesso a
    rede é o launcher `scripts/impeccable`, que baixa um binário do GitHub Releases.
    Ele fica negado em `.claude/settings.json` e a skill roda pelo caminho sem launcher
    (perde `live`/`hooks`/`pin`/`doctor`). Reversível: remover a regra de deny.

## 2026-11-08 · Áudio no Backblaze B2 (substitui o Cloudflare R2)

22. **Backblaze B2 no lugar do R2.** O R2 exige cartão cadastrado mesmo no plano
    gratuito, o que contraria a regra 6 (nenhum serviço que exija plano pago) e expõe
    a conta a cobrança. A conta B2 (e-mail do Julio) não tem cartão e tem os caps de
    gasto em US$ 0: ao estourar a cota, o B2 bloqueia em vez de cobrar. Acesso pela
    API S3-compatível com `@aws-sdk/client-s3`, então o código não fica preso ao
    provedor. Variáveis genéricas `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
    `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` (Vercel, só Production; só servidor).
    A coluna `tracks.r2_key` mantém o nome (renomear seria migration destrutiva) e
    passa a significar "chave do objeto no bucket".
23. **Limites diários da conta gratuita** (zeram à meia-noite UTC):
    - 10 GB de armazenamento total;
    - 1 GB/dia de download (≈ 200 reproduções completas de uma faixa de 5 MB);
    - 2.500 transações Class B/dia (download: `GetObject`, `HeadObject` — **cada
      requisição com Range conta uma**);
    - 2.500 transações Class C/dia (listagens e operações de bucket, ex. `ListObjects`);
    - Class A (upload, `PutObject`, delete) é gratuita.
    Ao atingir qualquer limite diário, o bucket recusa as requisições e **o streaming
    para até o dia seguinte**. É o custo aceito de não ter cartão; reavaliar quando
    houver público (B2 pago, ou CDN com cache na frente do bucket).
24. **Player econômico em requisições:** `preload="none"`, nada de pré-carregar a
    próxima faixa, um único `<audio>` reaproveitado, uma URL assinada por faixa
    reusada até perto de expirar (pausa, retomada e seek não pedem URL nova), nenhum
    HEAD/LIST no bucket (metadados vêm do banco) e no máximo 1 nova tentativa em erro
    do bucket, com aviso de "limite diário atingido". Upload limitado a 25 MB por
    arquivo, assinado com `ContentLength`, para preservar os 10 GB.
25. **CORS do bucket** só para `https://radioon-ten.vercel.app` e
    `http://localhost:3000`, operações `s3_put`, `s3_get`, `s3_head`, preflight em
    cache por 1 dia. Aplicado por `scripts/b2-cors.mjs` (API nativa do B2, sem
    dependência), que exige uma chave com `writeBuckets`; a chave do app não deve ter
    essa capability. Prévias da Vercel ficam fora do CORS de propósito (não usam o
    bucket de produção).

## 2026-11-09 · Playlists

26. **Ranking de playlists** = nº de faixas (desempate: mais recente), só públicas e
    não vazias, top 12 na home. Métrica simples e reversível; trocar por escutas
    quando o ciclo 4 existir. Escritas do curador usam o cliente do usuário (RLS),
    nunca service_role. UI seguiu os tokens existentes sem rodar a skill `impeccable`
    por inteiro (telas utilitárias); polimento fica para o ciclo 5.
27. **Heartbeats** a cada 10 s; o servidor mede o tempo (intervalo <5 s ignorado, >20 s
    zera a continuidade). Validação em plpgsql (`listen_beat`) sob lock por usuário.
    Funções sem SECURITY DEFINER (allowlist) e com checagem do papel do JWT
    (`service_role`); anon/authenticated também não têm privilégio nas tabelas.
    Pausar encerra o evento. Limites: 3 válidas/faixa/dia, teto diário de pontos
    (UTC), artista não pontua na própria faixa. Config via env, sem tabela nova.

## 2026-11-09 · Home e métricas

28. **Home "play primeiro":** o botão grande é o `Player` real da faixa publicada mais recente
    (sem faixas, play inativo + "Nenhuma faixa ainda"). Sem pré-carga (decisão 24 mantida).
29. **Métricas básicas** só para o artista, em `/metricas`: escutas válidas e ouvintes únicos
    por faixa, agregados no servidor (service_role restrito às faixas da sessão). Sem tabela
    nova nem métricas públicas; reversível.

## 2026-11-10 · Fase UX

30. **Numeração da fase:** o pedido chamava os itens de g–j, mas g)/f) já existem no CONTEXTO.md;
    a fase usa g2–j2. PRODUCT.md e DESIGN.md foram escritos sem entrevista (execução
    autônoma, ninguém para responder); o que é inferência está rotulado no arquivo. Texto
    sobre laranja passa a ser `night-900` (branco sobre #ff6b35 dá ~2,8:1, abaixo de AA).
31. **Destino pós-login em cookie**, não em query do `emailRedirectTo`: evita depender da
    allowlist de Redirect URLs do Supabase (pendência do Julio) e mantém `safeNext` contra
    open redirect. Reversível; sem migration.
