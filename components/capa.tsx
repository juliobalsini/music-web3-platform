"use client";
/* eslint-disable @next/next/no-img-element -- capas vêm do bucket por URL assinada; sem otimizador (cota). */

import { useState } from "react";

import { capaGerada } from "@/lib/radio/rules";

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
  const { fundo, letra, cor2 } = capaGerada(title);
  return (
    <span
      aria-hidden="true"
      style={{ background: fundo, color: cor2 }}
      className={`${className} ${forma} flex shrink-0 select-none items-center justify-center overflow-hidden font-bold`}
    >
      <span className="text-[1.6em] leading-none opacity-90">{letra}</span>
    </span>
  );
}
