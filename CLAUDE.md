# radioOn — instruções permanentes
Responder sempre em português. Estado e fila: docs/CONTEXTO.md · decisões: docs/DECISIONS.md. Next 16: ler AGENTS.md.
**Produto.** Streaming de música independente global: o público entra e dá play já; o entendimento
vem depois. MVP com 3 perfis: listener, artist, curator. Fora do MVP: gravadoras,
produtores, marcas, tokens on-chain, NFTs (ciclo 6 só quando o Julio liberar).
## Stack
Next.js App Router + TypeScript strict + Tailwind + pnpm · Supabase (Postgres, Auth, RLS)
via @supabase/ssr · Cloudflare R2 via @aws-sdk/client-s3 · Vercel pdx1 (Supabase
us-west-2) · GitHub Actions · lucide-react · Playwright. Visual: fundo #0f0f23→#16213e,
laranja #ff6b35/#f7931e, logo "radio" branco + "On" laranja; flat, pouco texto, foco no play.
**UI:** toda tarefa de UI usa a skill `impeccable` (.claude/skills/impeccable), sem rodar
o launcher dela (bloqueado; usar o caminho "Launcher unavailable"). Ver UPSTREAM.md.
## Regras invioláveis
1. Pontos, permissões e validação de escuta só no servidor.
2. RLS habilitado em todas as tabelas, com policies.
3. service_role e credenciais R2 só no servidor.
4. Áudio só no R2, com URLs assinadas (upload 10 min, playback 1 h).
5. points_ledger é append-only.
6. Nenhuma dependência ou serviço que exija plano pago.
7. Schema só via migrations novas em supabase/migrations/.
8. Nunca commitar .env* nem credenciais, nem imprimir valores de chaves.
## Modelo de dados e listen-to-earn (off-chain)
profiles(id = auth.users.id, role enum[listener|artist|curator], display_name)
tracks(id, artist_id, title, r2_key, duration_sec, isrc null,
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
- Deploy de produção quebrado: rollback na Vercel e registrar.
- Relatórios só: fim da execução (consolidado), entrega grande em produção, bloqueio que
  exige o Julio → docs/reports/AAAA-MM-DD-<assunto>.md + `bash scripts/notify.sh report <arq>`.
  Entre relatórios, só mensagens curtas. Ao fim de cada execução: `bash scripts/painel.sh`.
<!-- TRAVAS:INICIO (protegida: mudar exige aprovação do Julio no ambiente "travas") -->
## Travas
- Nunca: escrita destrutiva no banco (DELETE, DROP, TRUNCATE, migration destrutiva);
  credenciais em arquivos versionados; aprovar ou contornar mudanças nas próprias travas.
- Parar e notificar (`bash scripts/notify.sh pause <motivo>`) só para: escrita destrutiva,
  falha 2x no mesmo item, token/login expirado ou ausente.
- Protegidos (gate não mergeia sem o Julio): .github/**, .claude/**, scripts/notify.sh,
  scripts/ci/**, supabase/config.toml, migrations existentes e esta seção.
- Alertas: no máx. uma issue "⚠️ Ação necessária — AAAA-MM-DD" por dia (notify.yml).
<!-- TRAVAS:FIM -->
