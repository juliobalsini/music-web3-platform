"use client";

import { RotateCw } from "lucide-react";

import { botao, Mensagem, Tela } from "@/components/ui";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Tela centro>
      <h1 className="text-xl font-semibold text-balance">Algo deu errado</h1>
      <Mensagem tipo="erro">Não foi possível carregar esta página. Tente de novo.</Mensagem>
      <button type="button" onClick={reset} className={`${botao} self-start`}>
        <RotateCw className="size-5" aria-hidden="true" /> Tentar de novo
      </button>
    </Tela>
  );
}
