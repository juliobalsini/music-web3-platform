"use client";

import { CircleHelp, Ellipsis, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Abas segmentadas (controladas). Teclas ← → movem a seleção; alvo mínimo 44 px. */
export function Abas<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
}: {
  opcoes: readonly { id: T; rotulo: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
}) {
  const mover = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    aoMudar(opcoes[(i + d + opcoes.length) % opcoes.length].id);
  };
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex gap-1 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] p-1">
      {opcoes.map((o, i) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          tabIndex={valor === o.id ? 0 : -1}
          onClick={() => aoMudar(o.id)}
          onKeyDown={(e) => mover(e, i)}
          className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 ${
            valor === o.id ? "bg-[var(--ds-destaque)] text-[var(--ds-sobre-destaque)]" : "text-[var(--ds-texto-2)]"
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Painel inferior (bottom sheet): diálogo modal, fecha com Esc, toque fora ou no ×. */
export function PainelInferior({ aberto, aoFechar, titulo, children }: { aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className="ds-subir m-0 mt-auto w-full max-w-none rounded-t-2xl bg-[var(--ds-bg)] p-0 text-[var(--ds-texto)] backdrop:bg-black/60"
    >
      <div className="mx-auto flex max-w-md flex-col gap-4 p-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="grid size-11 place-items-center rounded-full bg-[var(--ds-surface)]">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export type ItemMenu = { rotulo: string; aoEscolher: () => void; perigo?: boolean };

/** Menu ⋯: botão com 44 px, lista de ações; fecha com Esc, toque fora ou ao escolher. */
export function MenuMais({ itens, rotulo = "Mais ações" }: { itens: ItemMenu[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  return (
    <div ref={raiz} className="relative">
      <button type="button" aria-label={rotulo} aria-haspopup="menu" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((v) => !v)} className="grid size-11 place-items-center rounded-full text-[var(--ds-texto-2)]">
        <Ellipsis className="size-5" aria-hidden="true" />
      </button>
      {aberto && (
        <ul id={id} role="menu" className="absolute right-0 z-30 mt-1 min-w-44 rounded-[var(--ds-raio)] border border-[var(--ds-borda)] bg-[var(--ds-bg)] p-1 shadow-lg">
          {itens.map((i) => (
            <li key={i.rotulo} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAberto(false);
                  i.aoEscolher();
                }}
                className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left hover:bg-[var(--ds-surface)] ${i.perigo ? "text-[var(--ds-erro)]" : "text-[var(--ds-texto)]"}`}
              >
                {i.rotulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Ajuda que abre ao tocar: textos explicativos longos saem da tela e ficam atrás deste botão. */
export function Ajuda({ titulo = "Ajuda", children }: { titulo?: string; children: ReactNode }) {
  return (
    <details className="group rounded-[var(--ds-raio)] bg-[var(--ds-surface)] px-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--ds-texto-2)]">
        <CircleHelp className="size-4" aria-hidden="true" />
        {titulo}
      </summary>
      <div className="pb-3 text-pretty text-sm text-[var(--ds-texto-2)]">{children}</div>
    </details>
  );
}
