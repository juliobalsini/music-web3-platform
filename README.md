# radioOn

Streaming de música independente global. Entre e dê play.

> MVP em construção. Perfis: **listener**, **artist**, **curator**.

## Stack

| Camada        | Tecnologia                                              |
| ------------- | ------------------------------------------------------- |
| App           | Next.js (App Router) · TypeScript strict · Tailwind CSS |
| Pacotes       | pnpm (via corepack)                                     |
| Dados / Auth  | Supabase (Postgres, Auth, RLS) via `@supabase/ssr`      |
| Áudio         | Cloudflare R2 (URLs assinadas) via `@aws-sdk/client-s3` |
| Deploy        | Vercel — região `pdx1` (Supabase em `us-west-2`)        |
| CI            | GitHub Actions (lint, typecheck, testes, build)         |
| Ícones        | lucide-react                                            |
| Dev           | GitHub Codespaces                                       |

## Começando

```bash
corepack enable
pnpm install
cp .env.example .env.local   # preencha os valores
pnpm dev
```

### Variáveis de ambiente

| Variável                                | Onde      | Observação                                   |
| --------------------------------------- | --------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | browser   |                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | browser   | ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`    |
| `SUPABASE_SERVICE_ROLE_KEY`             | servidor  | ou `SUPABASE_SECRET_KEY` — nunca no browser  |
| `SUPABASE_DB_PASSWORD`                  | CLI       | usada em `supabase link` / `db push`         |
| `SUPABASE_PROJECT_REF`                  | CLI       |                                              |

## Scripts

| Comando          | Ação                                   |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | servidor de desenvolvimento            |
| `pnpm lint`      | ESLint                                 |
| `pnpm typecheck` | geração de tipos de rota + `tsc`       |
| `pnpm test`      | testes (`node --test`)                 |
| `pnpm build`     | build de produção                      |
| `pnpm validate`  | tudo acima, na ordem usada antes de commits |

## Banco de dados

O schema é versionado **apenas** em `supabase/migrations/`.

```bash
npx supabase db start          # Postgres local (Docker)
npx supabase db reset --local  # aplica as migrations localmente
npx supabase db push           # aplica no projeto remoto linkado
```

Tabelas: `profiles`, `tracks`, `playlists`, `playlist_tracks`, `listen_events`,
`points_ledger` — todas com RLS. Escritas sensíveis (escutas, pontos, status de
faixas, troca de papel) acontecem só no servidor com a chave admin.

## Estrutura

```
app/                 rotas (App Router)
components/          componentes de UI
lib/supabase/        clientes Supabase (browser, server, admin)
supabase/            config e migrations
tests/               testes unitários
docs/                DECISIONS.md e relatórios de ciclo
legacy/contracts/    contratos Solidity do protótipo (referência, fora do MVP)
```

O protótipo Vite/Web3 anterior está preservado na branch `legacy-vite`.

## Licença

[MIT](LICENSE)
