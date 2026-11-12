#!/usr/bin/env bash
# Alertas do Claude Code. Não cria issues diretamente: dispara o workflow
# .github/workflows/notify.yml, que publica como github-actions[bot].
#
# Uso:
#   bash scripts/notify.sh hook               (lê JSON do stdin, campo "message")
#   bash scripts/notify.sh report <arquivo>
#   bash scripts/notify.sh pause <mensagem>
#
# Nunca inclui valores de variáveis de ambiente/chaves no corpo.
set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

WORKFLOW="notify.yml"
LABEL_ACTION="acao-necessaria"
LABEL_REPORT="relatorio"
TZ_LOCAL="America/Sao_Paulo"
MAX_BODY=60000  # limite de payload do workflow_dispatch é 65535

today() { TZ="$TZ_LOCAL" date '+%Y-%m-%d'; }
now() { TZ="$TZ_LOCAL" date '+%Y-%m-%d %H:%M:%S %Z'; }
branch() { git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "desconhecida"; }

# Remove padrões comuns de segredos (defesa extra; nunca enviar valores de chaves).
redact() {
  sed -E \
    -e 's/(gh[pousr]_|github_pat_)[A-Za-z0-9_]{10,}/[REDACTED]/g' \
    -e 's/(sk|pk|rk)[-_](live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{16,}/[REDACTED]/g' \
    -e 's/sb_(secret|publishable)_[A-Za-z0-9_-]{10,}/[REDACTED]/g' \
    -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/[REDACTED]/g' \
    -e 's/0x[a-fA-F0-9]{64}/[REDACTED]/g' \
    -e 's/(([A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|PRIVATE)[A-Z0-9_]*)[[:space:]]*[=:][[:space:]]*)[^[:space:]]+/\1[REDACTED]/g'
}

# O GITHUB_TOKEN automático do Codespace não pode disparar workflows
# (falta actions:write). Ordem de preferência:
#   1. NOTIFY_GH_TOKEN (secret do Codespaces: PAT fine-grained com Actions: write)
#   2. login próprio do gh (gh auth login), ignorando o GITHUB_TOKEN do Codespace
#   3. credencial padrão do gh
gh_dispatch() {
  if [ -n "${NOTIFY_GH_TOKEN:-}" ]; then
    GH_TOKEN="$NOTIFY_GH_TOKEN" gh "$@"
  elif env -u GITHUB_TOKEN -u GH_TOKEN gh auth status >/dev/null 2>&1; then
    env -u GITHUB_TOKEN -u GH_TOKEN gh "$@"
  else
    gh "$@"
  fi
}

# Confirma que o workflow disparado realmente iniciou. Um disparo aceito pela API ainda pode
# terminar em "startup_failure" (instabilidade do GitHub Actions, ex.: notify #33 em 2026-11-11)
# e o aviso se perderia em silêncio. Devolve 1 só se a execução falhou; sem resposta = ok.
confirmar() {
  local desde="$1" i res
  for i in 1 2 3 4 5 6 7 8; do
    sleep 8
    res="$(gh_dispatch run list --workflow "$WORKFLOW" --event workflow_dispatch --limit 5 \
      --json createdAt,status,conclusion \
      --jq "map(select(.createdAt >= \"$desde\")) | first | (.conclusion // .status) // empty" 2>/dev/null || true)"
    case "$res" in
      success|in_progress) return 0 ;;
      failure|startup_failure|cancelled|timed_out) return 1 ;;
    esac
  done
  return 0
}

dispatch() {
  local title="$1" body="$2" label="$3" tentativa desde
  if [ "${#body}" -gt "$MAX_BODY" ]; then
    body="${body:0:$MAX_BODY}

_(truncado)_"
  fi
  for tentativa in 1 2 3; do
    desde="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    if gh_dispatch workflow run "$WORKFLOW" --ref main \
      -f title="$title" -f body="$body" -f label="$label" && confirmar "$desde"; then
      echo "notify: workflow $WORKFLOW disparado ($label, tentativa $tentativa)."
      return 0
    fi
    echo "notify: tentativa $tentativa falhou; repetindo." >&2
    sleep 10
  done
  # Último recurso: cria a issue direto, para o aviso não se perder.
  gh_dispatch label create "$label" 2>/dev/null || true
  gh_dispatch issue create --title "$title" --label "$label" \
    --body "$(printf '@juliobalsini\n\n%s\n\n_(criada direto: o workflow notify falhou)_' "$body")"
  echo "notify: workflow falhou 3x; issue criada direto ($label)."
}

action() {
  local msg="$1"
  local body
  body="$(printf '%s\n\n- **Data/hora:** %s\n- **Branch:** `%s`\n' \
    "$(printf '%s' "$msg" | redact)" "$(now)" "$(branch)")"
  # O workflow comenta na issue aberta de mesmo título (uma por dia).
  dispatch "⚠️ Ação necessária — $(today)" "$body" "$LABEL_ACTION"
}

mode="${1:-}"
case "$mode" in
  hook)
    input="$(cat || true)"
    msg="$(printf '%s' "$input" | jq -r '.message // empty' 2>/dev/null || true)"
    [ -z "$msg" ] && msg="Claude Code enviou uma notificação sem mensagem."
    action "$msg"
    ;;
  report)
    file="${2:-}"
    if [ -z "$file" ] || [ ! -f "$file" ]; then
      echo "uso: $0 report <arquivo>" >&2; exit 1
    fi
    dispatch "Relatório radioOn — $(today)" "$(redact < "$file")" "$LABEL_REPORT"
    ;;
  pause)
    shift
    msg="$*"
    if [ -z "$msg" ]; then
      echo "uso: $0 pause <mensagem>" >&2; exit 1
    fi
    action "$msg"
    ;;
  *)
    echo "uso: $0 {hook|report <arquivo>|pause <mensagem>}" >&2
    exit 1
    ;;
esac
