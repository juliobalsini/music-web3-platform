import Link from "next/link";

import { Logo } from "@/components/logo";

/** Logo pequeno no cabeçalho; leva à Rádio. */
export function LogoCabecalho() {
  return (
    <Link href="/" aria-label="radioOn, início" className="inline-flex min-h-11 items-center rounded">
      <Logo className="h-12" />
    </Link>
  );
}
