# Origem (vendorizado)

- Repositório: https://github.com/vercel-labs/agent-skills (licença MIT, declarada no README do repositório)
- Commit fixado: `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` (main em 2026-11-16; último commit de 2026-10-27)
- Copiado: `skills/web-design-guidelines/`.
- Revisão de segurança (2026-11-16, issue #185): todos os arquivos lidos; sem scripts executáveis, sem instruções que alterem
  regras, permissões ou travas e sem pedido de credenciais. Comandos e URLs que aparecem são só exemplos de código.
- Atualizar só por PR novo, trocando o commit acima e revisando o diff.

## Regras locais (sem acesso externo)

- O SKILL.md original manda buscar as regras em
  `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` a cada revisão.
  Aqui as regras foram copiadas para `guidelines.md`, do repositório
  https://github.com/vercel-labs/web-interface-guidelines no commit `434b7f91364665f2f733b310ec54809bf8f37937`
  (licença MIT em `LICENSE-guidelines`), e o SKILL.md foi alterado para ler só o arquivo local.
- Única alteração no `SKILL.md`: as seções "How It Works", "Guidelines Source" e "Usage" apontam para `guidelines.md`.
