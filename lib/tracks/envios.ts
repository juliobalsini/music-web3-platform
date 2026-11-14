// Regras puras dos envios (testáveis).

export type DecisaoTravada = { acao: "publicar" } | { acao: "falhar"; motivo: string } | { acao: "aguardar" };

/** `existe`: o arquivo está no bucket? (null = não deu para saber). */
export function decidirTravada(existe: boolean | null, direitos: boolean): DecisaoTravada {
  if (existe === null) return { acao: "aguardar" };
  if (!existe) return { acao: "falhar", motivo: "O arquivo não chegou ao servidor (envio interrompido). Envie de novo." };
  if (!direitos) return { acao: "falhar", motivo: "Direitos da faixa não confirmados." };
  return { acao: "publicar" };
}

export function rotuloStatus(status: string, motivo?: string | null): string | undefined {
  if (status === "published") return undefined;
  if (status === "failed") return motivo ? `Falhou: ${motivo}` : "Falhou";
  return "Em processamento";
}
