# Home viva, filtros próprios e Continue ouvindo — 2026-11-12

Instrução do Julio executada (Explorar intocado; sem migration). Decisões 63–67 no DECISIONS.md.

## Home (filtro Tudo), na ordem pedida
1. Cabeçalho: logo + selo **"No ar · N ouvindo"** na mesma linha (N inclui o próprio ouvinte; mínimo 1).
2. **Stories** em círculos logo abaixo; sempre há o story fixo do perfil oficial **radioOn** (boas-vindas: ouvir, pontos, enviar música, playlists).
3. **No ar** maior, fundo ambiente com as cores da capa, nota do playlister e **A seguir** (3 faixas, toque pula até elas).
4. **Agora combina com <clima>** (horário de Brasília; recentes se não houver faixas do clima).
5. **Continue ouvindo**: grade 2×3, barra fina de progresso, retoma do ponto exato, equalizador na que toca; mistura faixas, playlists, álbuns e perfis; oculto com menos de 2.
6. **Seleção radioOn**: Novidades da semana, uma por gênero (≥3 faixas), uma por clima — automáticas, página `/selecao/[id]`.
7. Descobertas/Em alta/Novidades · 8. **Artistas para conhecer**.

## Filtros (visões próprias)
- **Faixas**: Últimas adicionadas, ordenação (Recentes · Mais ouvidas · Mais curtidas · A–Z), chips de gênero, lista com artista clicável, gênero/clima, duração e escutas, **Tocar tudo** e **Aleatório** (viram fila).
- **Playlists**: Seleção radioOn no topo, depois as dos playlisters; **Criar playlist** (visitante cai no login). **Álbuns**: grade com artista e ano. **Stories**: grade de todos os ativos.
- Troca instantânea (visões já abertas ficam montadas) e **rolagem própria** de cada filtro.

## Ícone
Já corrigido no PR #69 (any com logo inteiro, maskable na zona segura, marinho `#00112A`, 192/512). **⚠️ Julio: desinstale e reinstale o app** para o Android atualizar ícone e tela de abertura.

## Limites e pendências
- Continue ouvindo fica no aparelho (localStorage); não sincroniza entre aparelhos. O servidor só completa com faixas ouvidas pela conta.
- Perfil/Seleção radioOn são virtuais (sem conta nem tabela). O selo mostra "1 ouvindo" se o servidor não tiver service_role.
- A busca saiu da Home (continua no Explorar).
- Validado: typecheck, lint (sem erros), 155 testes, build, E2E local (33 ok; `/api/health` exige commit só na prévia).

## Capturas 390×844 (`docs/reports/img/home/`)
Home: `home-topo.png`, `home-completa.png` · Filtros: `filtro-faixas.png`, `filtro-playlists.png`, `filtro-albuns.png`, `filtro-stories.png` (versões `-completa` incluem a página inteira; a barra inferior fixa aparece sobre a rolagem nelas).
