#!/usr/bin/env bash
# ignoreCommand da Vercel: exit 0 = NÃO gerar deploy; exit 1 = gerar. Na dúvida, gera (nunca bloqueia código).
# Poupa o Function Storage do plano grátis (issue #221).
# Só .md (em qualquer pasta, incl. docs/) conta como "sem código"; .github/, .claude/ e scripts/ci/ nunca são pulados
# (mesma regra do caminho rápido do gate). Migrations não entram: o gate espera prévia para elas.
set -u
so_md() { # stdin: lista de arquivos; sucesso se não vazia e só com .md fora de pastas protegidas
  local n=0 f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      .github/*|.claude/*|scripts/ci/*|supabase/*) return 1 ;;
      *.md) n=$((n + 1)) ;;
      *) return 1 ;;
    esac
  done
  [ "$n" -gt 0 ]
}

if [ "${VERCEL_ENV:-}" = production ]; then
  git diff --name-only HEAD^ HEAD 2>/dev/null | so_md && exit 0
  exit 1
fi

# Dependabot: o E2E roda no build do próprio CI, sem prévia.
case "${VERCEL_GIT_COMMIT_AUTHOR_LOGIN:-}:${VERCEL_GIT_COMMIT_REF:-}" in
  dependabot*:*|*:dependabot/*) exit 0 ;;
esac

# Prévia: pula só se o PR inteiro (contra a main) altera apenas .md; o gate dispensa a prévia nesse caso.
git fetch --quiet --depth=200 origin main 2>/dev/null || exit 1
base=$(git merge-base HEAD FETCH_HEAD 2>/dev/null) || exit 1
git diff --name-only "$base" HEAD 2>/dev/null | so_md && exit 0
exit 1
