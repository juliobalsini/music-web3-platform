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

- **Mobile primeiro** (decisão do Julio, 2026-11-10): navegação inferior de 3 abas (Rádio,
  Explorar, Minha rádio), mini player persistente e player cheio imersivo. A home é uma
  **rádio**: cartão "No ar" (programa atual e próximo), contador "N ouvindo", filtros e listas
  densas (Descobertas, Em alta, Novidades).
- Telas: Rádio (home), Explorar, Minha rádio (substitui Métricas e Pontos), faixa, login
  (magic link), onboarding (perfil), enviar faixa, curador (playlists e programação), playlist.
- Áudio em bucket S3 (Backblaze B2) com URLs assinadas; a **cota diária gratuita** pode
  acabar, e o player precisa dizer isso sem alarme.
- Pontos, permissões e validação de escuta só no servidor.

## Capabilities and Constraints

- Idioma: português do Brasil, com público global no horizonte *(inferido: textos em
  pt-BR por ora; i18n não decidido)*.
- Sem dependência ou serviço pago. Tokens on-chain/NFTs (ciclo 6) fora do escopo.
- Next.js App Router, Tailwind, lucide-react como biblioteca de ícones.

## Brand Commitments

- Logo: gramofone do cartão da marca (`public/brand/`), "radio" branco + "On" âmbar.
- Fundo marinho `#00112A`; destaque âmbar `#E89A3C` (texto sobre âmbar sempre marinho).
- Frase: "Música para os melhores ouvintes."
- Estilo flat, pouco texto, foco no play. (Detalhes visuais em DESIGN.md.)

## Evidence on Hand

- Código das 8 telas em `app/`, componentes em `components/`.
- Não há depoimentos, números de usuários, nem catálogo real: não inventar.

## Decisões de produto do redesenho (2026-11-10)

- **Programação:** blocos curados por horário (curador cria em /curador; fuso de Brasília). Sem
  bloco ativo, o "No ar" mostra o programa da casa (faixa mais ouvida da semana).
- **Descobertas** = faixas pouco ouvidas (≤ 50 escutas válidas) escolhidas por playlisters
  (estão em playlists públicas). **Em alta** = escutas válidas dos últimos 7 dias, com
  tendência contra a semana anterior e selo NOVO (< 7 dias). **Novidades** = por data.
- **Notas do playlister:** texto curto (até 280) do curador sobre a faixa na playlist.
- **Ficha técnica** opcional no envio: compositor, intérpretes, álbum, selo. **Capa**
  opcional (JPG/PNG/WebP até 2 MB, no B2); sem capa, arte gerada do título.
- **Curtir, salvar, apoiar:** reações gravadas só no servidor. "Apoiar" é gratuito (sem
  pagamento). Compartilhar usa a Web Share API ou copia o link `/faixa/<id>`.
- **Minha rádio:** meta diária de pontos, escutas válidas, minutos, descobertas; artistas
  veem suas faixas e Enviar música; curadores, atalho às playlists.
- **Proposta (depende do Julio):** faixa bônus desbloqueada com pontos (`docs/PLANO.md`).

## Product Principles

1. **Play primeiro.** Nada entre a pessoa e o som; explicação só depois.
2. **Pouco texto.** Rótulos de uma ou duas palavras; erro diz o problema e a saída.
3. **Curadoria à frente.** Playlists de pessoas aparecem antes de qualquer métrica.
4. **Pontos são recompensa, não pressão.** Mostrar o ganho, nunca culpar quem tem zero.
5. **Honestidade operacional.** Limites (cota, diário de pontos) são ditos com calma.

## Accessibility & Inclusion

Alvo *(inferido)*: WCAG 2.2 AA. Contraste ≥ 4.5:1 no texto, alvos de toque ≥ 44 px, foco
visível por teclado, `prefers-reduced-motion` respeitado, mobile primeiro.
