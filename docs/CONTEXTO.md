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
- **Sprint 2026-48** (#213) aprovado pelo Julio em 2026-11-24; #167 (2026-47) fechado. PR protegido da semana: #212 (mergeado).
- **Vercel:** em 2026-11-24 o push do #217 não gerou deploy (sem status no commit). Correção sem o Julio: `POST /v13/deployments`
  com `gitSource` (github, `ref` main, `sha`) e `target: production`, com o `VERCEL_TOKEN` do agente; conferir `/api/health`.

## Fila

Legenda: `[ ]` livre · `[~]` em andamento · `[x]` concluído · `[!]` bloqueado. Ordem do **Sprint 2026-48** (#213, aprovado em 24/11).

- [x] **PR protegido semanal #212** — mergeado em 2026-11-24 (trava aprovada): `ler-ctl` no `worker-deploy` + actions majors.
- [x] **#78 Fase C** — fechada em 2026-11-24: `ctl` com 4 escritas/dia (0,4% da cota), 16,7 MB no KV, 0 direto ao B2.
  Medir de novo após o beta: `gh workflow run worker-deploy.yml -f acao=ler-ctl` (sem trava).
- [x] **Revisão pré-beta (qualidade)** — fatias 1 (#215) e 2 (#216) em produção; fatia 3 em produção
  (#217; DECISIONS 131: TBT alto da Home era artefato do ambiente; Explorar em paralelo; favicon 63 → 20 KB).
- [x] **TypeScript 6 e `@types/node` 26** — PR `deps-ts6` (49ª): sem mudança de código nem do tsconfig (DECISIONS 132).
- [!] **#120 Login v2** — só ligar `LOGIN_CODIGO_POR_PADRAO` depois do item 6 da Sessão manual (#135, SMTP).
- [x] **#188 Eficiência** — fechada em 2026-11-23 (medição na #71: PRs/item 6,9 → 3,0; minutos/item 67 → 36).
- Pausados até depois do beta (label `pausado`): #140, #189, #145, #146 (ver `docs/PLANO.md`).

## Próximo passo (arranque rápido)

1. Sprint 2026-48 sem item livre: só #120 (bloqueado pelo SMTP, #135). Conferir `fila`/`feedback` novas e a Caixa de entrada (#128).
2. Sem item livre: qualidade direta. LCP simulado 3,2–3,8 s vem do caminho crítico de JS
   (chunks `32zdoe…`/`37qiu…`, ~135 KB gzip, React + Next); o render do elemento já é rápido. Próximo alvo possível: JS não
   usado nesses chunks (Lighthouse "unused-javascript") ou fontes (2 WOFF, 53 KB). Medir sempre lado a lado com a
   `main` (`git worktree` em :3001), servidor recém-iniciado (`ss -ltnp`; `lsof` não acha o `next-server`), `npx lighthouse@12`
   (`CHROME_PATH=/usr/bin/google-chrome`). Números do Lighthouse no CI variam muito (Supabase fictício; DECISIONS 131).
3. Segunda 2026-11-30: auditoria semanal, fechar Sprint 2026-48 (#213) e abrir o 2026-49.

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

- 2026-11-24 (49ª) — Sprint 2026-48 aprovado. TS 6 / `@types/node` 26 no PR `deps-ts6` (typecheck, testes e build verdes sem mudar código).
- 2026-11-24 (48ª) — Sprint 2026-48 sem aprovação. #212 mergeado (trava); #78 fechada (Fase C). Fatia 3 (#217) em produção (deploy criado pela API: webhook falhou).
- 2026-11-24 (47ª) — Sprint 2026-48 sem aprovação; #212 aguarda a trava. Revisão pré-beta fatia 2 no PR `revisao-pre-beta-2`.
- 2026-11-23 (46ª) — Sprint 2026-48 sem aprovação; #212 aguarda a trava. Revisão pré-beta fatia 1 no PR `revisao-pre-beta`.
- 2026-11-23 (45ª) — Segunda: auditoria (4 baixos conhecidos), #211 (Dependabot minor) mergeado, Sprint 2026-48 (#213),
  PR protegido #212, #188 fechada com a medição na #71. Sem entrega de código não protegida (PR só de docs, exceção).
- 2026-11-18 (44ª) — Caixa de entrada: pacote das 21:10 virou a #206 (urgente). #206 (instalar o app) no PR `item-206-instalar`.
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
