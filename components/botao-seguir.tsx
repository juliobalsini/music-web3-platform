"use client";

import { Check, UserPlus } from "lucide-react";
import { useFormStatus } from "react-dom";

import { alternarSeguir } from "@/app/seguindo/actions";

function Botao({ seguindo }: { seguindo: boolean }) {
  const { pending } = useFormStatus();
  // Durante o envio mostra já o estado seguinte (resposta imediata ao toque).
  const ativo = pending ? !seguindo : seguindo;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={ativo}
      data-testid="botao-seguir"
      className={`foco-claro inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors ${
        ativo ? "bg-white/15 text-white hover:bg-white/20" : "bg-brand text-night-900 hover:bg-brand-2"
      }`}
    >
      {ativo ? <Check className="size-4" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
      {ativo ? "Seguindo" : "Seguir"}
    </button>
  );
}

/** Seguir/Seguindo no perfil. Visitante: a ação leva ao login e volta ao perfil. */
export function BotaoSeguir({ id, seguindo }: { id: string; seguindo: boolean }) {
  return (
    <form action={alternarSeguir}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="seguir" value={seguindo ? "0" : "1"} />
      <Botao seguindo={seguindo} />
    </form>
  );
}
