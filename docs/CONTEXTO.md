# Contexto do radioOn

Fonte de verdade do agente: estado atual, fila e pendências. **Limite: 8 KB.** Histórico (itens concluídos,
execuções antigas): `docs/historico/CONTEXTO-AAAA-MM.md`, não lido por padrão. Decisões: índice em
`docs/DECISIONS.md`, texto completo em `docs/historico/decisoes.md` (ler só o tema da tarefa).

## Estado atual

- **Produção:** https://radioon-ten.vercel.app (Vercel `radioon`, pdx1; deploy a cada push na `main` com código).
- **Banco:** Supabase `radioon` (us-west-2), RLS em todas as tabelas; última migration `20261116000000` (aplicada).
- **Áudio:** B2 + proxy `radioon-audio.radioon.workers.dev` (cache em KV) ligado desde 2026-11-14 (DECISIONS 93).
- **Entregue:** ciclos 0–5, Fase UX, redesenho mobile, Fases A–C, Stories v2, Navegação v2, Configurações fatia 1,
  Login v2 (fatias 1–2), Playlists v2 (fases 1–2), Skills de qualidade + axe + Lighthouse (aviso), Aparência (destaque,
  texto maior, animações, tema claro/automático), Som (equalizador), exportar dados, Seus gostos, foto própria do perfil,
  primeiro acesso com gostos. CI verde na `main`.
- **Sprint 2026-47** (#167) aprovado e replanejado pelo Julio (foco no beta). PRs protegidos da semana: #154 e #191 (mergeados).

## Fila

Legenda: `[ ]` livre · `[~]` em andamento · `[x]` concluído · `[!]` bloqueado. Ordem do Sprint 2026-47.

- [~] **#188 Eficiência do agente (urgente).** Partes A (#190) e B (#191, protegida) em produção; #88–#90 fechados.
  Só falta o item 6: em 2026-11-23, registrar na #71 (reabrir) PRs/item, minutos/item e itens/dia comparando com 09–16/11.
- [x] **#122 Playlists v2** — E2E logado do editor (rascunho de demonstração por cookie de teste, DECISIONS 127) no PR
  `item-122-e2e-editor`; fechar a #122 ao mergear.
- [x] **#125 Perfil e Configurações v2** — concluída e fechada (#195–#203; item 7 é pós-beta no PLANO.md).
- [ ] **#78 Fase C** — janela de 48 h fechou na noite de 2026-11-16. Contadores do KV `ctl` só com o token da Cloudflare do
  ambiente `producao-db` (workflow protegido): propor um passo de leitura no próximo PR protegido semanal.
- [x] **#147 Trilha do artista** — em produção (#204), issue fechada.
- [!] **#120 Login v2** — só ligar `LOGIN_CODIGO_POR_PADRAO` depois do item 6 da Sessão manual (#135, SMTP).
- Pausados até depois do beta (label `pausado`): #140, #189, #145, #146 (ver `docs/PLANO.md`).

## Próximo passo (arranque rápido)

1. Conferir se o PR `item-122-e2e-editor` mergeou e o deploy subiu (`/api/health`); se a #122 ficou aberta, comentar, remover
   `fila` e fechar.
2. Sem item livre até segunda: #188 item 6 só em 2026-11-23; #78 (leitura do KV `ctl`) entra no PR protegido de 2026-11-23;
   #120 espera o SMTP (#135). Execução sem item livre: só resumo e `scripts/painel.sh` (sem branch nem PR).
3. Segunda 2026-11-23: Sprint 2026-48 a partir do `docs/PLANO.md` (backlog: Dependabot major TS 6 e @types/node 26; pausados
   #140, #189, #145, #146 voltam só depois do beta) e auditoria de segurança semanal.

## Pendências do Julio (detalhes na issue "Sessão manual", #135)

- Item 6 da Sessão manual (SMTP com a marca) → libera o código de 6 dígitos (#120).
- Conferir logado no celular: playlists (editor, capa, Tema da semana), envio de álbum/story, Configurações, seguir.
- Marco pré-lançamento: skill `security-audit` da Cloudflare; rotacionar chaves do Supabase e do B2 expostas em conversa
  (ordem segura: nova chave na Vercel → validar upload → revogar a antiga); apagar `B2_TEMP_*` do Codespaces.

## Como o modo autônomo funciona (resumo)

- **Branches:** `[a-z0-9-]`, máx. 28 caracteres (URL da prévia `radioon-git-<branch>-juliobalsinis-projects.vercel.app`).
  Dois projetos Vercel no repo: `radioon` (oficial) e o antigo `music-web3-platform` (o gate ignora).
- **Agendamento:** `autonomo.yml` a cada 4 h (03, 07, 11, 15, 19, 23 UTC) + manual; o cron do GitHub pode atrasar ou pular.
- **Agente:** `CLAUDE_CODE_OAUTH_TOKEN` + `AGENT_GH_TOKEN` (PAT do Julio). Sem credencial do banco.
- **Gate:** travas → workflows (R1–R4) → validar → E2E na prévia → `gate-ok` → merge squash. Protegido espera `travas`.
- **Migrations** (`migracao.yml`): só SQL da allowlist (`scripts/ci/validar-sql.mjs`); GRANT/REVOKE e o resto → Ação necessária.
- **Testes sem cota:** nunca produção; mocks ou prefixo `test/`. E2E só lê páginas públicas e `/api/health`.
- **Alertas:** `scripts/notify.sh`; Painel (#6) por `scripts/painel.sh` ao fim de cada execução.

## Últimas execuções (as anteriores estão no histórico)

- 2026-11-18 (43ª) — #147 em produção (#204). #122: E2E logado do editor de playlist no PR `item-122-e2e-editor` (sem migration).
- 2026-11-18 (42ª) — #125 fechada: aba "Você" + perfil público (#202) e protótipo/ids demo (#203) em produção. #147 no PR `item-147-trilha`.
- 2026-11-18 (41ª) — #199 em produção. #125: Meus envios v2 (#200) em produção; aba Artista no PR `item-125-aba-artista` (sem migration).
- 2026-11-17 (40ª) — #198 (foto própria) em produção. #125: primeiro acesso com gostos + item 7 no PLANO.md (PR `item-125-inicio`).
- 2026-11-17 (39ª) — #197 (Seus gostos) em produção. #125: foto própria do perfil no PR `item-125-foto` (sem migration).
- 2026-11-17 (38ª) — #194 (tema claro) em produção. #125: equalizador (#195) e exportar dados (#196) em produção; Seus gostos no PR `item-125-gostos`.

- 2026-11-17 (37ª) — #192 fechada (#191 mergeado). #125 tema claro/automático no PR `item-125-tema-claro` (sem migration).
- 2026-11-16 (35ª) — #185 (skills de qualidade, axe, Lighthouse) em produção (PR #186).
- 2026-11-16 (36ª) — Caixa de entrada: pacotes das 14:49–14:55 viraram #188 (urgente) e #189 (logo pausada); replanejamento
  das 15:02 aplicado (Sprint #167, label `pausado`). #188 parte A no PR `item-188-eficiencia`; parte B em PR protegido.
  Contexto fixo: CONTEXTO.md 43,5 → 5 KB; DECISIONS.md 68,6 → 4,8 KB; CLAUDE.md 15,2 → 15,9 KB (regras novas). #125 Aparência
  no PR `item-125-aparencia` (sem migration).
