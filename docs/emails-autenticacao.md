# E-mails de autenticação (pt-BR) — para colar no Supabase

Onde colar: Supabase → **Authentication → Email Templates** (um modelo por aba).
Variáveis do Supabase usadas: `{{ .ConfirmationURL }}` (link) e `{{ .Email }}`.
Fundo marinho `#00112A`, botão âmbar `#E89A3C` com texto marinho (contraste ≥ 8:1).
Os e-mails não carregam imagem remota: o logo é texto, para não depender de domínio.

## 1. Confirmação de cadastro ("Confirm signup")

**Assunto:** `Confirme seu e-mail no radioOn`

```html
<div style="background:#00112A;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;color:#ffffff;">
    <p style="font-size:32px;font-weight:700;margin:0 0 4px;">radio<span style="color:#E89A3C;">On</span></p>
    <p style="color:#E89A3C;margin:0 0 24px;">Música para os melhores ouvintes.</p>
    <h1 style="font-size:20px;margin:0 0 12px;">Confirme seu e-mail</h1>
    <p style="line-height:1.5;margin:0 0 24px;">Toque no botão para ativar sua conta e dar play.</p>
    <p style="margin:0 0 24px;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E89A3C;color:#00112A;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;">Confirmar e entrar</a>
    </p>
    <p style="font-size:14px;line-height:1.5;color:#c9d3e3;margin:0 0 8px;">Se o botão não abrir, copie este endereço no navegador:<br><a href="{{ .ConfirmationURL }}" style="color:#E89A3C;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
    <p style="font-size:14px;color:#c9d3e3;margin:0;">Não foi você? Ignore este e-mail: nada será criado.</p>
  </div>
</div>
```

## 2. Link de acesso ("Magic Link")

**Assunto:** `Seu link de acesso ao radioOn`

```html
<div style="background:#00112A;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;color:#ffffff;">
    <p style="font-size:32px;font-weight:700;margin:0 0 4px;">radio<span style="color:#E89A3C;">On</span></p>
    <p style="color:#E89A3C;margin:0 0 24px;">Música para os melhores ouvintes.</p>
    <h1 style="font-size:20px;margin:0 0 12px;">Entrar no radioOn</h1>
    <p style="line-height:1.5;margin:0 0 24px;">Toque no botão para entrar. Sem senha. O link vale por pouco tempo e só funciona uma vez.</p>
    <p style="margin:0 0 24px;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#E89A3C;color:#00112A;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;">Entrar</a>
    </p>
    <p style="font-size:14px;line-height:1.5;color:#c9d3e3;margin:0 0 8px;">Se o botão não abrir, copie este endereço no navegador:<br><a href="{{ .ConfirmationURL }}" style="color:#E89A3C;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
    <p style="font-size:14px;color:#c9d3e3;margin:0;">Não pediu este acesso? Ignore este e-mail.</p>
  </div>
</div>
```

## Lembrete (já pendente no CONTEXTO.md)

Site URL e Redirect URLs com `https://radioon-ten.vercel.app/auth/callback`.
