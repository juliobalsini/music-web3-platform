# Vitrine do repositório e licença — 2026-11-12 (issue #86)

## Feito
- **README.md** reescrito em inglês, com resumo em pt-BR no topo, cartão de marca (gramofone + frase), link de produção,
  funcionalidades, `/enviar` para artistas, stack gratuita (Next.js, Supabase, Vercel, B2, Cloudflare Workers + KV),
  desenvolvimento autônomo (Claude Code no Actions, gate, travas, relatórios) e seção **License**. Web3/tokenização só
  como "direção futura", sem promessa (Ciclo 6 bloqueado).
- **LICENSE** substituído por "Copyright (c) 2026 Julio Balsini. All rights reserved." + frase de consulta apenas
  (uso, cópia, modificação ou distribuição exigem autorização escrita). Decisão 76 em `docs/DECISIONS.md`.
- **Menções ao MIT removidas:** README (seção "Licença → MIT") e LICENSE. `package.json` ganhou `"license": "UNLICENSED"`
  (não tinha campo `license`). Restam, de propósito, `.claude/skills/impeccable/LICENSE` (Apache-2.0) e
  `NOTICE.md` (MIT original), código de terceiros em área protegida.

## Domínio antigo `music-web3-platform.vercel.app`
Busca em código, docs, metadados, Open Graph e manifest: **nenhuma ocorrência literal** do domínio antigo; o manifest não
usa URL absoluta. Alterado: `app/layout.tsx` — `metadataBase` (base do Open Graph) agora usa a URL fixa
`https://radioon-ten.vercel.app` na Vercel (antes dependia de `VERCEL_PROJECT_PRODUCTION_URL`, que pode apontar para
outro domínio do projeto). Mantidos: nome do repositório GitHub `music-web3-platform` (URLs em `scripts/painel.sh`,
protegido? não, mas é o nome real do repo) e `project_id` em `supabase/config.toml` (arquivo protegido).
Observação: a imagem `public/brand/cartao-marca.png` exibe "www.radioon.com.br" (arte, não alterada).

## Ativos de marca (referência futura)
`public/brand/{logo,gramofone,cartao-marca}.png`, `public/icons/icon-{any,maskable}-{192,512}.png`, `app/icon.png`,
`app/apple-icon.png`, `app/manifest.ts`, `app/layout.tsx` (nome/descrição), `components/{logo,logo-cabecalho,abertura,frase}.tsx`,
`scripts/brand/recortar-logo.mjs`, `PRODUCT.md`, `DESIGN.md`, `docs/emails-autenticacao.md`, `README.md`.
