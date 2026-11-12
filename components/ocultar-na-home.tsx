"use client";

import { usePathname } from "next/navigation";

/** A Home tem o próprio cabeçalho (logo, selo "No ar" e Entrar na mesma linha); nas outras telas vale o global. */
export function OcultarNaHome({ children }: { children: React.ReactNode }) {
  return usePathname() === "/" ? null : children;
}
