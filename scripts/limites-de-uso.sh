#!/usr/bin/env bash
# Lista as execuções recentes do autonomo.yml que pararam no limite de uso do plano
# (anotação "limite-de-uso" gravada pelo próprio workflow; issue #153).
# Uso: bash scripts/limites-de-uso.sh [quantidade de execuções=12]
# Saída: uma linha por ocorrência — "<run id> <mensagem com horário e retomada>".
set -euo pipefail
n="${1:-12}"
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
gh run list --workflow autonomo.yml --limit "$n" --json databaseId,conclusion \
  -q '.[] | select(.conclusion == "success") | .databaseId' |
while read -r run; do
  gh run view "$run" --json jobs -q '.jobs[].databaseId' | while read -r job; do
    gh api "repos/$repo/check-runs/$job/annotations" \
      -q '.[] | select(.title == "limite-de-uso") | .message' 2>/dev/null |
      while read -r msg; do echo "$run $msg"; done
  done
done
