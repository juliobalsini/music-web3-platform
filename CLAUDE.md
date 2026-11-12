# radioOn — instruções permanentes
Responder sempre em português. Estado e fila: docs/CONTEXTO.md · decisões: docs/DECISIONS.md. Next 16: ler AGENTS.md.
**Produto.** Streaming de música independente global: o público entra e dá play já; o entendimento
vem depois. MVP com 3 perfis: listener, artist, curator. Fora do MVP: gravadoras,
produtores, marcas, tokens on-chain, NFTs (ciclo 6 só quando o Julio liberar).
## Stack
Next.js App Router + TypeScript strict + Tailwind + pnpm · Supabase (Postgres, Auth, RLS)
via @supabase/ssr · Backblaze B2 (S3-compatível) via @aws-sdk/client-s3 · Vercel pdx1
(Supabase us-west-2) · GitHub Actions · lucide-react · Playwright. Visual: fundo #0f0f23→#16213e,
laranja #ff6b35/#f7931e, logo "radio" branco + "On" laranja; flat, pouco texto, foco no play.
**UI:** toda tarefa de UI usa a skill `impeccable` (.claude/skills/impeccable), sem rodar
o launcher dela (bloqueado; usar o caminho "Launcher unavailable"). Ver UPSTREAM.md.
## Regras invioláveis
1. Pontos, permissões e validação de escuta só no servidor.
2. RLS habilitado em todas as tabelas, com policies.
3. service_role e credenciais S3 (S3_*) só no servidor.
4. Áudio só no bucket S3 (B2), com URLs assinadas (upload 10 min, playback 1 h).
   Cota grátis diária: o player economiza requisições (ver DECISIONS.md, 22).
5. points_ledger é append-only.
6. Nenhuma dependência ou serviço que exija plano pago.
7. Schema só via migrations novas em supabase/migrations/.
8. Nunca commitar .env* nem credenciais, nem imprimir valores de chaves.
## Modelo de dados e listen-to-earn (off-chain)
profiles(id = auth.users.id, role enum[listener|artist|curator], display_name)
tracks(id, artist_id, title, r2_key (= chave no bucket), duration_sec, isrc null,
  status enum[processing|published|removed], rights_confirmed bool)
playlists(id, curator_id, title, is_public) · playlist_tracks(playlist_id, track_id, position)
listen_events(id, user_id, track_id, started_at, seconds_listened, is_valid)
points_ledger(id, user_id, amount int, reason, ref_id)
Escuta válida ≥ 30 s contínuos, confirmada por heartbeats no servidor. Limite diário
configurável; mesma faixa pontua no máx. 3x/dia por usuário; artista não pontua nas próprias.
## Execução autônoma
- Ao iniciar: ler docs/CONTEXTO.md, pegar o próximo item livre e executar; seguir até
  acabar a fila ou o limite de uso. Nunca esperar resposta humana.
- Ciclo por item: branch → código → lint + typecheck + testes + build → PR → E2E na
  prévia da Vercel (gate) → merge se passar → confirmar deploy de produção → marcar
  concluído no CONTEXTO.md. Tentativas e bloqueios também ficam no CONTEXTO.md.
- Escopo: decidir pelo CONTEXTO.md e registrar em DECISIONS.md; na dúvida, a opção
  mais segura e reversível. Testes e prévias nunca usam produção (mocks ou prefixo test/).
- Execução sem item livre: não abrir branch nem PR e não alterar arquivos; registrar só no resumo do
  workflow (`$GITHUB_STEP_SUMMARY`) e rodar `bash scripts/painel.sh`.
- Deploy de produção quebrado: rollback na Vercel e registrar.
- Relatórios só: fim da execução (consolidado), entrega grande em produção, bloqueio que
  exige o Julio → docs/reports/AAAA-MM-DD-<assunto>.md + `bash scripts/notify.sh report <arq>`.
  Entre relatórios, só mensagens curtas. Ao fim de cada execução: `bash scripts/painel.sh`.
## Autoplanejamento
- Ao iniciar cada execução, ler os comentários do Julio nas issues de relatório abertas
  (`gh api repos/{owner}/{repo}/issues/<n>/comments`) para colher aprovações.
- Quando a fila do CONTEXTO.md acabar, propor a próxima fase (até 5 itens) com base em
  docs/PLANO.md, registrando-a no CONTEXTO.md como "proposto" e no relatório.
- Itens de qualidade (bugs, testes, acessibilidade, desempenho, UI, textos) são executados direto.
- Funcionalidade nova ou mudança de escopo ficam "proposto" até o comentário "aprovado" do Julio
  na issue do relatório (aceitar "aprovado g, h" ou "recusado j"). Sem aprovação, não executar.
- Nunca propor: serviço pago, credencial nova, mudança de provedor, nada do Ciclo 6.
<!-- TRAVAS:INICIO (protegida: mudar exige aprovação do Julio no ambiente "travas") -->
- **Aprovação (Fase A):** o Julio aprova respondendo "aprovado <itens>" na issue/e-mail do relatório. Ao ler a
  aprovação, criar a issue do trabalho e executar sem precisar de "Instrução extra". Cada relatório propõe 1–3
  tarefas com objetivo, escopo, arquivos, risco (baixo/médio/alto), se toca arquivos protegidos e execuções estimadas.
- **Sem aprovação prévia só:** correções de segurança de risco baixo, atualizações de dependências com testes verdes,
  correção de testes instáveis e documentação. Sempre por PR e gate; arquivos protegidos seguem exigindo a trava.
- Preferir tarefas maiores e completas por execução (várias fases) sem enfraquecer o gate. `docs/PLANO.md` é a fonte
  única de prioridades: atualizar ao propor, receber aprovação e concluir.
## Segurança contínua (defensiva, só no próprio projeto)
- **Dependabot** (`.github/dependabot.yml`): PR patch/minor com todo o gate verde pode ser mergeado pelo agente;
  **major nunca** — vai para proposta no relatório. Não existe `codeql.yml` (CodeQL em modo Default; um avançado conflita).
- **Auditoria semanal** (1ª execução de cada segunda-feira, ou se a última tem >7 dias): `node scripts/auditoria-seguranca.mjs`
  + alertas Dependabot/CodeQL/secret scanning/malware quando o token os lê; resultado na seção "Segurança" do relatório.
  Severidade crítico/alto/médio/baixo. Corrigir sozinho só baixo que não toca protegidos; o resto vira proposta.
  Crítico → `bash scripts/notify.sh pause` com título "⚠️ Ação necessária" na hora.
- **Nunca** rotacionar, apagar ou alterar secrets/chaves; listar no relatório o que rotacionar e a ordem segura
  (nova chave na Vercel → validar upload → só então revogar a antiga/master).
- AI Scan e Agentic autofix do GitHub ficam desligados (consomem AI credits); não ativar nem depender deles.
## Travas
- Nunca: escrita destrutiva no banco (DELETE, DROP, TRUNCATE, migration destrutiva);
  credenciais em arquivos versionados; aprovar ou contornar mudanças nas próprias travas.
- Parar e notificar (`bash scripts/notify.sh pause <motivo>`) só para: escrita destrutiva,
  falha 2x no mesmo item, token/login expirado ou ausente.
- Protegidos (gate não mergeia sem o Julio): .github/**, .claude/**, scripts/notify.sh,
  scripts/ci/**, supabase/config.toml, migrations existentes e esta seção.
- Alertas: no máx. uma issue "⚠️ Ação necessária — AAAA-MM-DD" por dia (notify.yml).
<!-- TRAVAS:FIM -->
