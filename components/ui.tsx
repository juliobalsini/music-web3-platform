import { CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";

/** Classes compartilhadas (DESIGN.md): campo, botão primário, linha de lista. */
export const campo =
  "min-h-12 w-full rounded-lg bg-white/10 px-4 py-3 text-white placeholder:text-white/60";
export const botao =
  "foco-claro inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand to-brand-2 px-5 py-3 font-semibold text-night-900 transition-transform duration-200 ease-out hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100";
export const linha = "flex items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-3";

/** Mensagem curta com ícone: erro (`alert`) ou informação (`status`). Nunca só cor. */
export function Mensagem({ tipo = "info", children }: { tipo?: "erro" | "info"; children: ReactNode }) {
  const Icone = tipo === "erro" ? CircleAlert : Info;
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className="flex items-start gap-2 text-sm text-brand-2">
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Contêiner padrão de tela de tarefa. */
export function Tela({ children, centro = false }: { children: ReactNode; centro?: boolean }) {
  return (
    <main
      className={`mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10 sm:py-16 ${centro ? "justify-center" : ""}`}
    >
      {children}
    </main>
  );
}
