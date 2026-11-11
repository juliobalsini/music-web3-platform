---
name: radioOn
description: Rádio de música independente. Música para os melhores ouvintes.
colors:
  night-900: "#00112a"
  night-800: "#062244"
  brand: "#e89a3c"
  brand-2: "#f4b562"
  text: "#ffffff"
  text-muted: "rgba(255,255,255,0.72)"
  surface: "rgba(255,255,255,0.10)"
  surface-hover: "rgba(255,255,255,0.15)"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.night-900}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-play:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.night-900}"
    rounded: "{rounded.full}"
    size: "56px"
  nav-bottom:
    backgroundColor: "{colors.night-900}"
    textColor: "{colors.text-muted}"
    height: "64px"
  row-track:
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 4px"
---

# Design System: radioOn

> Redesenho mobile-first de 2026-11-10 (pedido do Julio). Substitui a versão laranja/gradiente.
> Fonte da identidade: cartão da marca (`public/brand/cartao-marca.png`). A imagem de 2012 não
> existe no repositório (ver "Decisões"); o redesenho não replica nenhum site antigo.

## Overview

Uma rádio no bolso. Modo **Operate** (app) com o player em **Experience** (tela cheia):
interface densa e escaneável nas listas, imersiva só no player cheio. Marinho profundo,
um único destaque âmbar, grão sutil e brilho ambiente na cor da faixa que toca. Pouco
texto, ícones lucide em traço único, o gramofone como marca.

## Colors

- **Marinho** `night-900` (#00112A, do cartão da marca): fundo de tudo e da navegação
  inferior. `night-800` (#062244) é a base do degradê vertical e das superfícies elevadas
  (mini player).
- **Âmbar** `brand` (#E89A3C, do cartão) e `brand-2` (#F4B562, versão clara para degradê e
  hover): ação principal, play, aba ativa, "On" do logo, barras de progresso.
  **Texto sobre âmbar é sempre `night-900`** (≈ 8:1). Nunca branco sobre âmbar.
- **Branco** para texto; secundário `text-muted` (≥ 70%, ≥ 4.5:1 sobre o marinho).
- **Ambiente:** `--ambiente` (no `body`) recebe a cor dominante da arte da faixa atual
  (paleta fixa derivada do título, ver `capaGerada`); um brilho radial a 26% no topo da tela
  e no player cheio. A base marinho + âmbar nunca é substituída, só tingida.
- **Grão:** ruído SVG embutido a 7% em `overlay`, sobre toda a tela (`body::after`).
- Mensagens de erro/aviso usam `brand-2` com ícone e texto, nunca só cor.

## Typography

Geist para tudo (a marca vive no logo-imagem). Escala mobile: título de tela 1.5rem bold,
título de seção 1.125rem bold, corpo 1rem, metadados 0.875rem / 0.75rem semibold.
Títulos com `text-balance`, parágrafos com `text-pretty`; números em `tabular-nums`.
Nomes longos truncam em uma linha; títulos de "continue ouvindo" em até 2.

## Layout

Coluna única `max-w-md` centrada, padding 16px. Estrutura fixa: cabeçalho fino (logo do
gramofone + Entrar) → conteúdo → **mini player** (acima da navegação) → **navegação
inferior de 3 abas** (Rádio, Explorar, Perfil; 64px + área segura). O conteúdo reserva
espaço embaixo para os dois. Mobile primeiro: nada depende de hover; alvos ≥ 44px.

Rádio (de cima para baixo): selo **No ar · N ouvindo** → faixa de **stories** (círculos por autor,
só com stories ativos) → filtros por estado local (Tudo, Faixas, Álbuns*, Playlists, Stories*;
*só com conteúdo) → cartão **No ar** (título em até 2 linhas; Rádio radioOn ou programa do horário) →
carrossel "Continue ouvindo" (só com histórico) → abas Descobertas / Em alta / Novidades (troca
instantânea e gesto de arrastar; nunca vazias, com legenda honesta) → Álbuns → Playlists da semana.
Playlisters ficam no Explorar (carrosséis visuais, artistas, gêneros e climas).

## Elevation & Depth

Plano. Profundidade por translucidez e sombras com deslocamento e desfoque reais:
play `0 6px 14px -6px` âmbar, mini player `0 8px 20px -6px` preto, disco `0 24px 40px -16px`
preto. Nenhum halo sem deslocamento.

## Shapes

8px (campos, botões, linhas), 12px (cartões e mini player), círculo total para play,
playlisters e o disco do player cheio. Capas de lista: 8px (quadradas, 48px).

## Motion

Um momento autoral: o **vinil girando** no player cheio (9 s por volta, só enquanto toca;
pausa congela). Secundários, curtos e discretos: equalizador de 3 barras na faixa tocando,
pulsar do ponto "No ar", fade da abertura (1,4 s, uma vez por sessão, nunca bloqueia toque).
`prefers-reduced-motion` zera tudo.

## Components

- **Play:** círculo âmbar em degradê, ícone `night-900` preenchido; 80px no player cheio e
  na página da faixa, 56px no cartão No ar, 44px no mini player.
- **Cartão No ar:** capa 80px, programa atual (horário), curador, nota do playlister,
  play, próxima, aviso "Ouça 30s e ganhe pontos" e "A seguir". Contador "· N ouvindo" só
  aparece com ouvintes reais nos últimos 3 min.
- **Lista de faixas (densa):** capa 48px, título + artista, duração, escutas e curtidas;
  equalizador e título âmbar na faixa atual; no ranking, posição e tendência (ícone
  `ChevronUp`/`ChevronDown`/`Minus` ou selo NOVO, sempre com texto para leitor de tela).
- **Mini player:** 56px, capa, título/artista, play e próxima; barra de progresso de 2px;
  toque no corpo abre o player cheio.
- **Player cheio:** `<dialog>` modal (foco preso, Esc fecha). Capa grande sobre disco de
  vinil, onda de progresso (56 barras, `<input range>` acessível por cima), controles,
  Curtir · Salvar · Apoiar · Compartilhar, notas do playlister e **ficha técnica** em
  `<details>` (compositor, intérpretes, álbum, selo; só campos preenchidos).
- **Capa:** imagem do bucket ou **arte gerada** do título (SVG): par de cores (claro/escuro)
  derivado do hash, textura, anéis e um glifo; também no rótulo do vinil. Faixas ficam distintas.
- **Navegação inferior (Rádio, Explorar, Perfil):** 3 abas, ícone + rótulo de 12px, aba ativa em âmbar com
  `aria-current`.
- **Botão primário, campo, mensagem, estado vazio:** como antes, com os novos tokens.

## Decisões

1. **Paleta do cartão:** o PNG tem marinho real `#000e23`; usamos `#00112A` conforme o
   pedido (diferença imperceptível). O âmbar `#E89A3C` foi mantido.
2. **Logo:** `public/brand/logo.png` e `gramofone.png` recortados do cartão com alfa
   derivado da distância ao marinho (`scripts/brand/recortar-logo.mjs`, reexecutável);
   ícones do app em `app/icon.png` e `app/apple-icon.png`.
3. **Referências:** o `.png` é o cartão da marca; o `.jpeg` é um print do **Audius** (não o
   site de 2012). Guardado em `public/brand/referencia-audius.jpeg`; serviu só de
   referência de densidade de lista (rank, capa pequena, plays, curtidas). Sem o site de
   2012 em mãos, notas do playlister e ficha técnica seguiram a descrição do pedido.
4. **Tendência ▲▼:** ícones lucide, não glifos Unicode (regra do skill).
5. **"Apoiar artista"** é um gesto gratuito (reação `support`), sem pagamento (regra 6).
6. **Sem kicker, sem número gigante:** "Minha rádio" usa meta diária em barra + lista de
   dados, não um painel de métricas em destaque.

## Do's and Don'ts

- Faça: um elemento aceso por tela (play ou ação principal).
- Faça: textos de uma linha; erro com o problema e a saída.
- Faça: respeitar `prefers-reduced-motion`; manter alvos ≥ 44px.
- Não: gradiente em texto, cartões dentro de cartões, kicker acima de título.
- Não: texto branco sobre âmbar; cinza sobre cor; só cor para indicar estado.
- Não: emoji ou glifo no lugar de ícone; ícones fora do lucide.
- Não: mexer na paleta ou no logo sem o Julio.
