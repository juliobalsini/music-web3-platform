# Decisões — índice

Uma linha por decisão (número e título). O texto completo está em `docs/historico/decisoes.md`:
ler só a decisão do tema da tarefa (`grep -n '^<n>\.' docs/historico/decisoes.md`).
Nova decisão: texto completo no fim do histórico e uma linha aqui. Limite deste arquivo: 10 KB.

1. Protótipo arquivado em legacy-vite
2. Next.js 16 (App Router) com Turbopack, pnpm via corepack, No…
3. Chaves Supabase novas e legadas
4. Três clientes Supabase
5. Escrita restrita ao servidor por desenho de RLS + GRANTs
6. points_ledger append-only em três camadas
7. Faixa só pode ser published com rights_confirmed = true
8. Testes com node --test
9. vercel.json com regions: ["pdx1"]
10. Limite diário de pontos “configurável”
11. Migration aplicada sem supabase link
12. Projeto Vercel radioon
13. Agente agendado no GitHub Actions
14. PAT do agente = fine-grained do Julio
15. Aprovação das travas por ambiente com revisor
16. Ruleset na main
17. Scripts de trava rodam da main
18. Allowlist de SQL
19. SUPABASE_DB_URL como secret de ambiente
20. .claude/settings.json versionado
21. Skill impeccable vendorizada
22. Backblaze B2 no lugar do R2
23. Limites diários da conta gratuita
24. Player econômico em requisições
25. CORS do bucket
26. Ranking de playlists
27. Heartbeats
28. Home "play primeiro"
29. Métricas básicas
30. Numeração da fase
31. Destino pós-login em cookie
32. Autoplanejamento
33. Identidade do cartão da marca
34. Referências do pedido
35. Player único no layout
36. Migration aditiva 20261110000000
37. Capa no B2
38. Rádio
39. Apoiar artista = gesto gratuito
40. Minha rádio substitui /metricas e /pontos
41. Bug "nada toca" (execução 2026-11-10, prioridade máxima)
42. Catálogo de demonstração
43. Envio no celular
44. Login
45. PWA
46. Curadoria de playlists (item m)
47. Ranking de playlists por escutas (item n; substitui a decisã…
48. Visitante ouve sem entrar, com sessão anônima do Supabase
49. Teto de pontos do anônimo
50. Vínculo ao entrar
51. /privacidade e /termos
52. Auditoria para anônimos (item s)
53. Reação "apoiar" exige conta
54. Testes de RLS rodam num Postgres real
55. Rádio no cliente
56. Capa gerada em SVG
57. Rádio radioOn
58. Open Graph
59. Gênero/clima
60. Playlist para qualquer conta
61. Álbum/EP
62. Stories
63. Perfil oficial radioOn é virtual
64. Seleção radioOn é calculada, não gravada
65. Clima do horário (Brasília)
66. "N ouvindo" inclui o próprio ouvinte
67. (revisada em 2026-11-12, 2ª instrução do Julio)
68. Continue ouvindo no aparelho (localStorage)
69. Vestígio de Cloudflare/R2
70. AAC 192 kbps só para origens sem perda ou lossy ≥ 256 kbps
71. Loudness aplicada no player, nunca no arquivo
72. Migration aditiva sem UPDATE
73. Proxy workers.dev com cache em KV
74. NEXT_PUBLIC_AUDIO_BASE_URL
75. Workflows
76. Licença proprietária (2026-11-12, aprovada pelo Julio)
77. Vitrine
78. Causa real do bloqueio em .github/
79. Autonomia de planejamento e segurança
80. Auditoria de segurança
81. Teste visual mobile
82. URL do Worker como padrão no código (2026-11-12)
83. Rollback do proxy por padrão (2026-11-12)
84. Proxy restrito e transcodificar sem secret novo
85. Verificação de segurança dos workflows no gate
86. worker-deploy deriva o endpoint do B2
87. Stories v2 (issue #113, 2026-11-13)
88. Interação nos stories (fase 2)
89. Navegação e conta v2 — fatia 1 (issue #116)
90. Ícones de compartilhar (issue #116, item 9)
91. Playlists v2, fatia 1 (issue #122)
92. Base visual e envios (issue #124)
93. Proxy de áudio religado (issue #101, 2026-11-14)
94. Modelo operacional v2 (issue #103, 2026-11-14)
95. Seguir perfis (issue #116, item 4 e parte do 11, 2026-11-14)
96. Logo rápida (issue #116, item 2, 2026-11-14)
97. Login contextual (issue #116, item 5, 2026-11-14)
98. Meus envios: editar, apagar lógico e desfazer por 30 dias
99. Configurações, fatia 1
100. Uso do agente distribuído ao longo do dia
101. Stories reposicionados e story de bio automático
102. Login v2, fatia 1 — código de 6 dígitos
103. Login v2, fatia 2 — Google oficial, One Tap, painel único e…
104. Playlists v2, fase 1, fatia 2 — editor
105. Playlists v2, fase 1, fatia 3 — capa própria com recorte
106. Curadoria por faixa no editor da playlist
107. Artista ativado no 1º envio
108. "Sua faixa está em N playlists"
109. Mini editor de capa (#122, fase 2, item 4; 2026-11-16)
110. Hub de playlists (#122, fase 2, item 1; 2026-11-16)
111. Curadores oficiais (#122, fase 2, item 2; 2026-11-16)
112. Tema da semana (#122, fase 2, item 3; 2026-11-16)
113. Skills de qualidade e acessibilidade automática
114. Lighthouse CI como aviso, no app compilado do CI
115. Eficiência do agente: índice de decisões, contexto ≤ 8 KB, gate rápido p/ .md
116. Configurações > Aparência: destaque, texto maior, reduzir animações (sem tema claro)
117. Tema claro/automático: utilitários `tinta`/`fundo`/`sobre-destaque`, telas imersivas `.tema-escuro`, logo claro
118. Equalizador: 4 predefinições fechadas (3 bandas Biquad), só com áudio do proxy (CORS)
