/** Valor de variável de ambiente sem espaços/quebras de linha nas pontas; vazio vira undefined. */
export function limpar(valor: string | undefined | null): string | undefined {
  const v = valor?.trim();
  return v ? v : undefined;
}
