# Origem (vendorizado)

- Repositório: https://github.com/pbakaus/impeccable
- Commit fixado: `687bc381bc9091bf252c0a05303640561014a425` (main em 2026-11-07)
- Copiado: `.claude/skills/impeccable/` e `.claude/agents/impeccable-*.md`, sem alterações,
  mais `LICENSE` (Apache 2.0) e `NOTICE.md`.
- Atualizar só por PR novo, trocando o commit acima e revisando o diff.

**Launcher bloqueado.** `scripts/impeccable` baixa um binário do GitHub Releases na
primeira execução. Por isso `.claude/settings.json` nega a execução dele, e a skill roda
pelo caminho "Launcher unavailable" do SKILL.md (lê PRODUCT.md/DESIGN.md direto).
Os modos `live`, `hooks`, `pin` e `doctor` dependem do binário e ficam indisponíveis.
