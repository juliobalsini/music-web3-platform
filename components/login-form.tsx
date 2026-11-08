"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";

import { enviarLink, type LoginState } from "@/app/login/actions";

export function LoginForm() {
  const [state, action, pendente] = useActionState<LoginState, FormData>(enviarLink, {});
  if (state.ok) {
    return <p role="status" className="text-lg">Link enviado. Abra seu e-mail e toque nele para entrar.</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="seu@email.com"
        aria-label="E-mail"
        className="w-full rounded-lg bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus-visible:outline-2 focus-visible:outline-brand"
      />
      <button
        disabled={pendente}
        className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        <Mail className="size-5" aria-hidden="true" /> {pendente ? "Enviando…" : "Receber link"}
      </button>
      {state.erro && <p role="alert" className="text-sm text-brand-2">{state.erro}</p>}
    </form>
  );
}
