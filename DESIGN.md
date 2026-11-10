---
name: radioOn
description: Hub global de música independente. Dê play.
colors:
  night-900: "#0f0f23"
  night-800: "#16213e"
  brand: "#ff6b35"
  brand-2: "#f7931e"
  text: "#ffffff"
  text-muted: "rgba(255,255,255,0.72)"
  surface: "rgba(255,255,255,0.10)"
  surface-hover: "rgba(255,255,255,0.15)"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
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
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.night-900}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-play:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "56px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: radioOn

## Overview

Escuro, flat e direto: a interface é um palco escuro para o play laranja. Modo **Operate**
(app) com a home em **Experience** leve: o play grande lidera, o resto recua. Pouco texto,
rótulos curtos, ícones lucide em traço único. Sem ornamento: nenhuma sombra decorativa
além do brilho suave do botão de play, que é o único elemento "aceso".

## Colors

- **Noite** `night-900` → `night-800`: gradiente diagonal 160° fixo no `body`; é o fundo
  de tudo.
- **Laranja** `brand` (#ff6b35) e `brand-2` (#f7931e): ação principal, "On" do logo, play.
  Texto sobre laranja é `night-900` (contraste ≥ 6:1); **nunca branco** sobre laranja
  no corpo de botões de texto.
- **Branco** para texto; secundário em `text-muted` (branco ≥ 70%, ≥ 4.5:1 sobre a noite).
- **Superfícies** são branco translúcido (10% / 15% no hover) sobre o gradiente.
- Mensagens de erro/aviso usam `brand-2` com ícone e texto, nunca só cor.

## Typography

Geist (sans) para tudo; Geist Mono não é usada na UI. Escala: logo/display 3rem–4.5rem
bold, título de tela 1.5rem semibold, corpo 1rem, rótulo 0.875rem semibold. Títulos com
`text-balance`, parágrafos com `text-pretty`. Números de pontos e métricas em
`tabular-nums`.

## Layout

Coluna única centrada, `max-w-md` nas telas de tarefa, padding 24px, 64px de respiro
vertical. Cabeçalho fino com logo à esquerda e navegação à direita (quebra em linhas no
mobile). Mobile primeiro: nada depende de hover; alvos de toque ≥ 44px.

## Elevation & Depth

Plano. Profundidade só por translucidez das superfícies. Única sombra: halo suave
deslocado sob o botão de play (`0 8px 24px -8px #ff6b35`).

## Shapes

Cantos de 8px (campos, botões, linhas), 12px (cartões de grupo), círculo total para o
play. Sem bordas coloridas laterais.

## Components

- **Play:** círculo laranja em gradiente, ícone branco preenchido; 112px na home, 56px nas
  listas. Hover cresce 5%; desabilitado a 60%. Estados: parado, carregando, tocando,
  erro, limite diário.
- **Botão primário:** laranja, texto `night-900`, ícone + verbo curto ("Enviar", "Entrar").
- **Campo:** superfície translúcida, rótulo visível ou `aria-label`, foco com contorno
  laranja de 2px.
- **Linha de lista:** superfície translúcida, título truncado à esquerda, dado à direita.
- **Estado vazio:** uma frase curta + uma ação; nunca tela em branco.
- **Mensagem:** `role="alert"` para erro, `role="status"` para informação, com ícone.

## Do's and Don'ts

- Faça: um elemento aceso por tela (o play ou a ação principal).
- Faça: textos de uma linha; erro com o problema e a saída.
- Faça: respeitar `prefers-reduced-motion`.
- Não: gradiente em texto, cartões dentro de cartões, kicker acima de título.
- Não: texto branco sobre laranja; cinza sobre cor; só cor para indicar erro.
- Não: emoji no lugar de ícone; ícones fora do lucide.
- Não: mexer na paleta ou no logo sem o Julio.
