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
