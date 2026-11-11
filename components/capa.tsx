"use client";
/* eslint-disable @next/next/no-img-element -- capas vêm do bucket por URL assinada; sem otimizador (cota). */

import { useId, useState } from "react";

import { capaGerada, type CapaGerada, type Glifo } from "@/lib/radio/rules";

function Forma({ glifo }: { glifo: Glifo }) {
  switch (glifo) {
    case "onda":
      return <path d="M-26 0 q13 -22 26 0 t26 0" fill="none" strokeWidth="5" strokeLinecap="round" />;
    case "disco":
      return (
        <>
          <circle r="22" />
          <circle r="7" fill="black" fillOpacity="0.45" />
        </>
      );
    case "estrela":
      return <path d="M0 -24 L6 -7 L24 -7 L10 4 L15 22 L0 11 L-15 22 L-10 4 L-24 -7 L-6 -7 Z" />;
    case "triangulo":
      return <path d="M0 -24 L24 18 L-24 18 Z" />;
    case "arco":
      return <path d="M-24 14 a24 24 0 0 1 48 0" fill="none" strokeWidth="8" strokeLinecap="round" />;
    default:
      return <path d="M0 -26 L20 0 L0 26 L-20 0 Z" />;
  }
}

function Textura({ tipo, id }: { tipo: CapaGerada["textura"]; id: string }) {
  switch (tipo) {
    case "pontos":
      return (
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="white" />
        </pattern>
      );
    case "diagonais":
      return (
        <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="2" height="7" fill="white" />
        </pattern>
      );
    case "ondas":
      return (
        <pattern id={id} width="16" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 4 q4 -4 8 0 t8 0" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      );
    default:
      return (
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="1.4" fill="white" />
        </pattern>
      );
  }
}

/** Arte gerada (SVG): gradiente do par de cores, textura, anéis e glifo; tudo derivado do título. */
export function CapaArte({ title, className = "", redonda = false }: { title: string; className?: string; redonda?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const c = capaGerada(title);
  const rad = 40 + c.aneis;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      data-testid="capa-gerada"
      data-glifo={c.glifo}
      data-textura={c.textura}
      className={`${className} ${redonda ? "rounded-full" : "rounded-md"} shrink-0 select-none overflow-hidden`}
    >
      <defs>
        <linearGradient id={`g${uid}`} gradientTransform={`rotate(${c.angulo} .5 .5)`}>
          <stop offset="0" stopColor={c.cor} />
          <stop offset="1" stopColor={c.cor2} />
        </linearGradient>
        <Textura tipo={c.textura} id={`t${uid}`} />
      </defs>
      <rect width="100" height="100" fill={`url(#g${uid})`} />
      <rect width="100" height="100" fill={`url(#t${uid})`} opacity="0.13" />
      {Array.from({ length: c.aneis }, (_, i) => (
        <circle key={i} cx="50" cy="50" r={rad - i * 9} fill="none" stroke="white" strokeOpacity="0.16" strokeWidth="1.2" />
      ))}
      <g transform={`translate(50 50) rotate(${c.rotacao})`} fill="white" stroke="white" fillOpacity="0.88" strokeOpacity="0.88">
        <Forma glifo={c.glifo} />
      </g>
    </svg>
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
