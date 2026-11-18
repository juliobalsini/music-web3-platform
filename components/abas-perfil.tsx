"use client";

import { useState, type ReactNode } from "react";

import { Abas } from "@/components/ds/interativos";

type AbaPerfil = "voce" | "artista";

/** Perfil com aba Artista (só para quem tem faixas): os painéis vêm prontos do servidor; a aba fica em `?aba=`. */
export function AbasPerfil({ inicial, voce, artista }: { inicial: AbaPerfil; voce: ReactNode; artista: ReactNode }) {
  const [aba, setAba] = useState<AbaPerfil>(inicial);
  function mudar(v: AbaPerfil) {
    setAba(v);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", v);
    window.history.replaceState(null, "", url);
  }
  return (
    <div className="flex flex-col gap-6">
      <Abas
        rotulo="Visão do perfil"
        valor={aba}
        aoMudar={mudar}
        opcoes={[
          { id: "voce", rotulo: "Você" },
          { id: "artista", rotulo: "Artista" },
        ]}
      />
      <div hidden={aba !== "voce"} data-testid="painel-voce" className="flex flex-col gap-6">{voce}</div>
      <div hidden={aba !== "artista"} data-testid="painel-artista" className="flex flex-col gap-6">{artista}</div>
    </div>
  );
}
