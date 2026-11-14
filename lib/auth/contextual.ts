import { safeNext } from "./roles.ts";

/** Texto do painel quando a ação não diz o motivo. */
export function motivoPadrao(): string {
  return "Isto precisa de uma conta. É grátis e leva segundos.";
}

/** Caminho interno da tela atual (com busca), para voltar a ela depois de entrar. Nunca devolve URL externa. */
export function destinoAtual(local: { pathname: string; search?: string }): string {
  return safeNext(`${local.pathname}${local.search ?? ""}`, "/");
}
