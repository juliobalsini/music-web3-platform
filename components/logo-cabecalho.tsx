"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";

/** Logo do cabeçalho: navegação client-side com prefetch; na Home, tocar leva ao topo. */
export function LogoCabecalho() {
  const caminho = usePathname();
  return (
    <Link
      href="/"
      prefetch
      aria-label="radioOn, início"
      className="inline-flex min-h-11 items-center rounded"
      onClick={(e) => {
        if (caminho === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    >
      <Logo className="h-[62px] w-auto" />
    </Link>
  );
}
