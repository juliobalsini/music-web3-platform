# Filtros próprios e Continue ouvindo — 2026-11-12

Segunda parte da instrução do Julio. A Home "rádio viva" (itens 1–9) já tinha sido mergeada pela execução anterior
(#70, relatório `2026-11-12-home-radio-viva.md`); aqui só se conferiu e se completou o que faltava, sem refazer.
Explorar intocado; sem migration. DECISIONS 67 (revisada) e 68.

## O que entrou
- **Filtros de volta** (a execução anterior os tinha tirado): Tudo · Faixas · Álbuns · Playlists · Stories, cada um uma visão própria.
  Troca instantânea (visões abertas ficam montadas) e **rolagem própria** de cada filtro; chips fixos no topo. Álbuns e Stories só aparecem se houver conteúdo.
- **Faixas**: "Últimas adicionadas", ordenação (Recentes · Mais ouvidas · Mais curtidas · A–Z), chips de gênero, lista com capa, título, artista clicável (abre o perfil), gênero e clima, duração e escutas; **Tocar tudo** e **Aleatório** viram fila.
- **Playlists**: Seleção radioOn no topo, depois as dos playlisters (curador e nº de faixas); **Criar playlist** (visitante cai no login). **Álbuns**: grade com artista e ano. **Stories**: grade de todos os ativos.
- **Continue ouvindo**: grade 2×3 (até 6, oculta com <2) com capa pequena, título, artista e barra fina de progresso; toque **retoma do ponto exato**; mistura faixas, playlists, álbuns e perfis visitados; equalizador na que toca..

## Ícone
Já corrigido (#69): any com logo inteiro, maskable na zona segura, marinho `#00112A`, 192/512. **⚠️ Julio: desinstale e reinstale o app.**

## Limites
- O histórico fica no aparelho (localStorage) e não sincroniza; o servidor só completa com faixas ouvidas pela conta.
- Validado localmente: typecheck, 150 testes, build, E2E (32 ok; `/api/health` só passa na prévia, que tem o commit).

## Capturas 390×844 (`docs/reports/img/home/`)
`home-topo.png`, `home-completa.png`, `filtro-faixas.png`, `filtro-playlists.png`, `filtro-albuns.png`, `filtro-stories.png` (versões `-completa` com a página inteira; a barra inferior fixa aparece sobre a rolagem nelas).
