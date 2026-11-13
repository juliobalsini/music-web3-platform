import type { ReactNode } from "react";

import { fatiasDoGrafico, type FatiaGrafico } from "@/lib/ds";

/**
 * Design system do radioOn (docs/design-system.md): componentes base sem estado, usáveis em servidor.
 * Cores só por tokens `--ds-*`; movimento respeita prefers-reduced-motion (regra global em globals.css).
 * Os com estado (abas, painel inferior, menu ⋯, ajuda) estão em `./interativos`.
 */

/** Card com capa: capa quadrada em cima (ou à esquerda, `horizontal`), título e linha de apoio. */
export function CartaoCapa({
  capa,
  titulo,
  apoio,
  acao,
  horizontal = false,
}: {
  capa: ReactNode;
  titulo: string;
  apoio?: ReactNode;
  acao?: ReactNode;
  horizontal?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] p-3 ${horizontal ? "flex-row items-center" : "flex-col"}`}
    >
      <div className={horizontal ? "shrink-0" : "w-full [&>*]:aspect-square [&>*]:h-auto [&>*]:w-full"}>{capa}</div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--ds-texto)]">{titulo}</p>
          {apoio && <p className="truncate text-sm text-[var(--ds-texto-2)]">{apoio}</p>}
        </div>
        {acao}
      </div>
    </div>
  );
}

export type TomChip = "neutro" | "ok" | "aviso" | "erro" | "destaque";
const CORES_CHIP: Record<TomChip, string> = {
  neutro: "text-[var(--ds-texto-2)]",
  ok: "text-[var(--ds-ok)]",
  aviso: "text-[var(--ds-aviso)]",
  erro: "text-[var(--ds-erro)]",
  destaque: "text-[var(--ds-destaque)]",
};
/** Chip de status. O texto (e o ícone opcional) carrega o significado; a cor só reforça. */
export function ChipStatus({ tom = "neutro", icone, children }: { tom?: TomChip; icone?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 rounded-full border border-[var(--ds-borda)] px-2.5 text-xs font-semibold ${CORES_CHIP[tom]}`}
    >
      {icone}
      {children}
    </span>
  );
}

const limitar = (n: number, min = 0, max = 1) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);

/** Anel de progresso (SVG). `valor` de 0 a 1. */
export function AnelProgresso({
  valor,
  tamanho = 64,
  espessura = 6,
  rotulo,
  children,
}: {
  valor: number;
  tamanho?: number;
  espessura?: number;
  rotulo: string;
  children?: ReactNode;
}) {
  const v = limitar(valor);
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="relative inline-grid place-items-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="-rotate-90" aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--ds-surface-2)" strokeWidth={espessura} />
        <circle
          className="ds-anel"
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke="var(--ds-destaque)"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums text-[var(--ds-texto)]">{children ?? `${Math.round(v * 100)}%`}</span>
    </div>
  );
}

const PALETA = ["var(--ds-destaque)", "var(--ds-ok)", "var(--ds-destaque-2)", "var(--ds-erro)", "var(--ds-texto-2)"];

/** Gráfico circular (rosca) em SVG, com legenda textual (nunca só cor). */
export function GraficoCircular({ dados, rotulo, tamanho = 120 }: { dados: FatiaGrafico[]; rotulo: string; tamanho?: number }) {
  const fatias = fatiasDoGrafico(dados);
  const esp = 18;
  const r = (tamanho - esp) / 2;
  const c = 2 * Math.PI * r;
  return (
    <figure className="flex items-center gap-4" aria-label={rotulo}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label={rotulo} className="shrink-0 -rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--ds-surface-2)" strokeWidth={esp} />
        {fatias.map((f, i) => (
          <circle
            key={f.rotulo}
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={r}
            fill="none"
            stroke={PALETA[i % PALETA.length]}
            strokeWidth={esp}
            strokeDasharray={`${Math.max(0, f.frac * c - 2)} ${c}`}
            strokeDashoffset={-f.inicio * c}
          />
        ))}
      </svg>
      <figcaption>
        <ul className="flex flex-col gap-1 text-sm text-[var(--ds-texto-2)]">
          {fatias.map((f, i) => (
            <li key={f.rotulo} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: PALETA[i % PALETA.length] }} />
              {f.rotulo} · {Math.round(f.frac * 100)}%
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/** Barras horizontais leves (divs, sem biblioteca). Cada barra mostra o valor em texto. */
export function BarrasLeves({ dados, rotulo }: { dados: FatiaGrafico[]; rotulo: string }) {
  const max = Math.max(1, ...dados.map((d) => (Number.isFinite(d.valor) ? d.valor : 0)));
  return (
    <ul aria-label={rotulo} className="flex flex-col gap-2">
      {dados.map((d) => (
        <li key={d.rotulo} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm text-[var(--ds-texto-2)]">
            <span className="truncate">{d.rotulo}</span>
            <span className="tabular-nums">{d.valor}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--ds-surface-2)]">
            <div className="ds-barra h-full rounded-full bg-[var(--ds-destaque)]" style={{ width: `${limitar(d.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Linha de estatística: rótulo à esquerda, valor em destaque à direita. */
export function LinhaEstatistica({ rotulo, valor, apoio }: { rotulo: string; valor: ReactNode; apoio?: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--ds-borda)] py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[var(--ds-texto)]">{rotulo}</p>
        {apoio && <p className="text-sm text-[var(--ds-texto-2)]">{apoio}</p>}
      </div>
      <p className="shrink-0 text-lg font-bold tabular-nums text-[var(--ds-texto)]">{valor}</p>
    </div>
  );
}

/** Estado vazio: ilustração leve (gramofone/disco em SVG), frase curta e uma chamada para ação. */
export function EstadoVazio({ titulo, texto, acao, ilustracao }: { titulo: string; texto?: string; acao?: ReactNode; ilustracao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--ds-raio)] bg-[var(--ds-surface)] px-6 py-8 text-center">
      <div aria-hidden="true" className="text-[var(--ds-destaque)]">
        {ilustracao ?? (
          <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
            <circle cx="44" cy="44" r="40" stroke="currentColor" strokeWidth="3" opacity="0.5" />
            <circle cx="44" cy="44" r="26" stroke="currentColor" strokeWidth="2" opacity="0.35" />
            <circle cx="44" cy="44" r="9" fill="currentColor" />
          </svg>
        )}
      </div>
      <p className="text-lg font-semibold text-balance text-[var(--ds-texto)]">{titulo}</p>
      {texto && <p className="text-pretty text-[var(--ds-texto-2)]">{texto}</p>}
      {acao}
    </div>
  );
}

/** Esqueleto de carregamento (aria-hidden; o contêiner deve ter aria-busy). */
export function Esqueleto({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`ds-esqueleto rounded-md ${className}`} />;
}
