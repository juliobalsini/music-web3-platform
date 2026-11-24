# Decisões técnicas — radioOn (texto completo; índice em docs/DECISIONS.md)

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
67. **(revisada em 2026-11-12, 2ª instrução do Julio)** A Home segue sem busca (é do Explorar), mas **volta com os filtros**
    Tudo · Faixas · Álbuns · Playlists · Stories, cada um uma visão própria (não um recorte da Home): troca instantânea
    (visões abertas ficam montadas, só escondidas) e rolagem própria por filtro; chips fixos no topo. "Álbuns e EPs" saiu do
    fim da Home e vive no filtro Álbuns. A Home tem cabeçalho próprio (`role="banner"`); o global some em `/`.
68. **Continue ouvindo no aparelho (localStorage):** guarda faixa, posição exata e visitas a playlists, álbuns e perfis;
    o servidor só completa com faixas ouvidas pela conta (sem posição). Grade 2×3 de até 6 itens, oculta com menos de 2.
    Não toca em pontos nem validação de escuta. Trade-off: não sincroniza entre aparelhos. Filtro Playlists: Seleção radioOn
    primeiro, depois as dos playlisters (capa da 1ª faixa); "Criar playlist" leva a `/curador` (o proxy pede login).

## 2026-11-12 · Entrega de áudio econômica (instrução do Julio; issue #78)

69. **Vestígio de Cloudflare/R2:** só documental (decisão 22: o R2 saiu por exigir cartão, regra 6). Nenhum `wrangler.toml`,
    dependência, variável ou código de R2 existia; `tracks.r2_key` mantém o nome só por compatibilidade. Nada a remover.
    Workers + KV no plano gratuito não pedem cartão e o Worker **não é armazenamento**: o B2 segue sendo o único.
70. **AAC 192 kbps só para origens sem perda ou lossy ≥ 256 kbps** (taxa original até 48 kHz, sem filtro). Lossy < 256 kbps
    não é recodificada (remux para .m4a só se já for AAC); codec ou bitrate desconhecido mantém o original. Original nunca é
    apagado. Regra em `lib/audio/transcode.ts` (testada); execução em `scripts/transcodificar.mjs`.
71. **Loudness aplicada no player, nunca no arquivo.** O ffmpeg só mede (ebur128 → `loudness_lufs`). O player leva a faixa a
    −14 LUFS com ganho máx. +6 dB e um limitador (compressor) contra clipping; Ajustes › "Normalizar volume" (ligado por
    padrão, por aparelho). Web Audio só quando a origem é o proxy (responde CORS); em URL assinada do B2 (sem CORS de leitura)
    o `crossOrigin` derrubaria a faixa, então ali só há atenuação via `volume`.
72. **Migration aditiva sem UPDATE:** a allowlist não aceita backfill. `transcode_status` nulo = pendente (o transcodificador
    consulta NULL ou `pending`), o que marca todas as faixas existentes sem escrita em massa. Lotes: `LOTE_MAX` (15) e
    `LOTE_MAX_MB` (250) por execução de 30 min, cada download de original = 1 Classe B.
73. **Proxy `workers.dev` com cache em KV** (`workers/audio-proxy`): 1 GET completo ao B2 no primeiro acesso, KV com TTL 7 dias
    (≤ 25 MB, total < 900 MB), Range fatiado do KV (206), prefixos fixos, CORS só produção e prévias. Chave B2 **somente
    leitura** dedicada ao Worker. A partir de 80% das escritas ou leituras diárias do KV serve direto do B2. Leituras são
    estimadas por amostragem (contar cada uma gastaria a cota de escritas); exatas só no painel da Cloudflare (Fase C).
74. **`NEXT_PUBLIC_AUDIO_BASE_URL`:** com ela, `signPlayback`/`signCover` devolvem `<base>/a/<chave>` (sem assinatura); sem ela,
    URL assinada do B2 como hoje. O app nunca lista o bucket.
75. **Workflows** (substituída pela 78: saíram de `docs/propostas/` para `.github/workflows/` no PR #81; o PAT do agente não tem *Workflows* e `.github/**` é
    protegido). O transcodificador precisa de uma chave B2 de **escrita restrita a `audio/stream/`**, inexistente entre os
    secrets; o agente não cria credenciais nem toca nas de escrita existentes.
76. **Licença proprietária (2026-11-12, aprovada pelo Julio):** o `LICENSE` MIT (2025) foi substituído por
    "Copyright (c) 2026 Julio Balsini. All rights reserved." — código público só para consulta; uso, cópia, modificação
    ou distribuição exigem autorização escrita. `package.json` ganhou `"license": "UNLICENSED"` (valor npm para "sem
    licença de uso") e o README tem seção "License". Motivo: o repositório é vitrine de um produto, não projeto aberto.
    Exceção deliberada: `.claude/skills/impeccable/` (LICENSE Apache-2.0 e NOTICE com a licença MIT original) é código
    de terceiros, protegido, e mantém as licenças de origem.
77. **Vitrine:** README em inglês com resumo em pt-BR; `metadataBase` usa a URL de produção fixa
    `https://radioon-ten.vercel.app` na Vercel (antes dependia de `VERCEL_PROJECT_PRODUCTION_URL`). Não havia referência
    literal a `music-web3-platform.vercel.app` no repositório.
78. **Causa real do bloqueio em `.github/**` (2026-11-12):** o `actions/checkout` do `autonomo.yml` usa `token: AGENT_GH_TOKEN`
    (PAT), então o git empurra com o PAT, não com o GITHUB_TOKEN. O PAT antigo não tinha *Workflows*; o atual tem: um push de
    teste em `.github/workflows/` foi aceito (branch descartada). O ruleset `main-protecao` só protege a `main` (PR + gate-ok),
    não bloqueia branches. Logo, PRs em `.github/**` funcionam e esperam só a trava `travas`. O PAT **não** lê alertas de
    Dependabot, CodeQL nem secret scanning (403): falta *Dependabot alerts / Code scanning alerts / Secret scanning alerts: Read*.
79. **Autonomia de planejamento e segurança** (regras no CLAUDE.md): aprovação por "aprovado <itens>"; sem aprovação só
    segurança baixa, dependências verdes, testes instáveis e docs. Dependabot patch/minor com gate verde pode ser
    mergeado, major vira proposta. Não criamos `codeql.yml`. Dependabot PRs não recebem os secrets de Actions (E2E da prévia
    precisa de `VERCEL_AUTOMATION_BYPASS_SECRET`): o Julio deve copiá-lo para *Dependabot secrets* ou o agente valida e
    mergeia manualmente após rodar o gate localmente (decisão do relatório).
80. **Auditoria de segurança:** `scripts/auditoria-seguranca.mjs` (estática, sem rede, sem imprimir valores). Roda na 1ª execução
    da semana (sem workflow novo). Headers: HSTS, nosniff, Referrer-Policy, Permissions-Policy e CSP mínima
    (`frame-ancestors/base-uri/object-src`); `form-action` ficou de fora porque o Chrome o aplica nos redirecionamentos do
    login (Google). CSP completa com nonces fica como proposta. Worker de áudio ganhou `nosniff`.
81. **Teste visual mobile:** projetos Playwright `iphone` (viewport/UA iPhone 14, Chromium) e `android` (Pixel 7) só para
    `e2e/mobile-visual.spec.ts`; screenshots anexados ao relatório HTML do Playwright (artefato do gate). O iPhone não é WebKit
    real (o gate instala só Chromium).
82. **URL do Worker como padrão no código (2026-11-12):** `https://radioon-audio.radioon.workers.dev` (pública, registrada pelo
    `worker-deploy`) é o padrão em `lib/audio/base-url.ts`; `NEXT_PUBLIC_AUDIO_BASE_URL` sobrescreve e o valor `off` volta às URLs
    assinadas do B2. Nada a configurar na Vercel. Reversível: trocar o padrão ou definir `off`.
83. **Rollback do proxy por padrão (2026-11-12):** minutos após a decisão 82, o Worker respondia 503 (`B2_ENDPOINT` vazio no
    `worker-deploy`), o que quebraria a reprodução em produção. `PROXY_LIGADO_POR_PADRAO = false` em `lib/audio/base-url.ts`
    devolve o app às URLs assinadas do B2; a URL padrão fica no código. Religar (true) só após o Worker responder 200/206.
84. **Proxy restrito e transcodificar sem secret novo (2026-11-12, issue #101):** o proxy só serve `audio/stream/`, `covers/` e
    `stories/` (`urlDoProxy` e `ALLOWED_PREFIXES`); originais em `tracks/` só por URL assinada. `transcodificar.mjs` usa
    `SUPABASE_DB_URL` (conexão do `migracao`, via `pg`, só `UPDATE` em colunas de transcode de `tracks`) em vez de
    `SUPABASE_SECRET_KEY`. Regra permanente no CLAUDE.md: endurecimento próprio sem ampliar acesso é risco baixo; antes de pedir
    secret, checar se um existente resolve. Reversível por PR.
85. **Verificação de segurança dos workflows no gate (2026-11-12, issue #102):** `scripts/ci/verificar-workflows.mjs` (sem
    dependências; regex/linhas) roda no job `workflows` do gate, com o script da main e os workflows do PR. Regras R1 (autor
    `juliobalsini` no `if` de job em `issues`/`issue_comment`), R2 (nada de título/corpo/comentário/head_ref em `run:`/`script:`),
    R3 (sem `pull_request_target`, `write-all` ou `cancel-in-progress` em fluxo que espera aprovação). Exceção deliberada em R3:
    workflow só de `pull_request` (o próprio `gate.yml`), pois novo commit invalida a aprovação anterior. `aprovacao`,
    `avisar-travas`, `gate-ok` e `merge` dependem do job: a trava só é pedida depois que ele passa. Bootstrap: se a main ainda não
    tem o script, o job usa o do PR (aviso); some após o merge. Falha por dúvida de parsing é preferível a passar em falso.
86. **worker-deploy deriva o endpoint do B2** (`scripts/ci/derivar-env.sh`, valores públicos) antes de gravar os secrets do Worker e passa a
    falhar se algum vier vazio (antes gravava vazio em silêncio e o Worker respondia 503). Arquivo protegido (`.github/**`): PR próprio, trava.
87. **Stories v2 (issue #113, 2026-11-13):** visualizador em tela cheia único (`components/visualizador-stories.tsx`, `<dialog>` modal que cobre
    cabeçalho, player e navegação) usado por círculos da home, grade Rádio > Stories, linha do Explorar e `/story/[id]`. Regras puras em
    `lib/stories/viewer.ts` (duração 5 s texto / trecho ≤ 15 s com música, gestos, ordem radioOn → não vistos → vistos, "há N h"). "Visto" fica em
    `localStorage` (anel cinza) e, no servidor, em `story_views` por usuário ou sessão anônima (sessão anônima criada sob demanda, como na escuta).
    Setas visíveis removidas; controles "Story anterior/Próximo story" ficam só para teclado e leitor de tela (`sr-only`) e setas ←/→.
    "Apagar" do dono é `deleted_at` (sem DELETE; policy restritiva esconde de todos). Duas migrations aditivas (`20261113000000`, `20261113010000`),
    ambas dentro da allowlist (`validar-sql.mjs`). Os dois commits (fase 1 e fase 2) seguem no mesmo PR porque a barra inferior da fase 1 já tem os
    controles de curtir/comentar.
88. **Interação nos stories (fase 2):** curtir = 1 por usuário ou sessão anônima (PK + RLS "só como si mesmo"); comentar = só contas, ≤ 140
    caracteres, reações (🔥 😍 👏 🎶 🎧 😮) e figurinhas próprias (No repeat, Que solo, Hino, Arrepiou) validadas no servidor, sem GIFs nem serviços
    externos. Moderação: filtro básico de palavras ofensivas (`lib/stories/moderacao.ts`), limite de 5 comentários/min por **trigger** (a policy não
    pode ler a própria tabela: recursão), denúncia de comentário só de contas e 3 denunciantes distintos ocultam (`hidden`, reversão só pelo Julio),
    dono apaga comentários do próprio story (`deleted_at`). Visualizações/curtidas/comentários aparecem ao dono no menu ⋯ (`/estatisticas`, via RLS).
    Mensagem direta e story com foto/vídeo ficam como pós-beta no PLANO.md (não implementados).

## 89. Navegação e conta v2 — fatia 1 (issue #116)
Topo só com logo (+30%) e ☰; "Entrar", selo "No ar" e rodapé saíram (links legais na gaveta; login mantém só o aceite).
Gaveta lateral (visitante: Crie sua conta, Google primeiro; logado: perfil, pontos, Meus envios, Enviar, Configurações, Privacidade, Termos, Sair).
Barra inferior: Rádio, Explorar, Biblioteca (`/biblioteca`); `/meus-envios` lista faixas, álbuns, playlists e stories (somente leitura nesta fatia).
"Player On" substitui "Rádio radioOn"; "Ao vivo · N ouvindo" só com N ≥ 10. Marca no feminino ("na radioOn"). Logo: client-side com prefetch; na Home rola ao topo.
Fatias seguintes (migrations aditivas): seguir, exclusão lógica, configurações/conta, login contextual, compartilhar com Simple Icons, RLS.

90. **Ícones de compartilhar (issue #116, item 9):** caminhos SVG do Simple Icons (CC0) copiados para `lib/stories/icones-redes.ts`, sem nova dependência. LinkedIn vem da v13 (removido das versões novas por marca). Painel de stories trocou as siglas pelos ícones.

91. **Playlists v2, fatia 1 (issue #122):** rascunho = `is_public=false` + `published_at` nulo (a RLS existente já o esconde de quem não é dono); migration aditiva `20261113020000`
    (`description`, `published_at`, `cover_path`, `create_key` + índice único por conta, tabela `playlist_saves` com RLS própria e bloqueio de anônimo). Criação idempotente: a
    chave nasce com a tela e o índice único barra toque repetido. Publicar exige ≥ 5 faixas (validado no servidor). Contagem de salvamentos lida só no servidor (número, nunca quem salvou).
    `/curador` virou só "Programação" (curadores); lista/criação de playlists saiu e as do usuário ficam na Biblioteca (rascunhos marcados). Barra inferior: Rádio, Explorar, Biblioteca, Criar
    (painel: Playlist, Story, Enviar música). Painel de compartilhar virou genérico (`PainelCompartilharAlvo`), usado também por playlists (cartão 9:16 em `/api/playlists/[id]/cartao`).
    Não apagamos dados existentes (as 3 "Jazz independente" seguem; o dono remove pelo menu ⋯).
92. **Base visual e envios (issue #124):** (a) ícones `any`/`maskable` separados, ambos dentro do círculo de 80% (o script de ícones falha se sair) e abertura interna com o mesmo marinho e proporção do ícone;
    (b) envio idempotente: `tracks.upload_key` (índice único por artista) + trava síncrona no formulário; causa dos duplicados e travados = linha `processing` criada antes do PUT, e cada nova tentativa/toque criava outra;
    (c) estado terminal `failed` + `failure_reason` (migration aditiva `20261113030000`); `/meus-envios` reconcilia as `processing` com > 15 min (1 HEAD por faixa, máx. 10): arquivo no bucket → publica, ausente → `failed` com motivo.
    Nada é apagado; o usuário remove duplicatas pelo menu. Álbum/EP segue sem chave (só a trava de toque repetido). (d) Design system em `components/ds/` com tokens `--ds-*` (tema claro e destaque prontos para Configurações).

93. **Proxy de áudio religado (issue #101, 2026-11-14):** após o #110, o `worker-deploy` (run 43617896549) publicou o Worker com as chaves
    B2 de leitura. Validação em `https://radioon-audio.radioon.workers.dev/a/audio/stream/<id>.m4a`: 200 (`audio/mp4`, 4.174.638 bytes),
    206 em `bytes=0-1023` e no fim do arquivo, MISS → HIT no KV, CORS para produção e prévias, `tracks/` e chave inexistente → 404.
    `PROXY_LIGADO_POR_PADRAO = true` (só `audio/stream/`, `covers/`, `stories/`; originais seguem por URL assinada). Medição: KV HIT com
    `Server-Timing kv;dur` 10–21 ms (tempo de parede, inclui a espera do KV, que não conta como CPU no plano gratuito; CPU real só no painel
    da Cloudflare, sem token local), total 57–104 ms do runner. Transcodificação: 2 faixas ok (aac192, −19,3 LUFS, 6,8 → 4,2 MB, −39%);
    3 faixas falham com "Key not found" (original ausente no bucket, 3/3 tentativas, não voltam a ser tentadas). Reversão: `false` aqui ou
    `NEXT_PUBLIC_AUDIO_BASE_URL=off`.
94. **Modelo operacional v2 (issue #103, 2026-11-14):** (a) R4 em `verificar-workflows.mjs`: o gate reprova qualquer alteração
    do bloco TRAVAS do CLAUDE.md (linha a linha, ignorando linhas vazias e espaços finais); só o Julio o edita, direto na `main`.
    O bloco foi reduzido às travas; as regras operacionais (aprovação, segurança contínua, fila, caixa de entrada, modelo v2)
    saíram dele. (b) Escopo da trava (`scripts/ci/travas.mjs`): bloco TRAVAS, `gate.yml`, `autonomo.yml` e, além do pedido,
    `migracao.yml` (aplica SQL na produção: mudar um passo dele contornaria a allowlist), `scripts/ci/**` (lógica do próprio
    gate) e `.claude/settings*.json` (hooks rodam comandos no Codespace) — na dúvida, a opção mais segura. Nos demais
    workflows só travam mudanças de permissions/secrets/environment/tokens, workflow sem `permissions:` no topo, e workflow
    novo/removido que use secrets (novo com `permissions` só de leitura passa). `notify.sh`, `dependabot.yml`,
    `supabase/config.toml` e skills deixam de ser protegidos. (c) Encadeamento: o agente cria `$RUNNER_TEMP/encadear`; o
    `autonomo.yml` dispara `workflow_dispatch` com `encadeada=true` (cuja guarda espera até 10 min a anterior terminar), até o
    teto do CLAUDE.md (6/dia, contando toda execução manual/encadeada do dia em Brasília). (d) Canal único: `notify.sh resumo`
    comenta na issue `sprint` aberta como github-actions[bot] (gera e-mail ao Julio, autor da issue); sem Sprint, abre issue de
    relatório. (e) Label `feedback` dispara o agente (mesma checagem de autor). (f) Issue "Sessão manual" única (label
    `sessao-manual`).
    (g) Autocorreção do Dependabot: o gate decide o caminho do E2E pelo autor do PR (`pull_request.user.login`), não por
    `github.actor` — atualizar o branch pela conta do Julio levava o PR do Dependabot à prévia da Vercel (branch longo demais).
95. **Seguir perfis (issue #116, item 4 e parte do 11, 2026-11-14):** tabela `follows` (migration aditiva `20261114000000`), chave
    (seguidor, seguido), sem seguir a si mesmo. RLS: só conta segue (restritiva barra a sessão anônima), como si mesma; cada um
    vê quem segue e quem o segue (terceiros e visitantes não veem; contagem pública, se vier, pelo servidor); deixar de seguir só
    o próprio; sem update. Botão Seguir/Seguindo no perfil (exceto o próprio e o oficial; resposta imediata com `useFormStatus`);
    visitante é levado ao login e volta ao perfil (base do login contextual, item 5). `/seguindo` na gaveta, com `CartaoCapa`,
    `EstadoVazio` e `Esqueleto`. Testes de RLS no PGlite e E2E do visitante.
96. **Logo rápida (issue #116, item 2, 2026-11-14):** diagnóstico: a logo já navegava no cliente com prefetch e rolava ao topo na
    Home; a espera vinha dos dados, porque cada visita à Home (e a cada outra tela que usa `carregarRadio`) refazia ~8 consultas ao
    Supabase, incluindo até 20 mil escutas, e o carregamento mostrava só um círculo. Correções: (a) `catalogoPublico()` com
    `"use cache"` (60 s, `stale` 30 s, `expire` 10 min, tag `catalogo`), lido com cliente sem cookies (papel anônimo; as tabelas já
    têm leitura pública) e service_role só para contagens; dados por usuário (quem sou eu, demo, histórico) ficam fora do cache;
    (b) `catalogoMudou()` (`revalidateTag(..., { expire: 0 })`) ao publicar faixa, criar álbum, editar playlist/programa e escolher perfil,
    então quem publica vê na hora (reconciliação de envios roda na renderização e não invalida; espera até 60 s);
    (c) `experimental.staleTimes.dynamic = 30`: voltar à Home em até 30 s reaproveita a página no cliente; (d) `EsqueletoRadio`
    com a silhueta da Home no lugar do círculo. Medição: produção antes (runner do GitHub, EUA) TTFB ~100 ms e total 320–400 ms
    quente, 2,8 s frio; depois: ver o relatório do dia. "Ao vivo · N ouvindo" passa a ter até 60 s de atraso (aceitável).
97. **Login contextual (issue #116, item 5, 2026-11-14):** `LoginContextualProvider` (montado no layout) abre um `PainelInferior`
    "Entre para continuar" com o `LoginForm` (Google primeiro) e o aceite legal, em vez de trocar de tela. O destino pós-login vai no
    mesmo cookie httpOnly de antes (`next` validado por `safeNext`), então a pessoa volta ao ponto de origem (tela atual, perfil ou
    story; para Criar playlist/Story/Enviar música, direto à tela pedida). Abre sozinho em: curtir/salvar/apoiar no player (401),
    comentar e denunciar story (401), Seguir no perfil, Criar → Playlist/Story/Enviar música, "Criar playlist" e "Enviar primeira
    faixa". O cliente sabe se há conta lendo a sessão do cookie local (`getSession`, sem ida à rede; sessão anônima conta como
    visitante); isso só decide **abrir o painel** — o acesso continua decidido no servidor (as páginas e ações seguem redirecionando
    ao `/login` como reserva, por exemplo antes da hidratação). A tela `/login` continua existindo para links diretos e erros.
98. **Meus envios: editar, apagar lógico e desfazer por 30 dias (issue #116, item 7 e parte do 11, 2026-11-15):** migration aditiva
    `20261115000000` com `deleted_at` em `tracks`, `albums` e `playlists` (stories já tinham) e policies **restritivas** de leitura
    `deleted_at is null` para `anon` e `authenticated`: o item some na hora de todas as listagens e das playlists alheias (o join com a
    faixa apagada volta vazio e a tela já o descarta), inclusive para o dono nas leituras comuns. Escrita (apagar, desfazer, renomear)
    só no servidor (`lib/envios/apagar.ts`, service_role), com o dono vindo da sessão (`getSessionRole`, anônimo recusado) e sempre no
    filtro da escrita; nenhum cliente marca ou limpa `deleted_at` (testado no PGlite, inclusive sessão anônima). Leituras com service_role
    de faixa publicada (play, escuta, reação, story, catálogo de reserva) repetem o filtro. Álbum apagado leva as faixas dele com a mesma
    data, e o desfazer devolve exatamente essas. Desfazer só dentro de 30 dias (o servidor confere o prazo); a lista "Apagados" em Meus
    envios vem do servidor. Apagar playlist deixou de ser `DELETE` (agora lógico). Editar: faixa/álbum por título (painel inferior),
    playlist pelo editor existente; story não tem edição (some em 7 dias). Remoção física de linhas e arquivos no B2 após 30 dias é
    **pós-beta** (PLANO.md): exige aprovação do Julio e a trava de escrita destrutiva.
99. **Configurações, fatia 1 (issue #125 item 5 e #116 itens 8 e 11, 2026-11-15):** a #125 declara que substitui o item 8 da #116; esta
    fatia entrega a parte do 8 e começa o 5 da #125, e a #116 fecha. (a) Preferências `normalizar`, `continua`, `somStories`, `economia`,
    `perfilPublico`, `mostrarOuvindo` em `lib/preferencias/` (regras puras com saneamento: só chaves conhecidas e booleanas). Aparelho:
    `localStorage` `radioon:prefs` (a chave antiga `radioon:normalizar` é lida como reserva). Conta: tabela nova `user_settings`
    (migration aditiva `20261115010000`), RLS só de leitura própria, **nenhuma escrita pelo cliente** (o servidor grava com service_role, dono
    vindo de `getSessionRole`; sessão anônima fica só no aparelho). A gaveta (montada em todas as telas) aplica no aparelho as preferências
    da conta; a conta vence. (b) Efeitos: reprodução contínua desligada para ao fim da faixa; sem "Som nos stories" ou com economia, o
    story abre sem som; com economia, o áudio do story só é baixado quando a pessoa liga o som e o próximo story não é pré-carregado (o
    player principal já não pré-busca a próxima faixa, decisão 22). Perfil privado: quem visita `/perfil/[id]` vê só o nome e "Perfil
    privado"; as faixas e playlists publicadas continuam no catálogo (o conteúdo é público por natureza). "Mostrar o que estou ouvindo":
    hoje nenhuma tela mostra o que alguém ouve (o "N ouvindo" é contagem anônima); a escolha fica salva para a tela que vier.
    (c) Conta: nome (coluna `display_name`, que o dono já podia trocar pela RLS), e-mail (`auth.updateUser`; o Supabase confirma por link no
    endereço novo), foto da conta Google (foto própria com recorte fica para a fatia de `covers/`). (d) **Excluir conta:** confirmação dupla
    (aviso → digitar EXCLUIR, conferido de novo no servidor); exclusão lógica, sem DELETE: 1) login anonimizado pela API admin (e-mail
    `excluida-<id>@radioon.invalid`, metadados limpos, acesso bloqueado por `ban_duration`); se falhar, nada mais muda; 2) `deleted_at` em
    faixas, álbuns, playlists e stories (somem para todos pelas policies restritivas da decisão 98); 3) perfil "Conta excluída" com
    `profiles.deleted_at` (o cliente não grava a coluna: grant só de `display_name`) e preferências privadas; 4) sessão encerrada. Pontos
    (append-only) e escutas ficam, sem dado pessoal; seguidores deixam de ver a conta em Seguindo. `auth.identities` ainda guarda o e-mail do
    Google até a remoção física, que é **pós-beta** (PLANO.md; escrita destrutiva, só com aprovação e trava).
100. **Uso do agente distribuído ao longo do dia (issue #153, 2026-11-15):** o encadeamento esgotou o limite de 5 h do plano
    (run 43667460025: "You've hit your 5-hour limit"; Opus e Sonnet compartilham o limite). (a) Agendamento a cada 4 h
    (`0 3,7,11,15,19,23 * * *`). (b) No máximo 2 execuções seguidas: a execução com `encadeada=true` não encadeia outra (o teto
    diário de 6 continua). (c) A saída do CLI vai também para um arquivo; se a execução falhar e a saída tiver "hit your … limit"
    ou "usage limit reached", o passo termina com sucesso (sem "Alertar falha", logo sem issue nem e-mail), escreve uma linha no
    resumo do workflow e uma anotação `limite-de-uso` com o horário e a retomada. Como o workflow não comita na `main`, quem
    registra no CONTEXTO.md é a execução seguinte, via `scripts/limites-de-uso.sh` (lê as anotações), que também dá a linha
    do resumo diário. (d) O fallback Opus→Sonnet da decisão da #130 ficou: se o Sonnet também bater no limite, encerra igual.
    (e) PR protegido aberto num domingo: vale como o PR protegido semanal da semana de 2026-11-16 (as demais alterações
    protegidas da semana entram nele), por ser `urgente` e evitar alertas falsos. A #152 (alerta por limite) foi fechada.
101. **Stories reposicionados e story de bio automático (issue #156, 2026-11-15; a 100 está no PR #154):** (a) Home sem os círculos de
    stories e sem o filtro "Stories": Player On é o primeiro bloco, depois Agora combina, Seleção radioOn e **Artistas para conhecer**,
    que virou uma linha de cards verticais (o mesmo card dos stories). Nenhum story postado aparece na Home, exceto: o de boas-vindas da
    radioOn como 1º card para visitante sem conta que ainda não o viu, e os stories dos últimos 7 dias de artistas que a pessoa segue
    (1º lugar, anel âmbar e selo "Novo"; abrem os stories postados e a bio do artista não se repete). Sem nenhum artista com bio, a
    seção mostra a lista simples de antes. (b) **Story de bio é virtual:** derivado a cada leitura (`lib/stories/bio.ts`), sem linha no
    banco nem tabela nova — "regenerar" é automático. Exige foto, nome e ≥ 1 faixa publicada; mostra foto, nome, gênero principal (o
    mais frequente), a frase e 15 s (a partir de 30 s, ajustado à duração) da faixa mais ouvida (empate/sem escutas: a mais recente),
    com Ouvir e Seguir; sem comentar/curtir/compartilhar/menu (é o próprio perfil). O id (`bio-<artista>-<hash de foto, frase, faixa>`)
    muda quando algo muda, então volta a contar como não visto; visto = 1ª visualização (mesmo `localStorage` dos stories). Não expira.
    (c) Migration aditiva `20261115020000`: `profiles.bio` (≤ 140) e `profiles.avatar_url` (só `https://`), leitura pública como o
    resto do perfil; **nenhum cliente grava** (o grant de update segue só em `display_name`; testado no PGlite, inclusive anônimo). O
    servidor grava em Configurações → Perfil de artista (só `role = artist`); a foto vem da conta Google lida no servidor e só é aceita
    de `*.googleusercontent.com` (nunca um valor do cliente). Foto própria com recorte segue para a fatia `covers/` da #125. (d) Ocultar:
    preferência `storyBio` (Privacidade, só artistas); perfil privado também oculta. Lidas pelo servidor com service_role (sem ela, nas
    prévias, ninguém oculto, como em `perfilEhPublico`). Excluir conta limpa bio e foto. (e) Explorar: seção Stories abaixo da busca na
    ordem postados de quem sigo → postados recentes (radioOn primeiro) → bios não vistas → bios vistas. (f) E2E: o cookie de teste
    `radioon_demo_segue` (só fora de produção e só com ids da demonstração) simula "sigo este artista", já que o E2E não tem login.
102. **Login v2, fatia 1 — código de 6 dígitos (issue #120, 2026-11-15):** (a) Novo fluxo e-mail → "Receber código" → campo único
    (`inputmode="numeric"`, `autocomplete="one-time-code"`, aceita colar com espaço/traço, verifica sozinho ao completar 6 dígitos,
    "Reenviar" após 60 s pelo relógio do aparelho, "Trocar e-mail", erros curtos para errado/expirado/excesso). `signInWithOtp` sem
    `emailRedirectTo` + `verifyOtp` no servidor (server actions); sessão anônima vira conta por `updateUser({ email })` + `verifyOtp`
    `email_change` (mesmo id, pontos ficam); o tipo nunca vem livre do cliente (`parseTipoCodigo`). Ao entrar, recarrega a página de
    origem inteira (todos os componentes leem a sessão nova). (b) **Flag:** `LOGIN_CODIGO_POR_PADRAO = false` em `lib/auth/codigo.ts`
    (sobrescrita `NEXT_PUBLIC_LOGIN_CODIGO`). O pedido era ligar sozinho ao detectar o SMTP configurado, mas o agente não tem como ver
    o SMTP nem os modelos do Supabase (sem Management API, sem caixa de e-mail) e, sem os modelos com `{{ .Token }}`, o e-mail traria
    só o link; por isso liga ao concluir o item da Sessão manual (opção reversível e segura). Até lá o link mágico segue igual.
    (c) E2E sem Supabase: cookie `radioon_teste_codigo` liga o código na tela; **só fora de produção** o servidor simula envio e
    aceita `123456` (`000000` = expirado), sem criar sessão. (d) Modelos em `docs/email-templates/` (Magic Link, Confirm signup e
    Change Email, HTML + texto, assunto "Seu código radioOn: {{ .Token }}") e guia do SMTP Gmail (465, remetente "radioOn", 20 e-mails/h,
    OTP de 600 s). (e) Fatia 2: Google Identity Services (botão oficial + One Tap, `signInWithIdToken` com nonce), textos do painel
    ("Entre na radioOn"), rota `/entrar`, concluir a ação pendente após entrar, protótipo.
103. **Login v2, fatia 2 — Google oficial, One Tap, painel único e ação pendente (issue #120, 2026-11-15):** (a) Botão oficial
    "Fazer login com o Google" (Google Identity Services) no painel, em `/entrar`, `/login` e no convite do Perfil; o token de ID vai a
    uma server action que chama `signInWithIdToken` (sessão anônima: tenta `linkIdentity` com o token antes, mesmo id; senão entra
    na conta). **Nonce:** 32 bytes aleatórios no navegador; o Google recebe só o SHA-256 em hex, o Supabase recebe o cru e compara.
    O servidor só aceita token com formato de JWT (≤ 4 KB) e nonce hex de 64. (b) **Client ID** público gravado como padrão
    (`lib/auth/google.ts`; lido do redirecionamento OAuth público do próprio projeto), sobrescrita `NEXT_PUBLIC_GOOGLE_CLIENT_ID`;
    flag `LOGIN_GIS_POR_PADRAO = true` (sobrescrita `NEXT_PUBLIC_LOGIN_GIS`). O script do Google só carrega na **origem cadastrada**
    (`https://radioon-ten.vercel.app`; sobrescrita `NEXT_PUBLIC_GOOGLE_ORIGENS`): em prévias, CI e local o Google recusaria o botão,
    então fica o botão de redirecionamento de antes — que também é o reserva se o script não carregar em 4 s. Não há como o agente
    "detectar" a origem cadastrada além disso; o Julio já a cadastrou (item 0 da issue). (c) **One Tap:** só visitante sem conta, no
    máximo uma vez por sessão (`sessionStorage`), 2,5 s depois de abrir a tela, nunca em login/termos/privacidade/onboarding nem com
    `<dialog>` aberto (player em tela cheia, stories, painéis) ou camada modal ativa (gaveta, menu Criar); se uma delas abrir com o
    One Tap na tela, ele é cancelado (MutationObserver). (d) **Painel único** (`components/conteudo-login.tsx`): logo, "Entre na
    radioOn", "Música independente do mundo todo. Ouça, siga artistas e envie suas faixas.", motivo da ação em âmbar, Google, "ou",
    e-mail → link/código, aceite. `/entrar` é a rota direta com o mesmo conteúdo; `/login` continua (destino dos redirecionamentos
    das páginas protegidas) e mostra o mesmo. (e) **Ação pendente:** `pedirLogin(motivo, destino, acao)` guarda `{acao, destino, em}`
    no `localStorage` por 15 min (sobrevive ao redirecionamento e ao link em outra aba); fechar o painel desiste. De volta com conta
    à tela de destino, `useAcaoPendente` conclui uma vez (hoje: Seguir no perfil e no story de bio). É só lembrete do cliente; o
    servidor decide. Curtir/comentar continuam voltando à tela de origem sem concluir sozinhos (próximo passo, se pedido).
    (f) E2E: cookie `radioon_teste_gis` libera o GIS em qualquer origem com o script do Google trocado por um falso; só fora de
    produção o servidor aceita o token `teste.google.ok` sem criar sessão (não chama o Supabase).

104. **Playlists v2, fase 1, fatia 2 — editor (issue #122, 2026-11-15):** (a) **Sugestões** no painel "Adicionar faixas"
    (`PainelInferior` do design system), com a busca vazia, nesta ordem: "Agora combina com <clima do horário>", "Mais <gênero
    predominante da playlist>", "Ouvidas recentemente" (histórico local do Continue ouvindo, só neste aparelho) e "Suas curtidas"
    (reações do player); até 6 por grupo, sem repetir entre grupos nem sugerir o que já está; grupo vazio some; sem nenhum grupo,
    mostra o catálogo (`lib/playlists/sugestoes.ts`, testado). (b) **Prévia de 15 s:** tocar a capa no painel usa o player global
    (um só `<audio>`, mesma URL assinada reaproveitada — decisão 22) a partir de ~30% da faixa e pausa sozinha aos 15 s; menos de
    30 s contínuos nunca vira escuta válida, então não gera pontos. (c) **Arrastar** pela alça reordena (o servidor só recebe a
    ordem final ao soltar); as setas ↑/↓ com foco na alça fazem o mesmo pelo teclado (substituem os botões Subir/Descer).
    **Deslizar** a linha ≥ 96 px para a esquerda remove; a lixeira continua. (d) **Capa automática** (`CapaPlaylist`): mosaico 2×2
    das 4 primeiras; com 1–3 faixas, a capa da primeira; vazia, a arte gerada do título — no editor e na página. (e) Fica para as
    próximas fatias: foto própria com recorte (`covers/`), mini editor de capa, artista ativado no 1º envio, notas/destaque no editor,
    E2E logado (a prévia da Vercel não tem sessão de teste) e toda a fase 2.
105. **Playlists v2, fase 1, fatia 3 — capa própria com recorte (issue #122, 2026-11-15):** (a) No editor, a capa vira botão
    (selo de câmera) que abre o painel "Capa da playlist": **Escolher foto** → quadro quadrado com grade de terços, **arrastar**
    (ou setas) para enquadrar e **zoom** 1–3× (controle deslizante ou +/−); "Usar esta capa" gera no navegador (canvas) um JPEG
    quadrado de até 1000 px (qualidade 0,86 → 0,6 até caber em 2 MB) e envia direto ao bucket. "Usar o mosaico das faixas" volta à
    capa automática. (b) Servidor: `POST /api/playlists/[id]/capa` só para conta dona (sem anônimo), valida tipo/tamanho e assina o
    PUT (10 min) em `covers/<conta>/<uuid>` (servido pelo proxy); a action `definirCapa` só aceita chave `covers/<própria conta>/<uuid>`
    e confere com 1 HEAD que o arquivo chegou antes de gravar `playlists.cover_path` (coluna da migration `20261113020000`, grant de
    update já existente: **sem migration**). (c) `GET /api/playlists/[id]/capa?v=<8 primeiros do uuid>` redireciona à imagem; a RLS
    só mostra playlist pública ou do dono; cache de 15 min (público só se a playlist é pública) e `v` muda a cada capa nova.
    (d) Trocar a capa não apaga o arquivo antigo no bucket (sem escrita destrutiva; limpeza física fica com a remoção pós-beta do
    PLANO.md). (e) O cartão 9:16 e as listas seguem com a capa da 1ª faixa; usar a capa própria neles fica para a fase 2.

106. **Curadoria por faixa no editor da playlist (#122, fase 1, fatia 4; 2026-11-16).** (a) Cada faixa do editor ganha o botão ⋯
    que abre um painel inferior com **Destacar**, **Ocultar** (interruptores, aplicados na hora e desfeitos se o servidor recusar) e
    **Sua nota** (até 280 caracteres, salvar explícito). (b) Grava pela ação `curarFaixa`, que valida a mudança com `parseCuradoria`
    (só `note`/`featured`/`hidden`, tipos exatos) e usa service_role **só depois** de o RLS do cliente do usuário confirmar que a
    playlist é dele — mesma regra de `/curador`, porque o usuário só tem UPDATE em `position`. **Sem migration.** (c) Na lista, a
    faixa destacada mostra estrela, a oculta fica esmaecida com o ícone de olho cortado, e a nota substitui o nome do artista na 2ª
    linha. (d) As ações antigas de `app/curador/actions.ts` (alternarMarca, salvarNota, moverFaixa) seguem para a página de
    Programação; a tela de curadoria agora é o editor.

107. **Artista ativado no 1º envio (#122, ajuste da #116; 2026-11-16).** (a) `/enviar` deixa de mandar quem não é artista para
    `/onboarding`: ouvinte vê o formulário com a linha "Seu perfil de artista é ativado no primeiro envio". (b) A troca acontece **só no
    servidor**, nas rotas `/api/tracks/upload` e `/api/albums/upload`, por `ativarArtista` (`lib/auth/ativar-artista.ts`, service_role,
    id da sessão, `update ... where role in ('listener')`), antes de criar a faixa; regra pura `papelNoEnvio` (envia/ativa/confirma)
    testada. (c) Playlister (`curator`) **confirma** antes ("Usar como artista"), porque criar ou mudar a Programação por horário é só
    de curator (RLS de `programs`); a opção mais segura é não tirar esse acesso sem um toque explícito. (d) `/onboarding` continua
    existindo (stories e links antigos); "Minha rádio" passa a levar direto a "Enviar música". Sem migration.

108. **"Sua faixa está em N playlists" (#122, fase 2, item 5; 2026-11-16).** (a) Conta só playlists **públicas de outras pessoas**
    (as do próprio artista não inflam o número), ignora itens ocultos pelo playlister e faixas não publicadas; apagadas já somem pela
    policy restritiva. (b) Lida com o cliente da sessão (RLS: anônimo/visitante só vê playlists públicas), sem service_role nem migration;
    `presencaEmPlaylists` em `lib/playlists/queries.ts`, regra pura `contarPresenca` testada. (c) Perfil: o dono vê "Sua faixa está em
    N playlists" / "Suas faixas estão em…"; quem visita vê "Em N playlists" (dado público). Meus envios: frase sob "Faixas" e chip
    "Em N playlists" em cada faixa publicada. Zero → nada aparece. (d) Item 6 da fase 2 (pós-beta: colaborativas e notificações) já
    estava no PLANO.md.

109. **Mini editor de capa (#122, fase 2, item 4; 2026-11-16).** (a) No painel "Capa da playlist", a opção **Criar capa** abre o
    estúdio: 6 fundos da marca desenhados no canvas (Noite, Âmbar, Entardecer, Sulcos, Ondas, Faixas), título com 3 fontes
    (Clássica = Geist, Editorial = Fraunces, Cartaz = Bebas Neue, self-hosted pelo `next/font` com `preload: false`, só no editor) e
    12 figurinhas musicais (traços dos ícones Lucide, ISC, copiados para `lib/playlists/estudio-capa.ts` como `Path2D`). (b) Título e
    figurinhas se arrastam sobre a prévia (alças acessíveis: setas movem, + e − mudam o tamanho, Delete remove) e se redimensionam
    pelo controle "Tamanho"; no máx. 8 figurinhas; cada nova vai para uma vaga da borda. (c) O mesmo `desenharCapa` gera a prévia
    (720 px) e a imagem final (1000 px): **PNG** gerado no navegador, com JPEG 0,9 só se passar de 2 MB; envio pela mesma rota assinada
    da foto própria (`covers/`, servida pelo proxy). **Sem migration** e sem rota nova. (d) A composição não é salva (só a imagem);
    reabrir o estúdio começa do título atual.

110. **Hub de playlists (#122, fase 2, item 1; 2026-11-16).** (a) Rádio > Playlists passa a ser o hub, na ordem: **Seleção radioOn**
    (carrossel das playlists automáticas por novidades, gênero e clima), **Playlists em alta** (mais salvas em 7 dias), **Playlisters em
    destaque** (salvamentos das playlists públicas + seguidores), **Mais playlistados** (artistas cujas faixas entraram em mais playlists
    públicas **de outras pessoas** na semana, por `playlist_tracks.added_at`; empate divide a posição, 1º–3º com selo âmbar) e o card
    **Monte sua playlist**; depois, "Todas as playlists". O título "Em alta" virou "Playlists em alta" porque o Explorar já tem o carrossel
    de faixas "Em alta". (b) Cada seção só aparece com **≥ 3 itens** (`HUB_MINIMO`); sem dados falsos em produção (a demonstração, com
    uma 3ª playlist, salvamentos e seguidores, só existe fora de produção). (c) Contagens no servidor com service_role, lendo **só**
    `playlist_saves.playlist_id/created_at` e `follows.followed_id` (nunca quem salvou ou segue), dentro do catálogo em cache de 60 s;
    salvamentos de playlists privadas/apagadas são descartados pela lista pública lida com o papel anônimo. **Sem migration.** Regras puras
    em `lib/playlists/hub.ts`, testadas. (d) Explorar mostra o mesmo hub sem a Seleção (já está na Rádio); "Playlisters em destaque"
    substitui "Playlisters em alta" quando tem o mínimo. (e) Tema da semana e curadores oficiais (itens 2–3) ficam para as próximas fatias.

111. **Curadores oficiais (#122, fase 2, item 2; 2026-11-16).** (a) Um curador oficial por gênero ("radioOn Jazz", "radioOn Indie"…;
    "Outro" fica de fora), criado pela conta oficial no mesmo modelo do perfil radioOn: **perfil virtual** com id fixo
    (`00000000-0000-4000-8000-0000000001NN`), sem usuário no Auth, sem linha em `profiles` e **sem migration**. Lista única em
    `lib/radio/curadores.ts`; criar outro curador = acrescentar uma linha por PR (o gate revisa). Criar contas reais no Auth para eles
    exigiria service_role escrevendo usuários e não daria nada além disso no beta. (b) Cada curador assina a Seleção radioOn do seu
    gênero ("Jazz na radioOn" → "Seleção de radioOn Jazz ✓"); Novidades e climas seguem com o perfil radioOn. (c) Perfil
    `/perfil/<id>` com nome, selo "Curador oficial", frase e as playlists que assina; sem playlist no momento → 404 (nada de perfil
    vazio nem simulado). Perfis oficiais não podem ser seguidos (`podeSeguir` recebe a lista `IDS_OFICIAIS`). (d) Hub: seção
    "Curadores oficiais" logo após a Seleção, só com ≥ 3 curadores ativos (mesmo mínimo do hub); o perfil radioOn lista os curadores
    ativos. O selo (`BadgeCheck`) é decorativo (`aria-hidden`); a legenda do carrossel mostra só curador + selo. (e) Demonstração (fora
    de produção): 9 faixas em 3 gêneros (MPB, Indie, Jazz), 3 por gênero, para o E2E ver a Seleção por gênero e os curadores.

112. **Tema da semana (#122, fase 2, item 3; 2026-11-16).** (a) A conta oficial define o tema de cada semana ISO em
    `lib/playlists/tema.ts` (`TEMAS_DEFINIDOS`, por PR revisado pelo gate), no mesmo modelo dos curadores oficiais: sem tela de
    administração nem credencial nova. Semana sem tema definido usa um rodízio fixo de 8 temas (estável por semana), então o hub
    nunca fica sem tema. (b) Migration aditiva `20261116000000`: coluna anulável `playlists.tema_semana` ("AAAA-SS", com check) e
    trigger que só aceita marcar a **semana atual** (UTC, `IYYY-IW`), inclusive para o service_role: ninguém marca uma semana
    passada para entrar no destaque. O dono marca/desmarca com o grant de update que já existia (RLS do dono; anônimo bloqueado pela
    restritiva); a ação `marcarTema` usa a semana do relógio do servidor. Testado no PGlite. (c) Hub: seção "Tema da semana" logo
    após Curadores oficiais, com o banner do tema (editorial, sempre visível) e "Monte a sua"; playlists marcadas na semana só com
    ≥ 3 (`HUB_MINIMO`); "Destaques do tema passado" = as mais salvas **durante a semana anterior** entre as marcadas com o tema dela
    (salvamentos lidos só como `playlist_id/created_at`), com pelo menos 1 salvamento. Explicação longa atrás de `Ajuda`.
    (d) Editor: banner do tema com o interruptor "Tema da semana" (rascunho pode marcar; só aparece no hub depois de publicada).
    Página pública: chip "Tema da semana: …" (ou "Tema: …" de semanas passadas). (e) Demonstração (fora de produção) marca as 3
    playlists com a semana atual para o E2E ver a seção.
113. **Skills de qualidade e acessibilidade automática (#185; 2026-11-16).** (a) `web-design-guidelines`, `react-best-practices`
    e `composition-patterns` vendorizadas de vercel-labs/agent-skills (MIT) no commit `1a2c79d`, lidas por inteiro antes (sem
    scripts, sem instruções sobre regras/permissões/credenciais). A `web-design-guidelines` buscava as regras numa URL a cada uso:
    as regras foram copiadas para `guidelines.md` (vercel-labs/web-interface-guidelines `434b7f9`) e o SKILL.md lê só o arquivo
    local. Uso registrado no CLAUDE.md. (b) `@axe-core/playwright` em `e2e/acessibilidade-mobile-visual.spec.ts` (iPhone e
    Android emulados): Home, filtro Faixas, stories, mini player e player cheio (quando há faixa), Explorar, Biblioteca, Perfil,
    Configurações, Enviar (→ login) e Login; reprova em "serious"/"critical" (WCAG 2.0–2.2 A/AA + boas práticas). Única regra
    violada: `label-content-name-mismatch` (2.5.3). Corrigida de verdade onde o nome podia conter o texto visível: "Ouvir agora"
    (nome começava por "Tocar"), mini player e "A seguir" (subtítulo/duração no nome) e cartões de carrossel (espaço entre título
    e artista: o axe junta o texto visível de spans em bloco sem separador). **Exceção** (`data-a11y-nome="cartao"`, vira aviso
    no anexo): linhas de faixa e cards de story, cujo nome curto ("Tocar X, Artista", "Ver stories de X") contém o rótulo
    principal visível, mas não os metadados (duração, escutas, gênero, "Novo"); repetir tudo no nome pioraria o leitor de tela.
    Os nomes existentes não mudaram (os E2E seguem iguais). (c) Cores antigas (`#0f0f23`, `#ff6b35`…) só existiam no CLAUDE.md:
    descrição trocada por marinho/âmbar/gramofone/tokens; o código já usava os tokens.
114. **Lighthouse CI como aviso, no app compilado do CI (#185; 2026-11-16).** A issue pede a prévia, mas a prévia exige o secret
    `VERCEL_AUTOMATION_BYPASS_SECRET`, e usar secret num workflow é alteração protegida (trava). Opção segura e reversível: job
    `lighthouse` no `ci.yml` (sem secrets nem mudança de permissões) com `@lhci/cli@0.16.1` via `npx` (sem dependência no
    projeto), contra `next build && start` com Supabase fictício (catálogo de demonstração), perfil celular com throttling simulado,
    1 execução por página (`/`, `/explorar`, `/faixa/<demo>`). Orçamento LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 300 ms como `warn`
    (`lighthouserc.json`), job com `continue-on-error` e tabela no resumo da execução (`scripts/lighthouse-resumo.mjs`). Linha de
    base local (2026-11-16): `/` LCP 3,7 s, TBT 907 ms; `/explorar` LCP 4,1 s; faixa LCP 3,1 s; CLS 0 nas três. Virar bloqueio
    a partir de 2026-11-23 se não houver regressão (exige corrigir LCP/TBT antes); medir na prévia fica para o PR protegido semanal.

115. **Eficiência do agente (#188; 2026-11-16).** (a) DECISIONS.md virou índice (uma linha por decisão, ≤ 10 KB); o texto
   completo foi para `docs/historico/decisoes.md`, sem mudar a numeração (o código cita "DECISIONS n"). (b) CONTEXTO.md
   reescrito com ≤ 8 KB (estado, fila, pendências, próximo passo); a versão completa até 2026-11-16 ficou em
   `docs/historico/CONTEXTO-2026-11.md`. Medido: CONTEXTO 43,5 → 5 KB; DECISIONS 68,6 → 4,9 KB. (c) Sem PR só de docs e sem
   novos `docs/reports/*.md`; lotes, fatias maiores, "Próximo passo" e métrica semanal viram regras no CLAUDE.md (fora das TRAVAS),
   que também perdeu duplicações (autoplanejamento/aprovação, canal único). (d) Parte protegida num PR à parte: o gate pula
   `validar`/`e2e` quando o PR só altera `.md` fora de `.github/`, `.claude/`, `scripts/ci/` e `supabase/` (travas, R1–R4 e a
   checagem de markdown continuam); a Vercel ignora o build **só de produção** para commit só de `.md` (`VERCEL_ENV=production`
   e `git diff HEAD^`), porque o último commit de um PR de código pode ser só o CONTEXTO.md e a prévia tem de existir para o E2E.
   (e) Dependabot majors: `checkout` v7, `upload-artifact` v7 e `download-artifact` v8 (#88–#90) entram no PR protegido;
   TypeScript 6 (#92) e `@types/node` 26 (#93) fechados com comentário e registrados no PLANO.md para o próximo sprint.

116. **Configurações > Aparência (#125, fatia 2; 2026-11-17).** (a) Sem migration: `user_settings.prefs` é jsonb; `sanear`
   passou a aceitar `destaque` (lista fechada `ambar|azul|verde|rosa|lilas`) além dos booleanos `textoMaior` e
   `reduzirAnimacoes`. (b) Aplicação por atributos em `<html>` (`data-destaque`, `data-texto="maior"` = 112,5 %,
   `data-movimento="reduzido"` = mesmo corte do `prefers-reduced-motion`); script fixo no `<head>` aplica antes da 1ª pintura
   (sem piscar o âmbar) e `components/aparencia.tsx` mantém em dia; a conta sincroniza pelo caminho já existente (gaveta).
   (c) `--color-brand`/`brand-2` do Tailwind passam a seguir `--ds-destaque`, então botões, play, abas e foco mudam juntos; a
   logo é imagem e não muda. Lilás novo (#b69cff escuro / #6a3fd0 claro); os destaques escuros têm contraste alto com o
   texto marinho. (d) **Tema claro/automático fica para fatia própria:** os tokens existem, mas há ~370 classes de cor fixa
   (`text-white`, `bg-night-*`) que quebrariam no claro; migrar para tokens antes de oferecer a opção.

117. **Tema claro e automático (#125, fatia 3; 2026-11-17).** (a) Em vez de trocar classe por classe por `var(...)`, o
   `@theme inline` ganhou `tinta` (= `--ds-texto`), `fundo` (`--ds-bg`), `fundo-2` (`--ds-bg-2`, novo) e `sobre-destaque`;
   troca mecânica em 50 arquivos (`text-white/70`→`text-tinta/70`, `bg-night-900`→`bg-fundo`, `text-night-900` em botão de
   destaque→`text-sobre-destaque`). No escuro os valores são os mesmos de antes (sem mudança visual). (b) Telas sobre capa ou
   foto (player cheio, stories e cards de story, "No ar", abertura) e os cartões coloridos do Explorar ficam sempre escuros:
   `.tema-escuro` redefine os tokens de superfície/texto (o destaque segue o tema da página, par já com contraste). Botão
   Google segue branco (marca), com contorno `--ds-borda`. (c) Preferência `tema` (`escuro` padrão | `claro` | `auto`), lista
   fechada no `sanear`, sem migration (jsonb). `auto` segue `prefers-color-scheme` ao vivo; script do `<head>` aplica antes da
   1ª pintura e ajusta `meta theme-color`. (d) Logo: variante `public/brand/logo-claro.png` ("radio" em marinho) gerada por
   `scripts/brand/gerar-logo-claro.mjs`; troca só por CSS, variante escondida com `loading="lazy"`. (e) Grão do fundo
   desligado no claro (`--ds-grao: 0`); `.foco-claro` usa a cor do texto (branco/marinho). (f) axe do tema claro em Home,
   Explorar e Configurações (`e2e/acessibilidade-mobile-visual.spec.ts`).
118. **Equalizador (#125, Som; 2026-11-17).** (a) Predefinições fechadas em vez de controles livres: `plano` (padrão,
   "Normal"), `graves`, `voz` e `agudos` (`EQS`/`BANDAS_EQ` em `lib/preferencias/rules.ts`), reforço máximo +5 dB; menos UI e
   nada de valor arbitrário vindo do cliente. (b) 3 bandas `BiquadFilterNode` (prateleira 120 Hz, pico 1 kHz Q 0,9, prateleira
   8 kHz) no mesmo grafo do "Normalizar volume" (fonte → bandas → ganho → limitador); pré-ganho de metade do maior reforço
   (`preGanhoEq`) para o limitador não bombear. (c) Só com o áudio do proxy (Worker responde CORS); origem sem CORS ou sem
   Web Audio toca normal (bandas em 0). `plano` sem normalização não monta o Web Audio. (d) Preferência `eq` no jsonb
   `user_settings.prefs`, saneada por lista (sem migration); muda na hora pela faixa atual (evento `radioon:prefs`).
   (e) UI: o seletor de Tema virou o `Segmentado` genérico em `components/configuracoes.tsx`, reaproveitado pelo Equalizador.
119. **Exportar meus dados (#125; 2026-11-17).** (a) `GET /api/conta/exportar` só para conta de verdade (`getSessionRole`),
   lê com o cliente da sessão (RLS), nunca com service_role, e cada tabela é filtrada pela coluna dona
   (`FONTES_EXPORTACAO` em `lib/conta/exportar.ts`): a RLS deixa ver linhas de outras pessoas em alguns casos (curtidas no
   próprio story, quem me segue) e essas ficam fora. (b) `select("*")` das próprias linhas (são dados da pessoa), teto de
   5000 por tabela, `no-store`, anexo `radioon-meus-dados-AAAA-MM-DD.json` com e-mail e data de criação da conta.
   (c) Áudio e imagens não entram (cota do B2). (d) Botão "Baixar meus dados" na seção Conta das Configurações, com Ajuda.
120. **Seus gostos (#125; 2026-11-17).** (a) Preferência `gostos`: até 5 ids de `GENEROS` (sem "outro"), sem repetição,
   na ordem escolhida (`sanearGostos`), no jsonb `user_settings.prefs` (sem migration). (b) Uso: a Seleção radioOn da Home
   põe as playlists desses gêneros logo após "Novidades da semana" (`ordenarPorGostos` em `lib/radio/home.ts`). A reordenação
   é no cliente (`usePreferencias`): a Home segue em cache compartilhado e a hidratação usa o padrão (sem mismatch).
   (c) UI: chips com caixa nativa em Configurações > Seus gostos, contador "N de 5" e Ajuda.
121. **Foto própria do perfil (#125; 2026-11-17).** (a) Sem migration: a imagem (JPEG quadrado de até 640 px, recortado
   no navegador com máscara redonda) vai direto ao bucket em `covers/<conta>/<uuid>` por URL assinada de 10 min
   (`POST /api/perfil/<id>/foto`, só a própria conta, tipos e 2 MB como capa). (b) A chave fica em
   `user_metadata.foto_propria`, gravada pela sessão (`auth.updateUser`) depois de 1 HEAD; mesmo que o cliente edite os
   metadados, só vale chave do próprio prefixo (`chaveFotoValida`). (c) `GET /api/perfil/<id>/foto?v=<uuid>` é pública como a
   foto do Google: reconstrói a chave sem tocar no banco e redireciona ao proxy/bucket (cache 15 min; foto nova = URL nova).
   (d) A foto própria vence a do Google (`fotoDaConta`) no menu e nas Configurações. (e) Story de bio: `profiles.avatar_url`
   exige https, então grava a rota absoluta com o host atual; `fotoSegura` normaliza qualquer host para o caminho relativo
   (o host gravado nunca vira destino). Se o artista já mostra foto no perfil, trocar a foto atualiza o story. (f) Excluir
   conta limpa `foto_propria`. (g) O recorte foi extraído para `components/recorte-foto.tsx`, usado também pela capa de playlist.

## 122. Primeiro acesso: gostos (2026-11-17, #125 item 6)
(a) Depois de escolher o perfil em `/onboarding`, a pessoa vai para `/onboarding/gostos` (só com conta). (b) Pede até 3
gêneros (`GOSTOS_INICIO`), reaproveitando os chips de Configurações (`components/escolher-gostos.tsx`, limite por prop);
Configurações continua com até 5. (c) "Salvar e continuar" grava no aparelho (a Home lê de lá) e na conta
(`salvarPreferencias`, que saneia no servidor); falha na conta não trava a entrada. "Pular" (ou nenhum gênero) segue sem
gravar. (d) Quem já tem gostos na conta é redirecionado direto. Destino: artista → `/enviar`; demais → Home (`destinoInicio`).
(e) Visitante sem conta não vê a tela: o produto é "entrar e dar play já". "Climas" ficam para quando houver lista de climas.

## 123. Meus envios v2 (2026-11-18, #125 item 4)
(a) Abas Faixas · Álbuns · Playlists · Stories (`Abas` do DS); a aba fica em `?aba=` e, sem ela, abre a primeira com
conteúdo. Os painéis são montados no servidor e só alternados no cliente (`components/meus-envios.tsx`). (b) Cada item usa
`CartaoCapa` horizontal com capa (faixa: própria ou arte; álbum: capa da 1ª faixa com capa; playlist: foto própria ou arte;
story: imagem ou arte), `ChipStatus` e `MenuEnvio` (Editar, Compartilhar, Apagar). (c) Status: faixa Publicada · Preparando
áudio (a lista se atualiza a cada 15 s, no máx. 20 vezes, só com a aba visível) · Falhou com motivo e "Tentar de novo"
(→ `/enviar`; não há reprocessamento no servidor). Playlist privada = Rascunho. Não existe progresso real do preparo no
banco: o chip mostra só o estado, sem porcentagem. (d) Números (`lib/envios/numeros.ts`): reproduções válidas e salvamentos
das faixas, salvamentos das playlists e visualizações dos stories, lidos com service_role só para os ids já filtrados pelo
dono (as policies não deixam o dono ler reações/escutas de terceiros); falha → zero. (e) Duplicatas: mesmo título
normalizado (sem acento, caixa e pontuação) e duração ±1 s; aviso sugere manter a mais ouvida e apagar as outras pelo ⋯
(nada é apagado sozinho). (f) Estados vazios por aba com atalho (Enviar música/álbum, Criar playlist, Criar story).

## 124. Aba Artista no próprio perfil (2026-11-18, #125 item 3)
(a) `/minha-radio` ganha as abas Você · Artista (`components/abas-perfil.tsx`, `?aba=artista`) só para artista com faixa
publicada; os demais veem o perfil como antes. (b) A aba mostra ouvintes únicos, reproduções válidas, "em N playlists"
(públicas de outras pessoas, `presencaEmPlaylists`), faixa mais tocada, reproduções dos últimos 7 dias (`BarrasLeves`, dias
em UTC como o dia de pontos) com a variação contra os 7 anteriores, e a lista das faixas com link para Meus envios.
(c) Dados de `metricasDoArtista` (service_role só leitura, ids das faixas do dono, 10 mil escutas mais recentes); regras puras
em `resumoArtista`/`variacaoSemana` (`lib/tracks/rules.ts`). Estatísticas são privadas: nada disso vai para o perfil público.

## 125. Aba "Você" com estatísticas e perfil público v2 (2026-11-18, #125 itens 1 e 2)
(a) `/minha-radio`: cabeçalho com foto, nome, selos (Artista pelo papel; Playlister com playlist pública), seguidores/seguindo
(contagens de `follows` pela sessão, RLS) e lápis para Configurações. Vale para as duas abas; visitante anônimo segue com o
título "Perfil". (b) Aba "Você": `AnelProgresso` da meta diária + dias seguidos ouvindo (hoje sem escuta mantém a sequência
de ontem); "Seu som da semana" com gêneros (`GraficoCircular`, 4 maiores + Outros), 3 artistas mais ouvidos com foto
(`fotosDePerfis`, validada por `fotoSegura`), Descobertas (% das escutas da semana em artistas ouvidos pela 1ª vez na semana,
janela das 5 mil escutas mais recentes) e minutos por dia (`BarrasLeves`, 7 dias em UTC). "Seu perfil sonoro" por regra fixa
(`perfilSonoro`: descoberta ≥ 50% → Explorador; gênero ≥ 60% → Fã; ≥ 3 gêneros → Ouvido eclético; senão Na onda de). Regras em
`lib/radio/perfil.ts`. Regras de pontos viraram a `Ajuda` "Como ganhar pontos"; com escuta válida em faixa própria aparece
"Faixas suas não contam pontos". (c) Perfil público (`/perfil/[id]`): foto, selos Artista/Playlister e contagem de seguidores
(`Radio.seguidores`, só números). Nada das estatísticas privadas.

## 126. Trilha do artista (2026-11-18, #147)
(a) Depois do primeiro envio publicado, a aba Artista do Perfil abre com "Primeiros passos" (`components/trilha-artista.tsx`):
completar o perfil (foto e frase do artista), enviar a segunda faixa, publicar story com trecho, compartilhar o cartão da faixa
e entrar em uma playlist pública de outra pessoa; barra "N de 5"; cada passo feito vira um selo (`ChipStatus`). (b) Os passos
são derivados a cada leitura (perfil, faixas, stories com `track_id`, `presencaEmPlaylists`): nada novo no banco, sem migration.
"Compartilhar" não tem registro no servidor: fica no aparelho (`radioon_trilha_compartilhou`), marcado pelo botão da trilha
(cartão 1200x630 quando o aparelho aceita arquivo) ou pelo Compartilhar de faixa em Meus envios. (c) Completa, a trilha some e
vira o botão "Trilha do artista completa · ver selos". Após publicar uma faixa, o envio mostra o link "Ver primeiros passos".
Regras puras em `lib/artista/trilha.ts`.

## 127. E2E logado do editor de playlist (2026-11-18, #122)
(a) A prévia não tem conta de teste e criar uma exigiria credencial nova. Em vez de simular a sessão do Supabase, o E2E abre
um rascunho de demonstração: com `demoAtivo()` (nunca em produção) e o cookie de teste `radioon_demo_editor=1`, a playlist
`00000000-0000-4000-8000-000000000701` sai de `obterPlaylist` como rascunho do próprio visitante (`mine: true`, 3 faixas demo).
(b) As server actions do editor (título/descrição, adicionar, remover, reordenar, curadoria, Tema da semana) respondem
`{ ok: true }` para esse id sem tocar no banco; publicar responde com aviso ("Demonstração: a playlist não é publicada.").
Nenhuma permissão é ampliada: o atalho só vale para o id fixo de demonstração, só fora de produção, e não grava nada.
(c) E2E: `e2e/playlist-editor-mobile-visual.spec.ts` (fluxo completo, com prints) e axe do editor e do painel de adicionar em
`e2e/acessibilidade-mobile-visual.spec.ts`. Sem o cookie, o id de demonstração dá 404. Código em `lib/playlists/demo-editor.ts`.

## 128. Botão "Instalar a radioOn" (2026-11-18, #206)
(a) `beforeinstallprompt` é capturado no carregamento do app (`lib/instalar-cliente.ts`, importado por `RegistrarSW`) com
`preventDefault`: a faixa automática do navegador some e a radioOn oferece o botão (gaveta ☰ e aviso na Home). Um toque chama
`prompt()`; o evento só vale uma vez (recusou → o item passa a mostrar os passos do menu ⋮).
(b) Plataforma pelo user agent (`lib/instalar.ts`, testado): app interno (WhatsApp, Instagram, Facebook, WebView `; wv)`) →
"Abra no navegador para instalar" + copiar link; iPhone/iPad → 3 passos (Compartilhar → Adicionar à Tela de Início →
Adicionar); Android sem o evento → 3 passos do menu ⋮; computador sem o evento → nada. `display-mode: standalone` ou
`navigator.standalone` (já instalado) → nada.
(c) Aviso da Home: visitas contadas uma vez por sessão do navegador (`radioon_visitas` no localStorage); aparece a partir da
2ª; fechar grava `radioon_instalar_fechado` e esconde por 14 dias. Tudo no aparelho: nada vai ao servidor nem ao banco.
(d) E2E `e2e/instalar-mobile-visual.spec.ts` (iPhone e Android, com prints e axe do painel e do aviso); o evento do Chrome é
simulado, porque a emulação não instala de verdade. **Conferir no celular** após o deploy.

## 129. Revisão pré-beta, fatia 1 (2026-11-23)
(a) axe completo (todas as regras, inclusive "moderate"/"minor") em 17 rotas públicas no Android emulado: só a exceção já
aceita dos cartões (`label-content-name-mismatch`, DECISIONS 113). Lighthouse local (celular, simulado): acessibilidade 100
nas 3 URLs; desempenho 86/93/83, LCP 3,1–3,7 s (aviso; meta 2,5 s).
(b) Logo da interface (`components/logo.tsx`) em WebP sem perda (`scripts/brand/gerar-logo-webp.mjs`): 30 → 14 KB (escuro) e
26 → 12 KB (claro), sem diferença visual. Os PNG continuam em `public/brand/` para os cartões OG (o gerador só aceita
PNG/JPEG), o e-mail do login e o teste de `/brand/logo.png`.
(c) Cards de story (Home e Explorar): os 3 primeiros carregam sem `loading="lazy"` (um deles é o LCP do Explorar); os demais
seguem lazy.
(d) Guidelines: foco visível no campo de texto da capa (o input tinha `outline-none` sem substituto; o contorno vai no
rótulo por `focus-within`); largura e altura nas fotos redondas dos stories (CLS); `touch-action: manipulation` e
`-webkit-tap-highlight-color: transparent` no `<html>` (pinça para zoom continua; só o duplo toque deixa de dar zoom).
(e) Speed Index de 11,8 s na faixa no Lighthouse local é artefato: o servidor local espera o Supabase fictício
(`e2e.invalid`) e o `load` só dispara após ~32 s; não reproduz em produção. Restante (fatia 2): JS não usado (~75 KB) e
bf-cache (`no-store` na página), a avaliar sem quebrar sessão.

## 130. Revisão pré-beta, fatia 2 (2026-11-24)
(a) JS inicial (soma gzip dos chunks citados no HTML, build local): Home 300 → 224 KB e Explorar 293 → 217 KB (−25%).
(b) Import dinâmico manual (`import()` guardado em estado, sem `next/dynamic`) no visualizador de stories
(`components/faixa-stories.tsx`; o chunk começa a baixar no primeiro toque ou foco da linha) e no conteúdo do login
contextual (`components/login-contextual.tsx`; placeholder `role="status"` "Carregando…" com altura fixa). Com
`next/dynamic` o Suspense depende de timers e o E2E de stories (relógio congelado por `page.clock.pauseAt`) travava. A rota `/story/...` e `/entrar` seguem com import estático.
(c) O cliente do Supabase (~65 KB gzip) sai do JS inicial: o `LoginContextualProvider` o importa dentro do efeito que lê a
sessão; falha do import ou sem Supabase → visitante (mesmo comportamento de antes). O `sessao-lida` continua sendo a marca dos E2E.
(d) Não mexidos: `PlayerCheio` (diálogo sempre montado para a animação; ganho pequeno) e `react-dom`.
(e) bf-cache: o `no-store` vem do Next em páginas dinâmicas (cookies da sessão); trocar exigiria cache de páginas com
sessão, risco de mostrar dados de outra conta. Aceito; reavaliar só se o Next oferecer opção segura.
