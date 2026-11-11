# Auditoria de segurança para usuários anônimos — 2026-11-11

## Resposta curta
**Sim, é seguro ligar *Anonymous Sign-Ins* e *Manual Linking*, depois de duas condições:**
1. **PR #61 mergeado e a migration `20261111010000_bloqueio_anonimos.sql` aplicada** (o `migracao.yml` aplica
   após o merge; confira em Database → Policies que `profiles`, `tracks`, `playlists`, `playlist_tracks` e
   `programs` têm policies "anônimo não escreve (…)" do tipo *restrictive*).
2. **Deploy de produção com o PR** (as rotas já recusavam anônimos; o PR só acrescenta "apoiar" e testes).

Manual Linking é seguro: o vínculo mantém o mesmo `id` do usuário; ao virar conta o claim passa a `false`.
Só a *escuta* é gravada para anônimo, e sempre pelo servidor, dentro do teto diário.

## O que foi revisado
| Superfície | Situação para anônimo |
|---|---|
| `profiles` | Troca de `role`: já impossível (grant só de `display_name`; papel só via servidor, que recusa anônimo). **Novo:** nem `display_name` ele muda. |
| `tracks` | Sem policy/grant de escrita para clientes; **novo:** restritiva negando insert/update/delete a anônimo. |
| `playlists`, `playlist_tracks`, `programs` | Permissivas exigiam papel curador; **novo:** restritivas bloqueiam anônimo mesmo se o papel fosse `curator`. |
| `listen_events`, `points_ledger`, `track_reactions` | Nenhuma policy de escrita para clientes; só `service_role`. Anônimo só lê as próprias linhas. |
| `listen_start` / `listen_beat` | Chamadas diretas por anônimo via PostgREST: "acesso negado" (corpo exige `service_role`). |
| `/api/tracks/upload`, `/[id]/publish` | `getSessionRole()` → 401 para anônimo (e exigem papel `artist`). |
| Curador (`app/curador/actions.ts`, página), `/enviar`, `/onboarding` + `escolherPerfil` | Recusam anônimo no servidor. |
| `/api/tracks/[id]/reacao` | **Mudança:** "apoiar" exige conta (401); curtir/salvar permitidos. |
| `/api/listen/*` | Usuário vem só da sessão; teto diário próprio (50) para anônimo; sessão anônima só nasce para faixa publicada. |
| Capa, play, Rádio, Explorar | Leitura pública; sem mudança. |

## Testes (provam, não só afirmam)
- `tests/rls-anonimos.test.ts` — **Postgres real (PGlite)** com as migrations reais: anônimo não muda papel nem
  nome, não envia/edita/apaga faixa, não cria playlist (nem se fosse curador), não mexe em itens/notas/programação,
  não escreve em escuta/pontos/reações, não chama as funções de escuta direto; **registra escuta e pontua até o
  teto (5×10 = 50) e nem um ponto além (`limite_diario`)**; conta de verdade segue funcionando (curador cria,
  listener não, teto 200). Controle negativo: sem a migration, 4 desses testes falham.
- `tests/rotas-anonimos.test.ts` — rotas/ações de escrita usam `getSessionRole`; toda escrita com banco fora da
  lista auditada quebra o teste (pega rota nova esquecida).

## Riscos que continuam (não bloqueiam ligar, mas saiba)
- **Pontos por sessão anônima:** quem criar várias sessões ganha 50/dia em cada. Hoje pontos não valem nada
  (sem resgate). **Antes de existir recompensa, ligar CAPTCHA** nos anônimos (exige credencial nova → decisão sua)
  ou só creditar resgate a contas. O Supabase já limita criação de anônimos por IP (padrão 30/h).
- **Perfis órfãos:** cada anônimo cria 1 linha em `profiles`. Limpeza é manual (travas proíbem DELETE automático).
- **JWT antigo após vincular:** por até 1 h o token pode ainda dizer `is_anonymous=true`; só afeta escrita direta
  no banco (bloqueio a mais, nunca a menos). O servidor usa `getUser()` (estado atual).
- Testes usam PGlite com Supabase emulado: fiel às policies/SQL, mas confira uma escuta real como visitante após ligar.

## Mudanças
Migration `20261111010000_bloqueio_anonimos.sql` · `app/api/tracks/[id]/reacao/route.ts` · 2 arquivos de teste ·
devDependency `@electric-sql/pglite` (gratuita) · DECISIONS 52–54.

## Status (fim da execução)
PR #61 mergeado, migration `20261111010000` **aplicada com sucesso** (workflow `migracao`), `/api/health` 200
em produção. **As duas condições estão cumpridas: pode ligar Anonymous Sign-Ins e Manual Linking agora.**
