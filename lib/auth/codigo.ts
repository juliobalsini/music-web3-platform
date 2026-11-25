/**
 * Login por código de 6 dígitos (OTP de e-mail; issue #120, DECISIONS 102).
 *
 * Ligado desde 2026-11-25 (SMTP e modelos com `{{ .Token }}` configurados pelo Julio, item 6 da Sessão manual).
 * Voltar ao link mágico sem deploy de código: `NEXT_PUBLIC_LOGIN_CODIGO=0` na Vercel (sobrescrita).
 */
export const LOGIN_CODIGO_POR_PADRAO = true;

/** Cookie de teste (E2E): liga o código na tela; fora de produção, o servidor também simula o envio. */
export const COOKIE_TESTE_CODIGO = "radioon_teste_codigo";

/** Códigos aceitos pelo modo de teste (só fora de produção, sem Supabase). */
export const CODIGO_TESTE_OK = "123456";
export const CODIGO_TESTE_EXPIRADO = "000000";

/** Segundos até liberar "Reenviar código". */
export const REENVIO_SEG = 60;

export function loginPorCodigoLigado(valor = process.env.NEXT_PUBLIC_LOGIN_CODIGO): boolean {
  if (valor === "1") return true;
  if (valor === "0") return false;
  return LOGIN_CODIGO_POR_PADRAO;
}

/** Mantém só dígitos (aceita colar "123 456" ou "Código: 123-456"), no máx. 6. */
export function normalizarCodigo(valor: unknown): string {
  return typeof valor === "string" ? valor.replace(/\D/g, "").slice(0, 6) : "";
}

export function codigoCompleto(valor: unknown): boolean {
  return normalizarCodigo(valor).length === 6;
}

/** Segundos que faltam para poder reenviar (0 = já pode). */
export function segundosParaReenviar(enviadoEm: number, agora: number, espera = REENVIO_SEG): number {
  return Math.max(0, Math.ceil((enviadoEm + espera * 1000 - agora) / 1000));
}

/** Tipo de verificação: sessão anônima vira conta por troca de e-mail (`email_change`); o resto é `email`. */
export type TipoCodigo = "email" | "email_change";

export function parseTipoCodigo(valor: unknown): TipoCodigo {
  return valor === "email_change" ? "email_change" : "email";
}

/** Mensagem curta para o erro do `verifyOtp` (o Supabase usa o mesmo erro para expirado e inválido). */
export function mensagemErroCodigo(erro: { code?: string; message?: string; status?: number } | null | undefined): string {
  const code = erro?.code ?? "";
  const msg = (erro?.message ?? "").toLowerCase();
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || erro?.status === 429) {
    return "Muitas tentativas. Espere um minuto e tente de novo.";
  }
  if (code === "otp_expired" || msg.includes("expired")) return "Código errado ou expirado. Confira o último e-mail ou peça outro.";
  return "Código errado. Confira os 6 dígitos do último e-mail.";
}
