# Design system do radioOn

Fonte: `app/globals.css` (tokens `--ds-*`), `components/ds/index.tsx` (sem estado, servidor ou cliente),
`components/ds/interativos.tsx` (com estado), `lib/ds.ts` (funções puras testadas). Demonstração: seção
"Design system" em `docs/prototipo-mobile.html`.

**Regra:** toda tela nova ou alterada usa estes componentes; texto explicativo longo vira `Ajuda` (abre ao tocar).

## Tokens
- **Cor** (escuro padrão; `data-tema="claro"` no `<html>` troca): `--ds-bg`, `--ds-surface`, `--ds-surface-2`, `--ds-texto`,
  `--ds-texto-2`, `--ds-borda`, `--ds-destaque`, `--ds-destaque-2`, `--ds-sobre-destaque`, `--ds-ok`, `--ds-erro`, `--ds-aviso`.
  **Destaque** (`data-destaque="azul|verde|rosa"`; âmbar é o padrão) — usado pela futura tela Configurações. No tema claro os destaques
  são escurecidos para manter contraste AA (≥ 4,5:1 do texto sobre o destaque e do destaque sobre o fundo).
- **Tipografia:** Geist (já carregada); título de tela `text-2xl font-semibold`, seção `text-lg font-bold`, corpo 16 px, apoio `text-sm`
  em `--ds-texto-2`; números com `tabular-nums`.
- **Espaçamento:** `--ds-esp-1…6` (4, 8, 12, 16, 24 px); raio `--ds-raio` (12 px); alvo de toque ≥ 44 px (`min-h-11`).
- **Movimento:** `--ds-mov-rapido` 150 ms, `--ds-mov` 250 ms, `--ds-ease` (ease-out exponencial). `prefers-reduced-motion` zera
  animações e transições globalmente (regra em `globals.css`).

## Componentes
| Componente | Uso |
|---|---|
| `CartaoCapa` | faixa, álbum, playlist: capa + título + apoio + ação (`horizontal` para listas) |
| `ChipStatus` | Publicada / Em processamento / Falhou; texto sempre presente, cor só reforça |
| `Abas` | abas segmentadas (radiogroup, setas ← →) |
| `AnelProgresso` | progresso 0–1 em SVG (`role=progressbar`) |
| `GraficoCircular` | rosca em SVG com legenda textual |
| `BarrasLeves` | barras horizontais em divs, valor em texto |
| `LinhaEstatistica` | rótulo + número em destaque |
| `EstadoVazio` | ilustração, frase curta e uma chamada para ação |
| `Esqueleto` | carregamento (contêiner com `aria-busy`) |
| `PainelInferior` | bottom sheet em `<dialog>` modal (Esc, toque fora, ×) |
| `MenuMais` | menu ⋯ (Esc, toque fora, `role=menu`) |
| `Ajuda` | `<details>` que guarda o texto longo |

Acessibilidade: contraste AA, foco visível global, nenhum estado só por cor, sem bibliotecas de gráfico (SVG/divs).

## Abertura (splash) no Android
- Ícones `any` e `maskable` são arquivos separados (`public/icons/`), gerados por `node scripts/brand/gerar-icones.mjs`, que **falha** se o
  conteúdo sair do círculo central de 80% (raio 40%). Medido: `any` 35,0% e `maskable` 32,7% do lado.
- `background_color` e `theme_color` = `#00112a` (mesmo marinho do app); a abertura interna (`components/abertura.tsx`) usa o mesmo fundo e o
  logo centrado a 64% de 12 rem (a mesma proporção do ícone `any`), para a transição splash → app ser contínua.
- Teste: emulação Android (DevTools → Android, Application → Manifest mostra os dois ícones) e `pnpm e2e` cobre a abertura.
  Não há dispositivo real no agente; **conferir no celular** após o deploy (reinstalar o PWA para o Android reler o manifest).
