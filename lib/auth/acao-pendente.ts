/**
 * Ação pendente do login contextual (issue #120, fatia 2): o visitante toca em "Seguir", entra e, de volta à
 * mesma tela, a ação é concluída sozinha. Fica no `localStorage` (sobrevive ao redirecionamento do Google e ao
 * link aberto em outra aba) por pouco tempo. É só um lembrete do cliente: quem decide é o servidor.
 */
export const ACAO_PENDENTE_CHAVE = "radioon_acao_pendente";
export const ACAO_PENDENTE_VALIDADE_MS = 15 * 60 * 1000;

export type AcaoPendente = { acao: string; destino: string; em: number };

/** Ids aceitos: `tipo:valor` curto (ex.: `seguir:<uuid>`). */
export function acaoValida(acao: unknown): acao is string {
  return typeof acao === "string" && /^[a-z]+:[\w-]{1,80}$/.test(acao);
}

export function serializarAcao(acao: string, destino: string, agora: number): string | null {
  if (!acaoValida(acao)) return null;
  return JSON.stringify({ acao, destino, em: agora } satisfies AcaoPendente);
}

/** Lê a ação guardada; devolve `null` se inválida ou vencida. */
export function lerAcao(bruto: string | null, agora: number): AcaoPendente | null {
  if (!bruto) return null;
  try {
    const v = JSON.parse(bruto) as Partial<AcaoPendente>;
    if (!acaoValida(v.acao) || typeof v.destino !== "string" || typeof v.em !== "number") return null;
    if (agora - v.em > ACAO_PENDENTE_VALIDADE_MS || v.em > agora + 60_000) return null;
    return { acao: v.acao, destino: v.destino, em: v.em };
  } catch {
    return null;
  }
}

/** A ação vale para esta tela? Compara só o caminho (a busca pode mudar ao voltar). */
export function acaoDaTela(p: AcaoPendente, acao: string, caminho: string): boolean {
  return p.acao === acao && p.destino.split(/[?#]/)[0] === caminho;
}
