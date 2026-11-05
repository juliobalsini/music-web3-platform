#!/usr/bin/env bash
# Alertas do Claude Code via GitHub Issues.
# Uso:
#   bash scripts/notify.sh hook               (lê JSON do stdin, campo "message")
#   bash scripts/notify.sh report <arquivo>
#   bash scripts/notify.sh pause <mensagem>
# Nunca inclui valores de variáveis de ambiente/chaves no corpo das issues.
set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

PREFIX="radioOn"
LABEL_ACTION="acao-necessaria"
LABEL_REPORT="relatorio"
DEDUP_MINUTES=15

now() { date '+%Y-%m-%d %H:%M:%S %Z'; }
branch() { git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "desconhecida"; }

ensure_label() {
  local name="$1" color="$2" desc="$3"
  if ! gh label list --limit 200 --json name -q '.[].name' | grep -qx "$name"; then
    gh label create "$name" --color "$color" --description "$desc" >/dev/null 2>&1 || true
  fi
}

ensure_labels() {
  ensure_label "$LABEL_ACTION" "d93f0b" "Claude Code precisa de ação humana"
  ensure_label "$LABEL_REPORT" "0e8a16" "Relatório de ciclo do Claude Code"
}

# Remove padrões comuns de segredos (defesa extra; nunca enviar valores de chaves).
redact() {
  sed -E \
    -e 's/(gh[pousr]_|github_pat_)[A-Za-z0-9_]{10,}/[REDACTED]/g' \
    -e 's/(sk|pk|rk)[-_](live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}/[REDACTED]/g' \
    -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/[REDACTED]/g' \
    -e 's/0x[a-fA-F0-9]{64}/[REDACTED]/g' \
    -e 's/(([A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|PRIVATE)[A-Z0-9_]*)[[:space:]]*[=:][[:space:]]*)[^[:space:]]+/\1[REDACTED]/g'
}

action_body() {
  local msg="$1"
  printf '%s\n\n- **Data/hora:** %s\n- **Branch:** `%s`\n' "$(printf '%s' "$msg" | redact)" "$(now)" "$(branch)"
}

create_action_issue() {
  local msg="$1"
  ensure_labels
  gh issue create \
    --title "$PREFIX: ação necessária" \
    --label "$LABEL_ACTION" \
    --assignee "@me" \
    --body "$(action_body "$msg")"
}

mode="${1:-}"
case "$mode" in
  hook)
    input="$(cat || true)"
    msg="$(printf '%s' "$input" | jq -r '.message // empty' 2>/dev/null || true)"
    [ -z "$msg" ] && msg="Claude Code enviou uma notificação sem mensagem."
    ensure_labels
    cutoff="$(date -u -d "-${DEDUP_MINUTES} minutes" '+%Y-%m-%dT%H:%M:%SZ')"
    recent="$(gh issue list --state open --label "$LABEL_ACTION" --limit 20 \
      --json number,createdAt \
      -q "[.[] | select(.createdAt >= \"$cutoff\")] | sort_by(.createdAt) | last | .number // empty")"
    if [ -n "$recent" ]; then
      gh issue comment "$recent" --body "$(action_body "$msg")"
    else
      create_action_issue "$msg"
    fi
    ;;
  report)
    file="${2:-}"
    if [ -z "$file" ] || [ ! -f "$file" ]; then
      echo "uso: $0 report <arquivo>" >&2; exit 1
    fi
    ensure_labels
    gh issue create \
      --title "$PREFIX: relatório $(date '+%Y-%m-%d')" \
      --label "$LABEL_REPORT" \
      --assignee "@me" \
      --body "$(redact < "$file")"
    ;;
  pause)
    shift
    msg="$*"
    if [ -z "$msg" ]; then
      echo "uso: $0 pause <mensagem>" >&2; exit 1
    fi
    create_action_issue "$msg"
    ;;
  *)
    echo "uso: $0 {hook|report <arquivo>|pause <mensagem>}" >&2
    exit 1
    ;;
esac
