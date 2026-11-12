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

## 2026-11-10 · Autoplanejamento

32. **Autoplanejamento:** `docs/PLANO.md` é a fonte do roadmap. Fila vazia → propor até 5 itens;
    qualidade direto, funcionalidade nova só com "aprovado" do Julio na issue do relatório.
    A regra fica no `CLAUDE.md` fora da seção de travas (que não foi alterada). Itens da fase
    proposta levam as letras k–o.

## 2026-11-10 · Redesenho mobile-first

33. **Identidade do cartão da marca:** marinho `#00112A` + âmbar `#E89A3C` substituem
    `#0f0f23`/`#ff6b35`; texto sobre âmbar é `night-900`. Logo e ícones recortados do cartão
    por `scripts/brand/recortar-logo.mjs` (alfa pela distância ao marinho). Detalhes em DESIGN.md.
34. **Referências do pedido:** o `.png` era o cartão da marca; o `.jpeg` era um print do
    Audius, não o site de 2012. Foi para `public/brand/referencia-audius.jpeg` (não
    `radioon-2012`, para não rotular errado). Inspiração de 2012 (notas e ficha técnica)
    seguiu o texto do pedido; o Julio pode enviar a captura certa.
35. **Player único no layout** (`PlayerProvider`): um `<audio>`, `preload="none"`, URL assinada
    reaproveitada, no máx. 1 nova tentativa, sem pré-busca da próxima faixa (decisão 22 mantida).
    Heartbeat de 10 s igual ao ciclo 4. Mini player e player cheio (`<dialog>`) leem o mesmo estado.
36. **Migration aditiva `20261110000000`:** `tracks` (+`cover_key`, ficha técnica),
    `playlist_tracks.note`, `track_reactions` (curtir/salvar/apoiar; só o servidor escreve),
    `programs` (blocos por hora, fuso de Brasília). Sem DROP/DELETE de dados.
37. **Capa no B2** (`covers/<artista>/<uuid>`, JPG/PNG/WebP ≤ 2 MB), servida por
    `/api/tracks/[id]/capa` (302 para URL assinada de 1 h, cache de 15 min no navegador/CDN)
    para não gastar uma assinatura/requisição por visita (cota diária). Falha da capa não
    impede publicar: a faixa sai sem capa e a arte é gerada do título.
38. **Rádio:** descobertas = ≤ 50 escutas válidas e em playlist pública; em alta = escutas dos
    últimos 7 dias + tendência vs. semana anterior; NOVO < 7 dias; "N ouvindo" = usuários
    distintos com heartbeat nos últimos 3 min (service_role só lê contagens, no servidor).
    "No ar" = rodízio de 10 min na playlist do bloco atual; sem bloco, faixa mais ouvida.
39. **Apoiar artista = gesto gratuito** (reação `support`), sem pagamento (regra 6). Pagamento
    ou token ficam para o Ciclo 6. "Faixa bônus com pontos" ficou como proposta no PLANO.md.
40. **Minha rádio substitui /metricas e /pontos** (redirect 308). Meta diária usa
    `POINTS_DAILY_LIMIT`; dia em UTC, igual ao banco.
41. **Bug "nada toca" (execução 2026-11-10, prioridade máxima).** Causa 1 (certa): `onTimeUpdate`
    lia `e.currentTarget` dentro do updater do `setState` (já `null`), derrubando a página inteira
    na primeira reprodução — nunca fora exercitado com faixas. Causa 2 (provável; sem credencial
    de banco para provar): `carregarRadio` usava embeds (`profiles(...)`) numa única consulta e
    engolia qualquer erro, devolvendo lista vazia. Agora: consultas independentes sem embeds,
    colunas completas → base → service_role (só `status = published`), erros no log do servidor.
    `/api/tracks/[id]/play` segue a mesma regra de leitura.
42. **Catálogo de demonstração** (`lib/radio/demo.ts`): 8 faixas, 2 playlists, 2 programas e
    escutas, mesclados na Rádio só quando `VERCEL_ENV !== "production"` (prévias e testes locais);
    áudio = `public/demo/tom.wav` (8 s, estático, sem B2 e sem cota). Produção nunca vê. Cookie
    `radioon_sem_demo` desliga (E2E do estado vazio). Os E2E de play/mini player/player cheio
    deixaram de ser pulados.
43. **Envio no celular:** `accept` com extensões explícitas; validação por extensão e tipo
    (`lib/storage/formatos.ts`); servidor passou a aceitar `audio/aac` e `audio/wav` (MP4 vai como
    `audio/mp4`). Capa até 15 MB no seletor, redimensionada (≤ 1200 px) e comprimida para WebP
    (≤ 1,5 MB) no aparelho; o limite do servidor segue 2 MB. Progresso por XHR.
44. **Login:** destino padrão após o link = Rádio (`/`), ou o `next`. Tela "link enviado" com
    Gmail/Outlook. "Entrar com Google" via `signInWithOAuth` (server action), exibido só com
    `NEXT_PUBLIC_GOOGLE_LOGIN=1` (evita botão quebrado antes de configurar o provedor).
45. **PWA:** `public/sw.js` (sem cache de páginas/áudio) + manifest com `share_target`
    (POST multipart em `/compartilhar`); o service worker guarda o arquivo no Cache
    `radioon-share-v1` e redireciona a `/enviar`, onde o formulário o recolhe. Sem o SW ativo,
    `/compartilhar` só avisa. Share target funciona no Android/Chrome (iOS não suporta).
46. **Curadoria de playlists (item m):** `playlist_tracks.hidden`/`featured` (booleanos anuláveis, migration
    `20261111000000`; o validador só aceita colunas anuláveis e não aceita GRANT). O usuário autenticado só tem
    UPDATE em `position` (grants do ciclo 0), então nota, ocultar, destacar e reordenar gravam com service_role
    no servidor, **depois** de confirmar pelo RLS do cliente do usuário que a playlist é do curador. Isso também
    corrige `salvarNota`, que dependia de um grant inexistente em `note`. Reordenar troca com a vizinha em 3
    UPDATEs (a unicidade de posição é conferida por instrução no PostgREST). Leituras caem para o select antigo
    se as colunas novas ainda não existirem. Ocultas saem da Rádio e da página pública; destaques aparecem no topo.
47. **Ranking de playlists por escutas (item n; substitui a decisão 26):** pontuação = escutas válidas dos
    últimos 7 dias nas faixas da playlist (`rankingPlaylistsPorEscutas`, reaproveita as escutas já lidas pela
    Rádio); empate → mais faixas, depois mais recente. Sem escutas, cai no critério antigo.

## 2026-11-11 · Acesso sem atrito (instrução do Julio)

48. **Visitante ouve sem entrar, com sessão anônima do Supabase.** `/api/listen/start` cria a sessão
    (`signInAnonymously`) só depois de confirmar que a faixa existe e está publicada; sem o recurso ligado
    no painel, responde 401 e o áudio segue sem pontos. `getSessionRole()` passou a devolver `null` para
    anônimo (enviar, curador, onboarding, publicar continuam exigindo conta); `getSessaoAny()` é usado em
    escuta, reações e Minha rádio. Sem migration: RLS/trigger do ciclo 0 já criam o perfil `listener`.
49. **Teto de pontos do anônimo:** `POINTS_ANON_DAILY_LIMIT` (padrão 50, nunca acima de `POINTS_DAILY_LIMIT`),
    passado como `p_daily_limit` ao `listen_beat` existente; limite por faixa (3x) e 30 s contínuos iguais.
50. **Vínculo ao entrar:** e-mail → `updateUser({email})` (mesmo id, pontos preservados); Google →
    `linkIdentity` (exige "manual linking"). Se o e-mail já tem conta ou o vínculo falha, cai no login normal
    (a sessão anônima é substituída; os pontos anônimos não migram: `points_ledger` é append-only).
51. **`/privacidade` e `/termos`** públicas (LGPD), rodapé global e aviso no login.
52. **Auditoria para anônimos (item s).** Anonymous Sign-Ins usam o papel `authenticated` com `is_anonymous=true`
    no JWT. Migration aditiva `20261111010000_bloqueio_anonimos.sql`: policies **RESTRICTIVE** (AND com as
    permissivas) negando INSERT/UPDATE/DELETE a anônimos em `profiles`, `tracks`, `playlists`, `playlist_tracks`
    e `programs`. Escuta, pontos e reações seguem só pelo servidor (service_role ignora RLS), sem policy de
    escrita para nenhum cliente. Restritiva em vez de editar as policies existentes: migrations existentes são
    protegidas e a restritiva vale mesmo se uma permissiva ou grant futuro abrir a escrita.
53. **Reação "apoiar" exige conta** (anônimo recebe 401 → UI pede login); curtir/salvar valem para anônimo
    (uma linha por faixa/tipo, sem abuso de volume).
54. **Testes de RLS rodam num Postgres real** via `@electric-sql/pglite` (devDependency gratuita, WASM): as
    migrations reais, com papéis/`auth.jwt()` do Supabase emulados. Prova também a escuta/teto do anônimo com
    `listen_start`/`listen_beat` reais. Teste estático trava as rotas de escrita em `getSessionRole()`.

## 2026-11-11 · Plano aprovado: Fases A, B e C

55. **Rádio no cliente:** filtros e abas por estado local (`replaceState` só guarda o ponto de partida); gesto de
    arrastar com limiar (`direcaoDoGesto`). Playlisters saiu da Rádio para o Explorar.
56. **Capa gerada em SVG** (`capa-svg.ts`, fonte única para a página e o Open Graph): par de cores HSL do hash do
    título, textura, anéis e glifo; o rótulo do vinil reaproveita `Capa`. Foge da paleta marinho/âmbar de propósito,
    para as faixas serem distintas (pedido do Julio).
57. **Rádio radioOn:** fluxo = novidades + menos ouvidas + mais curtidas (curtidas globais), intercalado e sem repetir;
    `tocar(..., continuo)` volta ao início no fim da fila. Programa do horário continua tendo precedência no No ar.
58. **Open Graph:** `/api/tracks/[id]/og` (1200x630, `next/og`) em vez de `opengraph-image`, para ter URL fixa e
    reaproveitar no compartilhar nativo com arquivo (`navigator.canShare`).
59. **Gênero/clima:** colunas opcionais; clima com CHECK no banco, gênero com lista fixa validada no app.
60. **Playlist para qualquer conta:** policy permissiva nova; a restritiva de anônimos (decisão 52) continua valendo.
    Programação por horário segue só para o papel curator.
61. **Álbum/EP:** tabela `albums` (escrita só pelo servidor), `tracks.album_id/track_no`; uma capa para todas as faixas
    (mesmo `cover_key`); cada faixa é publicada separadamente (visível ao publicar).
62. **Stories:** `stories` e `story_reports` com RLS; escrita só no servidor (papel artist/curator ou
    `PLATFORM_STORY_IDS`). Trecho de 15 s usa `<audio>` próprio (não gera escuta/pontos). Sem DELETE: o story "expira"
    por data (7 dias na home, depois só no perfil). Ocultação automática com 3 denunciantes distintos, feita no app
    (SECURITY DEFINER não passa na allowlist de migrations).

## 2026-11-12 · Redesenho da Home (instrução do Julio)

63. **Perfil oficial radioOn é virtual:** não há usuário no Auth, e migration não pode criar um (allowlist). Ids fixos em
    `lib/radio/home.ts` (`PLATAFORMA_ID`, `STORY_BOAS_VINDAS_ID`); sem escrita no banco. O story de boas-vindas é
    injetado em `carregarStories` com data de agora (nunca vira arquivo), sem botão Denunciar. Nenhuma migration nova.
64. **Seleção radioOn é calculada, não gravada:** ids `radioon-novidades|genero-<id>|clima-<id>`, recalculados a cada
    leitura (atualizam sozinhas). Gênero exige ≥3 faixas; clima ≥1; Novidades da semana cai nas 10 mais recentes se a
    semana estiver vazia. Página `/playlist/radioon-…`; o dono aponta para `/perfil/<PLATAFORMA_ID>`.
65. **Clima do horário (Brasília):** Madrugada 0–5h; Pista sex/sáb 21h+; Domingo aos domingos; Foco 6–11h; Estrada
    17–20h; Chuva nos demais horários. Prioridade nesta ordem. Sem faixas do clima → Chuva → recentes.
66. **"N ouvindo" inclui o próprio ouvinte** (`totalOuvindo`): ouvintes ativos sem contar a sessão atual + 1; nunca "No ar" só.
67. **Home sem busca nem chips de filtro** (são do Explorar). "Álbuns e EPs" ficou no fim da Home para não perder o acesso
    (não está na ordem pedida; fácil de remover). A Home tem cabeçalho próprio (`role="banner"`); o global some em `/`.
