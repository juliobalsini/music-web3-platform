# Plano de produto do radioOn

Roadmap derivado do plano de negócios do Julio. Fonte para o autoplanejamento (regra no
`CLAUDE.md`, "Autoplanejamento"). Estado da fila: `docs/CONTEXTO.md`. Decisões: `docs/DECISIONS.md`.

## Visão

Hub global de música independente que conecta fãs, artistas e curadores. **Play primeiro:**
o público entra e ouve já; o entendimento vem depois. Tudo off-chain até o Ciclo 6.

## Pilares

1. **Descoberta musical é o diferencial**, contra a repetição dos grandes streamings.
2. **Playlists de curadores são o produto principal** (curadoria humana, não algoritmo opaco).
3. **Listen-to-earn** off-chain: ouvir gera pontos; validação só no servidor.
4. **Cada perfil tem seu valor:** ouvinte, artista e curador (hoje); selo, produtor/empresa e marca (depois).

## Estado (2026-11-10)

Ciclos 0–5 e Fase UX concluídos: auth por magic link, upload e player (B2), playlists e
ranking, heartbeats e pontos, home play primeiro, métricas do artista, polimento das telas.

## Roadmap por fases

Cada item é candidato; qualidade roda direto, funcionalidade nova espera aprovação
(ver regra no `CLAUDE.md`). Ordem = prioridade sugerida.

### Fase 1 — Descoberta e curadoria (próxima)
- Busca e filtros de faixas e playlists (gênero, humor, novidade).
- Páginas públicas de artista e de curador (perfil, faixas, playlists).
- Curador: reordenar, ocultar e destacar faixas em playlists; seguir curadores.
- Ranking de playlists por escutas válidas (hoje é nº de faixas; decisão 26).

### Fase 2 — Central de recompensas por perfil
- Central única: pontos, metas diárias e histórico, com visão própria para ouvinte, artista e curador.
- Recompensas por perfil (ex.: curador pontua por escutas nas suas playlists; artista por
  descoberta). Regras no servidor, `points_ledger` append-only.
- Catálogo de recompensas **sem custo** (reconhecimento, destaque, selos de conquista).

### Fase 3 — Conteúdo e comunidade
- **Stories curtos** de artistas e curadores (áudio/imagem de poucos segundos, expiram).
- **Tutoriais por perfil** (ouvinte, artista, curador), curtos e dentro do app.
- Compartilhamento de faixa e playlist (links com prévia).

### Fase 4 — Fanfest
- Eventos online de descoberta: line-up de artistas independentes, playlists temáticas do
  curador, pontos em dobro durante o evento. Primeiro como página/calendário; ao vivo só
  com serviço gratuito.

### Fase 5 — Artistas: renda mínima e formação
- **Programa de renda mínima para artistas**, com **trilha formativa** (módulos, metas de
  publicação e engajamento). Desenho de regras e orçamento é decisão do Julio; o agente
  só prepara o modelo de dados e a trilha, sem movimentar dinheiro.

### Fase 6 — Novos perfis (pós-MVP)
- **Gravadora/selo** com **cota master** (conta com vários artistas sob o selo).
- **Produtor/empresa** (perfil profissional, créditos em faixas).
- **Marca** com **cota membro** (patrocínio de playlists e eventos).
- Exige ampliar o enum `role`, RLS por organização e decisão de modelo comercial.

## Ciclo 6 — Tokenização e NFTs (BLOQUEADO)

Fora do escopo até o Julio liberar explicitamente. O agente **nunca** propõe nem executa
itens do Ciclo 6.

## Limites permanentes

Sem serviço pago, credencial nova ou troca de provedor. Regras invioláveis do `CLAUDE.md`
(pontos e validação no servidor, RLS, áudio só em B2 assinado, ledger append-only) valem em todas as fases.

## Propostas pendentes de aprovação do Julio

- **Faixa bônus desbloqueada com pontos** *(proposto em 2026-11-10; depende da aprovação do
  Julio na issue do relatório)*. Artistas podem marcar uma faixa extra (demo, ao vivo, inédita)
  como "bônus"; o ouvinte a desbloqueia gastando pontos. O gasto é um lançamento negativo no
  `points_ledger` (append-only, só servidor), com saldo checado no servidor e desbloqueio
  idempotente por usuário e faixa. Sem custo de serviço, sem token on-chain. Riscos a decidir:
  quanto custa cada bônus, se o artista recebe algo, e se desbloquear conta como escuta paga.

## Próximos (registrados em 2026-11-11, após a Fase C)

- **Vídeo em stories** — depende de armazenamento maior que a cota grátis do B2; hoje só texto, imagem e trecho de áudio.
- **Central de recompensas (item o)** — metas diárias e histórico por perfil; resgate **só para contas**
  (pontos de sessão anônima nunca são resgatáveis).


## Entrega de áudio econômica (2026-11-12, issue #78)

Meta: segurar as cotas do B2 (1 GB/dia, 2.500 Classe B) com 20–30 artistas no beta.
- **Fase A** — transcodificação AAC 192 (só origens sem perda/≥256 kbps), loudness medida, ganho no player, Ajustes. *Código pronto; falta workflow e chave de escrita.*
- **Fase B** — Worker `workers/audio-proxy` com cache em KV e `NEXT_PUBLIC_AUDIO_BASE_URL`. *Código pronto; falta workflow, secrets do Worker no ambiente e deploy.*
- **Fase C** — medição após 48 h em produção (relatório). *Depende de A e B no ar.*

## Autonomia de planejamento e segurança (2026-11-12, issue própria)

- **Fase A** — regras no `CLAUDE.md` (aprovação por "aprovado", exceções sem aprovação). *Feita.*
- **Fase B** — `dependabot.yml` (PR #81, aguarda trava), auditoria semanal (`scripts/auditoria-seguranca.mjs`), headers. *Em PR.*
- **Fase C** — E2E mobile com screenshots (`e2e/mobile-visual.spec.ts`). *Em PR.*
- **Fase D** — diagnóstico do modelo do fluxo, no relatório. *Feita (relatório).*
- **Propostas de segurança em aberto:** CSP completa com nonces (médio, 2–3 execuções); `story_reports` sem policy (intencional?);
  PAT sem leitura de alertas de segurança (precisa do Julio).
- **Aprovado (Julio, 2026-11-12), continuar na próxima execução:** pós-#97: redeploy do Worker, validar 200/206, religar o proxy, `transcodificar` lote=5 (precisa de `SUPABASE_SECRET_KEY`), medir CPU/memória (<10 ms) e ganho; avaliar restringir o proxy a `audio/stream/`. *Virou a issue #101 (label `fila`).*

## Stories v2 (issue #113, Julio, 2026-11-13)

- **Fase 1 — experiência** (visualizador em tela cheia, gestos, visto/não visto, compartilhar em linha, grade por perfil, linha no Explorar, link
  compartilhado, pré-carga) e **Fase 2 — interação** (curtir, comentários ≤ 140, reações e figurinhas, moderação, estatísticas do dono, RLS). *Em PR
  (item-113-stories-v2); DECISIONS 87–88.*
- **Pós-beta (registrado, não implementar agora):** mensagem direta (resposta privada ao dono do story) e story com foto/vídeo capturado na hora
  (vídeo depende de armazenamento maior que a cota grátis do B2).

- **Pós-beta (issue #122):** playlists colaborativas e notificações — registrado, não implementar agora.
