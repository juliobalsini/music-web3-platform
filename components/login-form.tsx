"use client";

import { LogIn, Mail, MailCheck } from "lucide-react";
import { useActionState } from "react";

import { entrarComGoogle, enviarLink, type LoginState } from "@/app/login/actions";
import { botao, campo, Mensagem } from "@/components/ui";

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, action, pendente] = useActionState<LoginState, FormData>(enviarLink, {});
  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
      <div role="status" className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-4">
        <MailCheck className="size-6 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-lg">Link enviado. Abra seu e-mail e toque nele.</p>
      </div>
      <div className="flex flex-col gap-2" aria-label="Abrir e-mail">
        <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer" className={botao}>
          <Mail className="size-5" aria-hidden="true" /> Abrir e-mail (Gmail)
        </a>
        <a href="https://outlook.live.com/mail/0/inbox" target="_blank" rel="noopener noreferrer" className={`${botao} !bg-none !bg-white/10 !text-white`}>
          <Mail className="size-5" aria-hidden="true" /> Abrir e-mail (Outlook)
        </a>
        <p className="text-sm text-white/70">O link vale por pouco tempo. Confira também o spam.</p>
      </div>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <button formAction={entrarComGoogle} formNoValidate className={`${botao} !bg-none !bg-white !text-night-900`}>
        <LogIn className="size-5" aria-hidden="true" /> Entrar com Google
      </button>
      <p aria-hidden="true" className="text-center text-sm text-white/60">ou</p>
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="seu@email.com"
        aria-label="E-mail"
        className={campo}
      />
      <button disabled={pendente} className={botao}>
        <Mail className="size-5" aria-hidden="true" /> {pendente ? "Enviando…" : "Receber link"}
      </button>
      {state.erro && <Mensagem tipo="erro">{state.erro}</Mensagem>}
    </form>
  );
}
