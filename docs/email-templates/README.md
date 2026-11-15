# Modelos de e-mail com código (issue #120)

Login por **código de 6 dígitos** em vez de link. Cada modelo tem a versão HTML (para colar no Supabase) e a versão
texto puro (`.txt`, referência e cópia para clientes sem HTML). Variável usada: `{{ .Token }}` (o código).
Identidade: fundo marinho `#00112A`, código em âmbar `#E89A3C`, logo por URL pública
(`https://radioon-ten.vercel.app/brand/logo.png`, com `alt="radioOn"` se a imagem for bloqueada).
Renderização conferida no E2E (`e2e/login-codigo-mobile-visual.spec.ts`): 360 px de largura, esquema claro e escuro,
sem rolagem lateral. O fundo já é escuro, então o modo escuro do Gmail não inverte o contraste.

## Onde colar (Supabase → Authentication → Emails → Templates)

| Aba do Supabase | Arquivo | Assunto |
| --- | --- | --- |
| Magic Link | `magic-link.html` | `Seu código radioOn: {{ .Token }}` |
| Confirm signup | `confirm-signup.html` | `Seu código radioOn: {{ .Token }}` |
| Change Email Address | `change-email.html` | `Seu código radioOn: {{ .Token }}` |

"Change Email Address" é usado quando uma sessão anônima (quem ouviu sem conta) vira conta: o app troca o e-mail da
sessão anônima e confirma com o código, mantendo pontos e histórico.

## Ajustes no painel (Authentication → Providers → Email)

- **Email OTP Expiration:** `600` segundos (o e-mail diz "Vale por 10 minutos").
- **Email OTP Length:** `6`.
- Manter "Confirm email" ligado.

## SMTP (Authentication → Emails → SMTP Settings)

Conta Gmail dedicada com verificação em 2 etapas e **senha de app** (não a senha da conta).

| Campo | Valor |
| --- | --- |
| Enable Custom SMTP | ligado |
| Sender email | o endereço do Gmail dedicado |
| Sender name | `radioOn` |
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Username | o endereço do Gmail dedicado (completo) |
| Password | a senha de app de 16 letras (sem espaços) |
| Minimum interval between emails | `60` segundos (igual ao "Reenviar em 60 s" da tela) |

**Rate limit** (Authentication → Rate Limits → "Rate limit for sending emails"): `20` por hora. Uma conta Gmail comum
envia cerca de 500 e-mails por dia; 20/h fica abaixo disso (480/dia) e evita o bloqueio da conta, que derrubaria todos
os logins. Subir só se o volume real pedir e com outro provedor gratuito.

## Ligar o código no app

Depois de colar os modelos e configurar o SMTP: o agente muda `LOGIN_CODIGO_POR_PADRAO` para `true` em
`lib/auth/codigo.ts` (ou `NEXT_PUBLIC_LOGIN_CODIGO=1` na Vercel, como sobrescrita). Até lá, o login segue pelo link.
