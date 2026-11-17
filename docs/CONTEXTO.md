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
  texto maior, animações, tema claro/automático), Som (equalizador). CI verde na `main`.
- **Sprint 2026-47** (#167) aprovado e replanejado pelo Julio (foco no beta). PRs protegidos da semana: #154 e #191 (mergeados).

## Fila

Legenda: `[ ]` livre · `[~]` em andamento · `[x]` concluído · `[!]` bloqueado. Ordem do Sprint 2026-47.

- [~] **#188 Eficiência do agente (urgente).** Partes A (#190) e B (#191, protegida) em produção; #88–#90 fechados.
  Só falta o item 6: em 2026-11-23, registrar na #71 (reabrir) PRs/item, minutos/item e itens/dia comparando com 09–16/11.
- [ ] **#122 Playlists v2** — só falta o E2E logado (a prévia não tem conta de teste; avaliar sessão simulada no E2E).
- [~] **#125 Perfil e Configurações v2** — Aparência completa (DECISIONS 116–117); Som: equalizador com 4 predefinições
  (PR `item-125-equalizador`, DECISIONS 118). Faltam: Seus gostos, exportar dados, foto própria (`covers/`), itens 1–4, 6 e 7.
- [ ] **#78 Fase C** — janela de 48 h fechou na noite de 2026-11-16. Contadores do KV `ctl` só com o token da Cloudflare do
  ambiente `producao-db` (workflow protegido): propor um passo de leitura no próximo PR protegido semanal.
- [ ] **#147 Trilha do artista.**
- [!] **#120 Login v2** — só ligar `LOGIN_CODIGO_POR_PADRAO` depois do item 6 da Sessão manual (#135, SMTP).
- Pausados até depois do beta (label `pausado`): #140, #189, #145, #146 (ver `docs/PLANO.md`).

## Próximo passo (arranque rápido)

1. Conferir se o PR `item-125-equalizador` mergeou e o deploy subiu (`/api/health`). Telas novas usam `tinta`/`fundo`/
   `sobre-destaque` (docs/design-system.md); seletor de opções = `Segmentado` em `components/configuracoes.tsx`.
2. **#125, exportar dados:** rota GET `app/api/conta/exportar/route.ts` (sessão; JSON das próprias linhas de profiles,
   user_settings, tracks, playlists, listen_events, points_ledger via cliente da sessão/RLS, sem service_role) + botão
   "Baixar meus dados" na seção Conta. Depois: Seus gostos (gêneros preferidos em `prefs`, lista fechada, sem migration).
3. #122: avaliar sessão simulada no E2E para o editor de playlist logado.

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

- 2026-11-17 (38ª) — #194 (tema claro) em produção. #125 Som: equalizador no PR `item-125-equalizador` (sem migration).

- 2026-11-17 (37ª) — #192 fechada (#191 mergeado). #125 tema claro/automático no PR `item-125-tema-claro` (sem migration).
- 2026-11-16 (35ª) — #185 (skills de qualidade, axe, Lighthouse) em produção (PR #186).
- 2026-11-16 (36ª) — Caixa de entrada: pacotes das 14:49–14:55 viraram #188 (urgente) e #189 (logo pausada); replanejamento
  das 15:02 aplicado (Sprint #167, label `pausado`). #188 parte A no PR `item-188-eficiencia`; parte B em PR protegido.
  Contexto fixo: CONTEXTO.md 43,5 → 5 KB; DECISIONS.md 68,6 → 4,8 KB; CLAUDE.md 15,2 → 15,9 KB (regras novas). #125 Aparência
  no PR `item-125-aparencia` (sem migration).
