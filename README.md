<p align="center">
  <img src="public/brand/cartao-marca.png" alt="radioOn — Música para os melhores ouvintes." width="720">
</p>

# radioOn

**Resumo (pt-BR):** a radioOn é um streaming mobile-first de música independente global. O público entra e dá play já;
artistas enviam faixas em `/enviar`; curadores montam playlists; ouvintes ganham pontos por escutas válidas (validadas no
servidor). Produção: <https://radioon-ten.vercel.app>. Stack 100% gratuita e desenvolvimento autônomo com Claude Code.
Código público só para consulta (ver [License](#license)).

---

> **Música para os melhores ouvintes.** · *Music for the best listeners.*

radioOn is a mobile-first streaming platform for independent music from around the world. Open it and press play — the
explanation can come later.

**Live:** <https://radioon-ten.vercel.app> (installable as a PWA)

## Features in production

- **Radio-first home** — a live "now playing" radio, stories, a curated selection and artists to discover.
- **Player** — global mini-player and full player, resume where you left off ("Continue ouvindo"), volume normalization
  (Settings), audio delivered through a cache proxy to save free-tier quota.
- **Discover** — search, genre and mood filters, tracks, albums/EPs, playlists, and public artist and curator pages.
- **Listen-to-earn (off-chain)** — a listen counts after 30 continuous seconds, confirmed by server-side heartbeats, with
  daily limits and anti-abuse rules. Points live in an append-only ledger. Points from anonymous sessions can never be redeemed.
- **Playlists** — curators (and any account) create, reorder, highlight and annotate playlists.
- **Stories** — text, image and a 15-second audio excerpt, visible for 7 days, with community reporting and auto-hide.
- **Frictionless access** — start listening anonymously; sign in with a magic link when you want to keep your data.
- **Artist metrics** and a Web Share Target: share an audio file from your phone straight into radioOn.

## For artists: uploading tracks

1. Sign in at <https://radioon-ten.vercel.app/login> and choose the **artist** profile.
2. Open **`/enviar`**, pick your audio (MP3, M4A, OGG or FLAC, up to 25 MB), add cover art and details, and confirm you hold
   the rights.
3. The file goes straight from your browser to private storage through a short-lived signed URL (10 minutes), and the track
   is published once the upload is confirmed.

## Stack — 100% free tier

| Layer          | Technology                                                            |
| -------------- | --------------------------------------------------------------------- |
| App            | Next.js (App Router) · TypeScript strict · Tailwind CSS · pnpm        |
| Data / Auth    | Supabase (Postgres, Auth, RLS) via `@supabase/ssr`                    |
| Audio storage  | Backblaze B2 (S3-compatible, signed URLs) via `@aws-sdk/client-s3`    |
| Audio delivery | Cloudflare Workers + KV (cache proxy, `workers/audio-proxy`)          |
| Hosting        | Vercel (`pdx1`, next to Supabase `us-west-2`)                         |
| CI / agent     | GitHub Actions · Playwright E2E                                       |
| Icons          | lucide-react                                                          |

No dependency or service that requires a paid plan is allowed in the project.

## Autonomous development

radioOn is built largely by an autonomous agent: **Claude Code running on GitHub Actions**, twice a day and on demand.

- **Queue and context:** the agent reads [`docs/CONTEXTO.md`](docs/CONTEXTO.md), takes the next free item and runs the
  full cycle: branch → code → lint + typecheck + tests + build → pull request.
- **Gate:** a PR is merged automatically only after checks pass **and** E2E tests pass against the Vercel preview. Production
  deploys are verified afterwards; a broken deploy is rolled back.
- **Locks (travas):** the agent never runs destructive database writes, never commits secrets, and cannot change its own
  guardrails. Protected (owner approval required): the TRAVAS block of `CLAUDE.md`, the `gate`, `autonomo` and `migracao`
  workflows, `scripts/ci/**`, `.claude/settings*.json`, existing migrations, and any permissions/secrets/environment/token
  change in other workflows. The gate also verifies every workflow automatically (owner-only triggers, no untrusted text in
  shell, no `pull_request_target`/`write-all`, no risky cancellation) and **rejects any edit to the TRAVAS block** — only the
  owner edits it, directly on `main`. Migrations go through an allowlist validator.
- **Reports:** decisions are logged in [`docs/DECISIONS.md`](docs/DECISIONS.md); big deliveries get a report in
  [`docs/reports/`](docs/reports/). New features stay "proposed" until the owner approves them.

- **Operating model v2 (weekly sprints):** every Monday the agent opens a "Sprint YYYY-WW" issue planned from
  [`docs/PLANO.md`](docs/PLANO.md); one owner comment "aprovado" (or "aprovado exceto X") approves the whole week. Runs chain
  themselves while approved work remains (up to 6 chained runs a day), protected changes accumulate in one weekly PR,
  failures get up to 3 self-fix attempts, and a single daily summary is posted on the Sprint issue. Everything only the
  owner can do (accounts, keys, secrets, rotation) lives in one open "Sessão manual" issue. Owner issues labelled
  `feedback` (free text, phone screenshots) are triaged: small fixes run right away, scope changes go to the next sprint.

- **Issue queue:** the owner queues work by opening an issue labelled `fila` (add `urgente` to jump the line). Applying the
  label, or commenting "aprovado…"/"recusado…", also triggers a run. Only issues and comments by the owner's account are
  honoured; others are silently ignored, and issue text is treated as data, never interpolated into shell. Runs never cancel
  each other: if one is active the new one exits, and the queue (persisted in issues) is read on the next run. Order: `urgente`
  first, then oldest to newest; on completion the agent comments the result, removes `fila` and closes the issue.

- **Inbox:** the pinned "Caixa de entrada" issue (#128) turns an owner comment starting with `aprovado: novas issues` into new
  issues. Each block is `### ISSUE` + `Título:` + `Labels: fila[, urgente]` + `Corpo:`; the agent replies with the created
  numbers, marking its own replies with a hidden `<!-- agente -->` so they are never re-processed.

## Getting started

```bash
corepack enable
pnpm install
cp .env.example .env.local   # fill in the values
pnpm dev
```

| Command          | Action                                      |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | development server                          |
| `pnpm lint`      | ESLint                                      |
| `pnpm typecheck` | route types + `tsc`                         |
| `pnpm test`      | unit tests (`node --test`)                  |
| `pnpm build`     | production build                            |
| `pnpm validate`  | everything above, in the pre-commit order   |

### Environment variables

| Variable                                | Where   | Notes                                              |
| --------------------------------------- | ------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | browser |                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`         | browser | or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`          |
| `SUPABASE_SERVICE_ROLE_KEY`             | server  | or `SUPABASE_SECRET_KEY` — never in the browser    |
| `SUPABASE_DB_PASSWORD`                  | CLI     | used by `supabase link` / `db push`                |
| `SUPABASE_PROJECT_REF`                  | CLI     |                                                    |
| `S3_ENDPOINT` / `S3_REGION`             | server  | e.g. `https://s3.us-west-004.backblazeb2.com`      |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | server | B2 application key — never in the browser      |
| `S3_BUCKET`                             | server  | private audio bucket                               |

Schema changes live **only** in `supabase/migrations/`. All tables have RLS; sensitive writes (listens, points, track
status, role changes) happen on the server with the admin key.

## Project layout

```
app/                 routes (App Router)
components/          UI components
lib/                 domain logic, Supabase clients, storage
workers/audio-proxy/ Cloudflare Worker + KV audio cache
supabase/            config and migrations
tests/ · e2e/        unit tests · Playwright
docs/                CONTEXTO, DECISIONS, plan and reports
legacy/contracts/    Solidity contracts from the old prototype (reference only)
```

## Roadmap

Tokenization / on-chain features are a possible **future direction** only; they are not part of the product today and are
currently blocked pending the owner's decision.

## License

Copyright (c) 2026 Julio Balsini. All rights reserved.

This source code is public for viewing and reference only. Any use, copying, modification or distribution requires prior
written permission. See [LICENSE](LICENSE). The brand assets (name, logo, icons, tagline) are not licensed for reuse.
