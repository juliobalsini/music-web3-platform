"use client";

import { Check, Circle, Share2 } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { ChipStatus } from "@/components/ds";
import { progressoTrilha, type Passo, type PassoId } from "@/lib/artista/trilha";
import { assinarCompartilhou, jaCompartilhou, marcarCompartilhou } from "@/lib/artista/trilha-cliente";

const DESTINOS: Partial<Record<PassoId, { href: string; rotulo: string }>> = {
  perfil: { href: "/ajustes", rotulo: "Completar" },
  segunda: { href: "/enviar", rotulo: "Enviar" },
  story: { href: "/stories/novo", rotulo: "Publicar" },
  playlist: { href: "/explorar", rotulo: "Ver playlisters" },
};

const acao = "foco-claro inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[var(--ds-destaque)] hover:bg-[var(--ds-surface-2)]";

/**
 * Trilha do artista (#147): 5 passos curtos com progresso; cada passo feito vira um selo.
 * Completa, a trilha some e fica um botão para reabrir.
 */
export function TrilhaArtista({ passos: doServidor, faixa }: { passos: Passo[]; faixa: { id: string; title: string } | null }) {
  const compartilhou = useSyncExternalStore(assinarCompartilhou, jaCompartilhou, () => false);
  const passos = doServidor.map((p) => (p.id === "compartilhar" ? { ...p, feito: p.feito || compartilhou } : p));
  const { feitos, total, completa } = progressoTrilha(passos);
  const [aberta, setAberta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function compartilhar() {
    if (!faixa) return;
    const url = `${location.origin}/faixa/${faixa.id}`;
    const dados: ShareData = { title: faixa.title, url };
    try {
      if (navigator.share) {
        try {
          const r = await fetch(`/api/tracks/${faixa.id}/og`);
          if (r.ok) {
            const arquivo = new File([await r.blob()], `${faixa.title}.png`, { type: "image/png" });
            if (navigator.canShare?.({ files: [arquivo] })) dados.files = [arquivo];
          }
        } catch {
          /* segue só com o link */
        }
        await navigator.share(dados);
      } else {
        await navigator.clipboard.writeText(url);
        setAviso("Link copiado.");
      }
      marcarCompartilhou();
    } catch {
      /* cancelado: o passo continua aberto */
    }
  }

  if (completa && !aberta) {
    return (
      <button type="button" onClick={() => setAberta(true)} className={`${acao} self-start px-0`} data-testid="reabrir-trilha">
        <Check className="size-4" aria-hidden="true" /> Trilha do artista completa · ver selos
      </button>
    );
  }

  return (
    <section aria-labelledby="trilha-titulo" data-testid="trilha-artista" className="flex flex-col gap-3 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="trilha-titulo" className="text-lg font-bold">Primeiros passos</h2>
        <p className="text-sm text-[var(--ds-texto-2)] tabular-nums">{feitos} de {total}</p>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso da trilha"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={feitos}
        className="h-2 overflow-hidden rounded-full bg-[var(--ds-surface-2)]"
      >
        <div className="ds-barra h-full rounded-full bg-[var(--ds-destaque)]" style={{ width: `${(feitos / total) * 100}%` }} />
      </div>
      <ol className="flex flex-col">
        {passos.map((p) => {
          const destino = DESTINOS[p.id];
          return (
            <li key={p.id} className="flex min-h-12 items-center gap-3 border-b border-[var(--ds-borda)] py-1 last:border-b-0">
              {p.feito ? (
                <Check className="size-5 shrink-0 text-[var(--ds-ok)]" aria-hidden="true" />
              ) : (
                <Circle className="size-5 shrink-0 text-[var(--ds-texto-2)]" aria-hidden="true" />
              )}
              <span className={`min-w-0 flex-1 text-pretty ${p.feito ? "text-[var(--ds-texto-2)]" : ""}`}>
                {p.titulo}
                <span className="sr-only">{p.feito ? " (feito)" : " (a fazer)"}</span>
              </span>
              {p.feito ? (
                <ChipStatus tom="ok">{p.selo}</ChipStatus>
              ) : p.id === "compartilhar" ? (
                faixa && (
                  <button type="button" onClick={() => void compartilhar()} className={acao}>
                    <Share2 className="size-4" aria-hidden="true" /> Compartilhar
                  </button>
                )
              ) : (
                destino && <Link href={destino.href} className={acao}>{destino.rotulo}</Link>
              )}
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="text-sm text-[var(--ds-texto-2)] empty:hidden">{aviso}</p>
      {completa && (
        <button type="button" onClick={() => setAberta(false)} className={`${acao} self-start px-0`}>
          Fechar trilha
        </button>
      )}
    </section>
  );
}
