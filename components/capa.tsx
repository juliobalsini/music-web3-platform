"use client";
/* eslint-disable @next/next/no-img-element -- capas vêm do bucket por URL assinada; sem otimizador (cota). */

import { useId, useState } from "react";

import { capaSvgInterno } from "@/lib/radio/capa-svg";
import { capaGerada } from "@/lib/radio/rules";

/** Arte gerada (SVG): gradiente do par de cores, textura, anéis e glifo; tudo derivado do título. */
export function CapaArte({ title, className = "", redonda = false }: { title: string; className?: string; redonda?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const c = capaGerada(title);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      data-testid="capa-gerada"
      data-glifo={c.glifo}
      data-textura={c.textura}
      className={`${className} ${redonda ? "rounded-full" : "rounded-md"} shrink-0 select-none overflow-hidden`}
      // Markup 100% derivado do hash do título (números e cores), sem texto do usuário.
      dangerouslySetInnerHTML={{ __html: capaSvgInterno(title, uid) }}
    />
  );
}

/** Capa da faixa: imagem do bucket ou arte gerada a partir do título (determinística). */
export function Capa({
  id,
  title,
  hasCover,
  className = "size-12",
  redonda = false,
}: {
  id: string;
  title: string;
  hasCover: boolean;
  className?: string;
  redonda?: boolean;
}) {
  const [falhou, setFalhou] = useState(false);
  const forma = redonda ? "rounded-full" : "rounded-md";
  if (hasCover && !falhou) {
    return (
      <img
        src={`/api/tracks/${id}/capa`}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFalhou(true)}
        className={`${className} ${forma} shrink-0 bg-night-800 object-cover`}
      />
    );
  }
  return <CapaArte title={title} className={className} redonda={redonda} />;
}
