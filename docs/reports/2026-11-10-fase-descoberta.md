# Relatório 2026-11-10 — Fase Descoberta e curadoria (k, l, m, n)

Aprovados por você na issue #45; todos mergeados pelo gate e em produção (`/api/health` no commit do #53).

| Item | PR | O que entrou |
|---|---|---|
| k) Busca | #50 | Campo na Rádio e em `/explorar?q=` (sem acento/caixa, todos os termos): faixas, artistas, playlists, playlisters |
| l) Perfis públicos | #51 | `/perfil/[id]` (artista e/ou curador): faixas, escutas, playlists; ligado por "Playlisters em alta" e pelo curador na playlist |
| m) Curadoria | #52 | Subir/descer, ocultar e destacar faixas em `/curador`; ocultas somem da Rádio e da página pública, destaques ficam no topo. Migration aditiva `20261111000000` (aplicada, workflow verde) |
| n) Ranking | #53 | Playlists ordenadas por escutas válidas da semana (decisão 47, troca a 26) |

## Atenção
1. **Bug achado e corrigido:** a nota do playlister (r2) dependia de UPDATE em `playlist_tracks.note`, mas o usuário só tem grant em `position`; provavelmente falhava em produção. Agora nota/ocultar/destacar/ordem gravam no servidor com service_role, só após confirmar que a playlist é do curador (DECISIONS 46).
2. Sem teste contra o banco: m e n foram validados por tipos, build e testes unitários. Faça logado como curador: reordenar, ocultar, destacar e salvar nota.
3. Busca é em memória sobre o catálogo que a Rádio já carrega (até 200 faixas); para catálogo maior, propor busca no banco.
4. Nome do artista ainda não é link nas listas de faixas (só pelos playlisters e pelo curador da playlist).

## Fila
Resta o item **o) Central de recompensas (v1)**, ainda *proposto*: comente "aprovado o" na issue para eu executar.
