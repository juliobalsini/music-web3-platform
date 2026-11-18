"use client";

import { Check, Copy, Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PainelInferior } from "@/components/ds/interativos";
import { botao } from "@/components/ui";
import { fecharAviso, instalarNativo, useInstalar, type ModoInstalar } from "@/lib/instalar-cliente";

const TITULO = "Instalar a radioOn";

/** Um passo ilustrado: número, ícone do botão que a pessoa vai procurar e o texto curto. */
function Passo({ n, icone, children }: { n: number; icone: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] p-3">
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--ds-destaque)] text-sm font-bold tabular-nums text-[var(--ds-sobre-destaque)]">
        {n}
      </span>
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--ds-surface-2)] text-[var(--ds-destaque)]">
        {icone}
      </span>
      <span className="text-pretty">{children}</span>
    </li>
  );
}

function CopiarLink() {
  const [copiado, setCopiado] = useState<boolean | null>(null);
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/`;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-[var(--ds-texto-2)]">
        Link
        <input id="instalar-link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-h-11 rounded-lg bg-[var(--ds-surface)] px-3 text-base text-[var(--ds-texto)]" />
      </label>
      <button
        type="button"
        className={botao}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
          } catch {
            (document.getElementById("instalar-link") as HTMLInputElement | null)?.select();
            setCopiado(false);
          }
        }}
      >
        {copiado ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
        {copiado ? "Link copiado" : "Copiar link"}
      </button>
      <p role="status" className="min-h-5 text-sm text-[var(--ds-texto-2)]">
        {copiado === true ? "Cole no navegador (Chrome ou Safari)." : copiado === false ? "Não deu para copiar: segure o link acima e copie." : ""}
      </p>
    </div>
  );
}

/** Conteúdo do painel de instalação para cada navegador. */
function ComoInstalar({ modo }: { modo: Exclude<ModoInstalar, "nativo"> }) {
  if (modo === "interno")
    return (
      <div data-testid="instalar-interno" className="flex flex-col gap-4">
        <p className="text-pretty">
          <strong>Abra no navegador para instalar.</strong> Toque em ⋯ e escolha &ldquo;Abrir no navegador&rdquo;, ou copie o link.
        </p>
        <CopiarLink />
      </div>
    );
  return modo === "ios" ? (
    <ol data-testid="instalar-passos" className="flex flex-col gap-2">
      <Passo n={1} icone={<Share className="size-6" />}>Toque em <strong>Compartilhar</strong> na barra do Safari</Passo>
      <Passo n={2} icone={<SquarePlus className="size-6" />}>Escolha <strong>Adicionar à Tela de Início</strong></Passo>
      <Passo n={3} icone={<Check className="size-6" />}>Toque em <strong>Adicionar</strong></Passo>
    </ol>
  ) : (
    <ol data-testid="instalar-passos" className="flex flex-col gap-2">
      <Passo n={1} icone={<EllipsisVertical className="size-6" />}>Toque no menu <strong>⋮</strong> do navegador</Passo>
      <Passo n={2} icone={<Download className="size-6" />}>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></Passo>
      <Passo n={3} icone={<Check className="size-6" />}>Toque em <strong>Instalar</strong></Passo>
    </ol>
  );
}

/** Ação de instalar: um toque abre a instalação nativa; sem ela, abre o painel com passos. */
function useAcaoInstalar() {
  const { modo, aviso } = useInstalar();
  const [painel, setPainel] = useState(false);
  const instalar = async () => {
    if (modo === "nativo" && (await instalarNativo())) return;
    setPainel(true);
  };
  const painelUi =
    modo && modo !== "nativo" ? (
      <PainelInferior aberto={painel} aoFechar={() => setPainel(false)} titulo={TITULO}>
        <ComoInstalar modo={modo} />
      </PainelInferior>
    ) : null;
  return { modo, aviso, instalar, painelUi };
}

/** Item "Instalar a radioOn" da gaveta ☰ (some com o app já instalado ou sem suporte). */
export function ItemInstalar({ className }: { className: string }) {
  const { modo, instalar, painelUi } = useAcaoInstalar();
  if (!modo) return null;
  return (
    <>
      <button type="button" onClick={instalar} data-testid="instalar-gaveta" className={`${className} w-full text-left`}>
        <Download className="size-5 text-brand" aria-hidden="true" />
        {TITULO}
      </button>
      {painelUi}
    </>
  );
}

/** Aviso discreto na Home a partir da 2ª visita; fechado, volta só depois de 14 dias. */
export function AvisoInstalar() {
  const { modo, aviso, instalar, painelUi } = useAcaoInstalar();
  if (!modo) return null;
  return (
    <>
      {aviso && (
        <section aria-label={TITULO} data-testid="instalar-aviso" className="ds-subir flex items-center gap-3 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] py-2 pl-3 pr-1">
          <Download className="size-5 shrink-0 text-[var(--ds-destaque)]" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-semibold">Tenha a radioOn na tela do celular</p>
          <button type="button" onClick={instalar} className="foco-claro min-h-11 rounded-lg bg-[var(--ds-destaque)] px-3 text-sm font-semibold text-[var(--ds-sobre-destaque)]">
            Instalar
          </button>
          <button type="button" onClick={fecharAviso} aria-label="Fechar aviso de instalação" className="foco-claro grid size-11 shrink-0 place-items-center rounded-full text-[var(--ds-texto-2)]">
            <X className="size-5" aria-hidden="true" />
          </button>
        </section>
      )}
      {painelUi}
    </>
  );
}
