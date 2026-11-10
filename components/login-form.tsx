"use client";

import { Mail, MailCheck } from "lucide-react";
import { useActionState } from "react";

import { enviarLink, type LoginState } from "@/app/login/actions";
import { botao, campo, Mensagem } from "@/components/ui";

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, action, pendente] = useActionState<LoginState, FormData>(enviarLink, {});
  if (state.ok) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-4">
        <MailCheck className="size-6 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-lg">Link enviado. Abra seu e-mail e toque nele.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
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
