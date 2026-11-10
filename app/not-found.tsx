import { Home } from "lucide-react";
import Link from "next/link";

import { botao, Tela } from "@/components/ui";

export const metadata = { title: "Não encontrada · radioOn" };

export default function NotFound() {
  return (
    <Tela centro>
      <div className="flex flex-col gap-1">
        <p className="text-6xl font-bold text-brand tabular-nums">404</p>
        <h1 className="text-xl font-semibold text-balance">Página não encontrada</h1>
        <p className="text-white/70">O endereço mudou ou nunca existiu.</p>
      </div>
      <Link href="/" className={`${botao} self-start`}>
        <Home className="size-5" aria-hidden="true" /> Voltar ao início
      </Link>
    </Tela>
  );
}
