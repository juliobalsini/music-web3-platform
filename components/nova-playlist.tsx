"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { criarRascunho } from "@/app/playlist/actions";
import { botao } from "@/components/ui";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${botao} disabled:opacity-60`} data-testid="criar-rascunho">
      {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Plus className="size-5" aria-hidden="true" />}
      {pending ? "Criando…" : "Criar playlist"}
    </button>
  );
}

/** A chave nasce com a tela: tocar duas vezes (ou recarregar o envio) nunca cria duas playlists. */
export function NovaPlaylist() {
  const [chave] = useState(() => crypto.randomUUID());
  return (
    <form action={criarRascunho.bind(null, chave)} className="flex flex-col gap-3">
      <Botao />
    </form>
  );
}
