# Redesenho da Home — "rádio viva" — 2026-11-12

Ordem final: cabeçalho (logo + **No ar · N ouvindo**) → stories em círculos → **No ar** em destaque →
**Agora combina com <clima>** → Continue ouvindo → **Seleção radioOn** → Descobertas/Em alta/Novidades →
**Artistas para conhecer** (→ Álbuns e EPs, no fim). Explorar não foi alterado.

- Selo na mesma linha do logo; N inclui quem está vendo (mínimo 1).
- Stories: o radioOn (perfil oficial, story fixo de boas-vindas) é sempre o primeiro círculo.
- No ar: capa maior, fundo ambiente com as cores da capa, nota do playlister e "A seguir" (3 faixas do fluxo; toque pula até elas).
- Seleção radioOn: Novidades da semana, uma por gênero (≥3 faixas) e uma por clima; páginas `/playlist/radioon-…`.
- Sem migrations (perfil e playlists da plataforma são virtuais; DECISIONS 63–67).
- Ícone do app (item 9): já corrigido em 2026-11-11 (PR #69, `2026-11-11-icones-pwa.md`).

**⚠️ Julio: desinstale e reinstale o app instalado** para ver o ícone/abertura novos (o Android guarda na instalação).

Capturas 390×844 (catálogo de demonstração): `img/home-1-topo.png`, `img/home-2-selecao.png`, `img/home-3-artistas.png`.

Validação: lint, typecheck, 144+ testes unitários, build e E2E local (Chromium) verdes, exceto `/api/health`, que só vale
contra a Vercel (exige commit). Pendência: conferir em produção com faixas reais (gêneros/climas preenchidos).
