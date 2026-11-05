# CLAUDE.md

# radioOn — instruções permanentes
## Produto
Streaming de música independente global. O público entra e dá play
imediatamente; o entendimento da plataforma vem depois.
MVP com 3 perfis: listener, artist, curator.
Fora do MVP: gravadoras, produtores, marcas, tokens on-chain, NFTs.
## Stack
Next.js (App Router) + TypeScript strict + Tailwind + pnpm.
Supabase (Postgres, Auth, RLS) via @supabase/ssr.
Cloudflare R2 para áudio via @aws-sdk/client-s3.
Deploy Vercel (região pdx1, junto do Supabase us-west-2).
CI GitHub Actions. Ícones lucide-react.
Ambiente de desenvolvimento: GitHub Codespaces.
## Regras invioláveis
1. Pontos, permissões e validação de escuta só no servidor.
2. RLS habilitado em todas as tabelas, com policies.
3. service_role e credenciais R2 só no servidor.
4. Áudio só no R2, com URLs assinadas (upload 10 min, playback 1 h).
5. points_ledger é append-only.
6. Nenhuma dependência ou serviço que exija plano pago.
7. Schema só via migrations em supabase/migrations/.
8. Nunca commitar .env.local nem imprimir valores de chaves no terminal.
## Modelo de dados
profiles(id = auth.users.id, role enum[listener|artist|curator], display_name)
tracks(id, artist_id, title, r2_key, duration_sec, isrc null,
  status enum[processing|published|removed], rights_confirmed bool)
playlists(id, curator_id, title, is_public)
playlist_tracks(playlist_id, track_id, position)
listen_events(id, user_id, track_id, started_at, seconds_listened, is_valid)
points_ledger(id, user_id, amount int, reason, ref_id)
## Listen-to-earn (off-chain)
Escuta válida ≥ 30 s contínuos, confirmada por heartbeats no servidor.
Limite diário configurável. Mesma faixa pontua no máx. 3x/dia por usuário.
Artista não pontua ouvindo as próprias faixas.
## Forma de trabalho
Um ciclo por vez. Decisões técnicas em docs/DECISIONS.md.
## Visual
Fundo #0f0f23 → #16213e, laranja #ff6b35 / #f7931e.
Logo "radio" branco + "On" laranja. Flat, pouco texto, foco no play.

## Modo bloco (autonomia)
- Executar ciclos inteiros sem pedir validação intermediária.
- Validação automática obrigatória antes de cada commit:
  lint + typecheck + testes + build. Se falhar, corrigir e repetir
  até 3 tentativas. Na 3ª falha: notificar via scripts/notify.sh e parar.
- Parar e notificar APENAS quando: faltar credencial ou acesso; uma decisão
  contrariar as regras invioláveis; houver risco de perda de dados;
  a mesma falha persistir após 3 tentativas.
- Fim de cada ciclo: salvar relatório em docs/reports/AAAA-MM-DD-cicloN.md
  e rodar "bash scripts/notify.sh report <arquivo>".
- Toda PAUSA solicitada em prompt deve rodar
  "bash scripts/notify.sh pause <motivo>" antes de aguardar.
