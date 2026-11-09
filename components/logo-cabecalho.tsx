"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";

/** Logo pequeno que leva à home. Na própria home o logo grande já está na página. */
export function LogoCabecalho() {
  if (usePathname() === "/") return <span />;
  return (
    <Link href="/" aria-label="radioOn, início" className="rounded text-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
      <Logo />
    </Link>
  );
}
