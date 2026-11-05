#!/usr/bin/env bash
# Atualiza a issue fixada "Painel radioOn" com a fila de docs/CONTEXTO.md.
# Uso: bash scripts/painel.sh   (requer gh autenticado com Issues: write)
# Não menciona ninguém: editar o painel não deve gerar e-mail.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

TITULO="Painel radioOn"
agora="$(TZ=America/Sao_Paulo date '+%Y-%m-%d %H:%M %Z')"
fila="$(awk '/^## Fila/{f=1;next} /^## /{f=0} f' docs/CONTEXTO.md)"
estado="$(awk '/^## Estado atual/{f=1;next} /^## /{f=0} f' docs/CONTEXTO.md)"
corpo="$(printf '_Atualizado em %s · fonte: [docs/CONTEXTO.md](https://github.com/juliobalsini/music-web3-platform/blob/main/docs/CONTEXTO.md)_\n\n## Estado atual\n%s\n\n## Fila\n%s\n' \
  "$agora" "$estado" "$fila")"

gh label create painel --color 1d76db --description "Painel de estado do radioOn" 2>/dev/null || true
n="$(gh issue list --state open --label painel --limit 20 --json number,title \
  --jq "map(select(.title == \"$TITULO\")) | first | .number // empty")"
if [ -z "$n" ]; then
  url="$(gh issue create --title "$TITULO" --label painel --body "$corpo")"
  n="${url##*/}"
  gh api graphql -f query='mutation($id:ID!){pinIssue(input:{issueId:$id}){issue{number}}}' \
    -f id="$(gh issue view "$n" --json id --jq .id)" >/dev/null || echo "painel: não foi possível fixar a issue."
else
  gh issue edit "$n" --body "$corpo" >/dev/null
fi
echo "painel: issue #$n atualizada."
