# Relatório 2026-11-09 — navegação e estado vazio da home

PR #30 (mergeado, em produção, commit 1a29440). Fila do CONTEXTO.md estava vazia; a execução
atendeu a instrução do Julio.

## O que mudou
1. **Cabeçalho** em todas as páginas: deslogado → *Entrar*; artista → *Enviar música* e *Métricas*;
   curador → *Playlists*; logado sem perfil → *Escolher perfil*; todo logado → *Pontos*.
   Fora da home aparece o logo pequeno que volta ao início.
2. **Estado vazio útil**: "Nenhuma faixa ainda" + "Artista? Envie a primeira música e abra a rádio."
   + botão *Enviar primeira faixa* (`/enviar`).
3. **Play inerte sem faixas**: círculo apagado, sem brilho, hover nem botão (`aria-hidden`).
4. **`/enviar`** agora redireciona: deslogado → `/login`; não-artista → `/onboarding`.
5. **Testes**: unitário do menu por perfil (`tests/menu.test.ts`) e E2E do cabeçalho deslogado,
   estado vazio e redirects de `/enviar`, `/metricas`, `/pontos`, `/curador`.

## URLs para testar (base https://radioon-ten.vercel.app)
| Tela | URL | Acesso |
|---|---|---|
| Home | `/` | pública |
| Login (magic link) | `/login` | pública |
| Onboarding (escolher perfil) | `/onboarding` | logado |
| Enviar música | `/enviar` | artista |
| Métricas | `/metricas` | artista |
| Playlists (gerenciar) | `/curador` | curador |
| Playlist pública | `/playlist/<id>` | pública (links na home) |
| Pontos | `/pontos` | logado |

Fluxo sugerido: `/login` → e-mail → link → `/onboarding` → escolher *Artista* → cabeçalho mostra
*Enviar música* e *Métricas*.

## Observações
- Após o login, o callback sempre vai a `/onboarding` (não preserva o destino); fica como melhoria.
- A skill `impeccable` seguiu o caminho "Launcher unavailable" (sem PRODUCT.md/DESIGN.md).
- Não verifiquei visualmente por captura de tela; a verificação foi por E2E e HTML de produção.
- E2E local dos redirects exige `NEXT_PUBLIC_SUPABASE_URL`/`_PUBLISHABLE_KEY` (podem ser fictícias).
