# Plano de produto do radioOn

Roadmap derivado do plano de negócios do Julio. Fonte para o autoplanejamento (regra no
`CLAUDE.md`, "Autoplanejamento"). Estado da fila: `docs/CONTEXTO.md`. Decisões: `docs/DECISIONS.md`.

## Sprints (modelo operacional v2, issue #103)

Toda segunda, a 1ª execução abre a issue **"Sprint AAAA-SS"** (label `sprint`) com até ~5 itens tirados daqui, cada um
com objetivo, risco (baixo/médio/alto), se toca protegidos e execuções estimadas. "aprovado" do Julio aprova o sprint
inteiro ("aprovado exceto X" remove itens). Ao fechar o sprint, o que sobrou volta para o backlog abaixo.

**Backlog priorizado (entrada do próximo sprint; issues `fila` do Julio passam à frente):**
1. Perfil, Meus envios e Configurações v2 (#125) — complexa, migrations aditivas.
2. Playlists v2: restante da fase 1 e fase 2 (#122) — complexa.
3. Login v2: Google oficial, código de 6 dígitos, e-mail com a marca (#120) — complexa; Google depende da Sessão manual.
4. Navegação e conta v2: itens 2, 4, 5, 7, 8 e 11 (#116) — complexa, migrations aditivas.
5. Entrega de áudio, Fase C: verificação após 48 h com o proxy ligado (a partir de 2026-11-16) — baixo.
6. Central de recompensas (item o) — proposto, aguarda aprovação.

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

## Base visual e correções (issue #124, 2026-11-13)
Design system entregue (`docs/design-system.md`). **Auditoria — telas com cara de painel administrativo** e ordem de migração para os componentes novos:
1. **Enviar música** (`components/upload-form.tsx`): formulário cru com muitos campos e textos explicativos → `Abas` (avulsa/álbum), `Ajuda` para a ficha e a capa, `AnelProgresso` no envio.
2. **Meus envios** (`app/meus-envios`): listas de texto sem capa → `CartaoCapa` horizontal + `ChipStatus` (Publicada/Em processamento/Falhou) + `MenuMais`.
3. **Métricas** (`/metricas`, `app/minha-radio`): números em lista → `LinhaEstatistica`, `GraficoCircular`, `BarrasLeves`.
4. **Pontos** (`/pontos`): lista de eventos → `AnelProgresso` (meta diária) + `LinhaEstatistica`.
5. **Onboarding** (escolha de perfil): cartões com texto longo → `CartaoCapa` + `Ajuda`.
6. **Login** (`components/login-form.tsx`): campos crus e textos → fica para a issue Login v2.
7. **Curador/Programação** (`app/curador`) e **editor de playlist**: listas sem capa e textos longos → `CartaoCapa`, `Ajuda`, `EstadoVazio`.
8. **Biblioteca** e **Explorar** (grades): já têm capa; trocar listas restantes por `CartaoCapa` e vazios por `EstadoVazio`.
9. **Stories** (`story-form`, `story-paineis`): painéis próprios → `PainelInferior`.
10. **Privacidade/Termos**: texto jurídico longo → aceitável; só `Ajuda` nos resumos.
Telas novas (Stories v2, Navegação v2, Login v2, Playlists v2, Configurações) já nascem com estes componentes.
