# Product

<!-- impeccable:product-schema 1 -->

> Registro escrito na execução autônoma de 2026-11-10, sem entrevista (não havia humano
> para responder). Todos os fatos vêm do pedido do Julio nessa execução, do `CLAUDE.md` e
> do código. Itens marcados *(inferido)* são hipóteses do agente, a confirmar.

## Platform

web

## Users

- **Ouvinte** (principal): quem chega à home e quer música agora, no celular ou no
  desktop, muitas vezes sem conta. Cansado da repetição dos grandes streamings; quer
  descobrir artistas e playlists novos. Entende a plataforma depois de dar play.
- **Artista independente:** envia faixas próprias (com confirmação de direitos), vê escutas
  e ouvintes por faixa.
- **Curador:** monta playlists públicas, que são o produto principal da descoberta.

Sem perfil (recém-logado) escolhe um dos três no onboarding. Gravadoras, produtores e
marcas estão fora do MVP.

## Product Purpose

Hub global de música independente que conecta fãs, artistas e curadores. O primeiro
contato é dar play; o entendimento da plataforma vem depois. Sucesso = alguém ouve uma
faixa em segundos, volta, e eventualmente envia música ou cura uma playlist.

## Positioning

- **Descoberta musical como diferencial**, contra a repetição dos grandes streamings.
- **Playlists de curadores** são o produto principal, não algoritmo opaco.
- **Listen-to-earn off-chain:** ouvir (≥ 30 s contínuos, validado no servidor) gera pontos.

## Operating Context

- Home com play grande na faixa mais recente, lista de faixas e ranking de playlists.
- Telas: home, login (magic link), onboarding (perfil), enviar faixa, métricas (artista),
  curador (playlists), playlist, pontos.
- Áudio em bucket S3 (Backblaze B2) com URLs assinadas; a **cota diária gratuita** pode
  acabar, e o player precisa dizer isso sem alarme.
- Pontos, permissões e validação de escuta só no servidor.

## Capabilities and Constraints

- Idioma: português do Brasil, com público global no horizonte *(inferido: textos em
  pt-BR por ora; i18n não decidido)*.
- Sem dependência ou serviço pago. Tokens on-chain/NFTs (ciclo 6) fora do escopo.
- Next.js App Router, Tailwind, lucide-react como biblioteca de ícones.

## Brand Commitments

- Logo: "radio" em branco + "On" em laranja (`#ff6b35`).
- Fundo em gradiente `#0f0f23` → `#16213e`; laranja `#ff6b35` / `#f7931e`.
- Estilo flat, pouco texto, foco no play. (Detalhes visuais em DESIGN.md.)

## Evidence on Hand

- Código das 8 telas em `app/`, componentes em `components/`.
- Não há depoimentos, números de usuários, nem catálogo real: não inventar.

## Product Principles

1. **Play primeiro.** Nada entre a pessoa e o som; explicação só depois.
2. **Pouco texto.** Rótulos de uma ou duas palavras; erro diz o problema e a saída.
3. **Curadoria à frente.** Playlists de pessoas aparecem antes de qualquer métrica.
4. **Pontos são recompensa, não pressão.** Mostrar o ganho, nunca culpar quem tem zero.
5. **Honestidade operacional.** Limites (cota, diário de pontos) são ditos com calma.

## Accessibility & Inclusion

Alvo *(inferido)*: WCAG 2.2 AA. Contraste ≥ 4.5:1 no texto, alvos de toque ≥ 44 px, foco
visível por teclado, `prefers-reduced-motion` respeitado, mobile primeiro.
