"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { salvarPreferencias } from "@/app/ajustes/actions";
import { EscolherGostos } from "@/components/escolher-gostos";
import { botao } from "@/components/ui";
import { gravarPreferencias } from "@/lib/preferencias/cliente";
import { GOSTOS_INICIO } from "@/lib/preferencias/rules";
import type { GeneroId } from "@/lib/radio/generos";

/** Primeiro acesso: até 3 gêneros; grava no aparelho (a Home lê daqui) e na conta. "Pular" segue sem gravar. */
export function PrimeirosGostos({ destino }: { destino: "/" | "/enviar" }) {
  const router = useRouter();
  const [gostos, setGostos] = useState<GeneroId[]>([]);
  const [pendente, iniciar] = useTransition();

  function continuar() {
    if (gostos.length === 0) return router.replace(destino);
    iniciar(async () => {
      gravarPreferencias({ gostos });
      // Falha na conta não trava a entrada: vale no aparelho e dá para ajustar em Configurações.
      await salvarPreferencias({ gostos }).catch(() => null);
      router.replace(destino);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--ds-raio)] bg-[var(--ds-surface)]">
        <EscolherGostos valor={gostos} aoMudar={setGostos} max={GOSTOS_INICIO} legenda="Gêneros" />
      </div>
      <button type="button" onClick={continuar} disabled={pendente} className={botao} data-testid="gostos-continuar">
        {pendente ? "Salvando…" : "Salvar e continuar"}
      </button>
      <button
        type="button"
        onClick={() => router.replace(destino)}
        disabled={pendente}
        className="min-h-11 self-center rounded-lg px-4 text-sm font-semibold text-[var(--ds-texto-2)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ds-texto)]"
        data-testid="gostos-pular"
      >
        Pular
      </button>
    </div>
  );
}
