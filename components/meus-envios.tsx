"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Abas } from "@/components/ds/interativos";
import { ABAS_ENVIOS, type AbaEnvios } from "@/lib/envios/rules";

/**
 * Abas de Meus envios: Faixas · Álbuns · Playlists · Stories. Os painéis vêm prontos do servidor
 * (composição); aqui só se escolhe qual aparece. A aba fica na URL (`?aba=`) para voltar ao mesmo lugar.
 */
export function AbasEnvios({ inicial, paineis }: { inicial: AbaEnvios; paineis: Record<AbaEnvios, { rotulo: string; conteudo: ReactNode }> }) {
  const [aba, setAba] = useState<AbaEnvios>(inicial);
  function mudar(v: AbaEnvios) {
    setAba(v);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", v);
    url.searchParams.delete("apagado");
    window.history.replaceState(null, "", url);
  }
  return (
    <div className="flex flex-col gap-4">
      <Abas rotulo="Tipo de envio" valor={aba} aoMudar={mudar} opcoes={ABAS_ENVIOS.map((id) => ({ id, rotulo: paineis[id].rotulo }))} />
      {ABAS_ENVIOS.map((id) => (
        <section key={id} aria-label={paineis[id].rotulo} hidden={id !== aba} data-testid={`painel-${id}`} className="flex flex-col gap-3">
          {paineis[id].conteudo}
        </section>
      ))}
    </div>
  );
}

/**
 * Enquanto houver faixa preparando áudio, atualiza a lista a cada 15 s (no máx. 20 vezes, só com a aba visível).
 * Cada atualização reconcilia no servidor: a faixa vira Publicada ou Falhou sem recarregar a página.
 */
export function AtualizarEnquantoPrepara({ ativo }: { ativo: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!ativo) return;
    let vezes = 0;
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (++vezes > 20) return window.clearInterval(t);
      router.refresh();
    }, 15000);
    return () => window.clearInterval(t);
  }, [ativo, router]);
  return null;
}
