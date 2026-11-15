"use client";

import { Check, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

import { alternarSeguir } from "@/app/seguindo/actions";
import { useLoginContextual } from "@/components/login-contextual";

/**
 * Seguir/Seguindo dentro do story de bio. O estado muda na hora (o visualizador não recarrega a página);
 * visitante abre o painel de login e volta ao perfil do artista. Quem decide é o servidor (alternarSeguir).
 */
export function SeguirNoStory({ id, seguindo: inicial }: { id: string; seguindo: boolean }) {
  const { conta, pedirLogin } = useLoginContextual();
  const [seguindo, setSeguindo] = useState(inicial);
  const [enviando, iniciar] = useTransition();

  function alternar() {
    if (conta === false) {
      pedirLogin("Entre para seguir artistas e ver as novidades deles.", `/perfil/${id}`);
      return;
    }
    const novo = !seguindo;
    setSeguindo(novo);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("seguir", novo ? "1" : "0");
    iniciar(async () => {
      try {
        await alternarSeguir(fd);
      } catch {
        setSeguindo(!novo);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={enviando}
      aria-pressed={seguindo}
      data-testid="botao-seguir"
      className={`foco-claro inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors ${
        seguindo ? "bg-white/15 text-white hover:bg-white/20" : "bg-white text-night-900 hover:bg-white/90"
      }`}
    >
      {seguindo ? <Check className="size-4" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
      {seguindo ? "Seguindo" : "Seguir"}
    </button>
  );
}
