# Ícones do PWA e tela de abertura no Android — 2026-11-11

**Causa:** a tela de abertura do app instalado é gerada pelo Android a partir do manifest
(ícone + `background_color`). O `/icon.png` antigo era um recorte do logo (só o gramofone e
")On") e era usado também como "maskable", então a máscara cortava ainda mais.

**Correção**
- `public/icons/icon-any-{192,512}.png`: logo inteiro (~84% da largura) sobre marinho `#00112A`.
- `public/icons/icon-maskable-{192,512}.png`: logo em ~60% do centro, margem marinho `#00112A`.
- `app/manifest.ts` aponta para os quatro arquivos; `background_color` e `theme_color` = `#00112a`.
- `app/icon.png` (favicon) e `app/apple-icon.png` regenerados com o logo inteiro.
- Gerador reprodutível: `node scripts/brand/gerar-icones.mjs`.

**Validação da zona segura (maskable)** — o script exige todo pixel de conteúdo dentro do
círculo de raio 40% do lado (zona segura do Android):

| Arquivo | Raio do conteúdo | Resultado |
|---|---|---|
| icon-maskable-192.png | 32,6% | OK (limite 40%) |
| icon-maskable-512.png | 32,7% | OK (limite 40%) |

**⚠️ Ação do Julio:** o Android guarda o ícone e a tela de abertura na instalação.
**Desinstale o app e reinstale** (Chrome → Instalar app) para ver a mudança.
