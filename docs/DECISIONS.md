# Decisões técnicas — radioOn

Formato: data · decisão · motivo. Mais recente no fim.

## 2026-11-05 · Ciclo 0

1. **Protótipo arquivado em `legacy-vite`.** A main recomeça do zero com
   Next.js; contratos Solidity ficam em `legacy/contracts/` só como referência
   (tokens/NFTs estão fora do MVP).
2. **Next.js 16 (App Router) com Turbopack, pnpm via corepack, Node 24.**
   Versões atuais estáveis; Node 24 é o padrão LTS na Vercel.
3. **Chaves Supabase novas e legadas.** `lib/supabase/env.ts` aceita
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (publishable tem prioridade), e `SUPABASE_SECRET_KEY` ou
   `SUPABASE_SERVICE_ROLE_KEY` no cliente admin. O cliente admin e o server
   importam `server-only` para impedir vazamento ao bundle do browser.
4. **Três clientes Supabase:** `client.ts` (browser, chave pública),
   `server.ts` (RSC/Actions, sessão via cookies, respeita RLS) e `admin.ts`
   (service role, ignora RLS — apenas para pontos, escutas e moderação).
   Proxy de renovação de sessão será adicionado quando houver login.
5. **Escrita restrita ao servidor por desenho de RLS + GRANTs.**
   - `tracks`, `listen_events`, `points_ledger`: sem policies de escrita para
     `anon`/`authenticated`; somente service_role escreve.
   - `profiles`: usuário só pode alterar `display_name` (GRANT por coluna);
     `role` só muda no servidor. Profile criado por trigger em `auth.users`
     sempre como `listener`.
   - `playlists`/`playlist_tracks`: curador gerencia as próprias via RLS;
     só faixas `published` podem ser adicionadas; update só de `position`.
6. **`points_ledger` append-only em três camadas:** sem GRANT de
   update/delete (nem para service_role), triggers que abortam UPDATE/DELETE/
   TRUNCATE, e índice único `(user_id, reason, ref_id)` para idempotência.
7. **Faixa só pode ser `published` com `rights_confirmed = true`** (CHECK).
8. **Testes com `node --test`** (type stripping nativo do Node 24) para não
   adicionar dependências enquanto a suíte é pequena.
9. **`vercel.json` com `regions: ["pdx1"]`** (mais próximo de Supabase
   us-west-2). Mantido JSON em vez de `vercel.ts` para não adicionar
   dependência só por uma chave.
10. **Limite diário de pontos “configurável”** ainda não modelado; será
    definido no ciclo de listen-to-earn (provavelmente variável de ambiente
    lida no servidor).
