# CLAUDE.md

## Modo bloco (autonomia)
- Executar ciclos inteiros sem pedir validação intermediária.
- Validação automática obrigatória antes de cada commit:
  lint + typecheck + testes + build. Se falhar, corrigir e repetir
  até 3 tentativas. Na 3ª falha: notificar via scripts/notify.sh e parar.
- Parar e notificar APENAS quando: faltar credencial ou acesso; uma decisão
  contrariar as regras invioláveis; houver risco de perda de dados;
  a mesma falha persistir após 3 tentativas.
- Fim de cada ciclo: salvar relatório em docs/reports/AAAA-MM-DD-cicloN.md
  e rodar "bash scripts/notify.sh report <arquivo>".
- Toda PAUSA solicitada em prompt deve rodar
  "bash scripts/notify.sh pause <motivo>" antes de aguardar.
