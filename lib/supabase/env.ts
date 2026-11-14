/**
 * Resolve as variáveis do Supabase aceitando tanto as chaves novas
 * (publishable / secret) quanto as legadas (anon / service_role).
 *
 * Chaves novas têm prioridade quando ambas existirem.
 */

import { limpar } from "../env.ts";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", limpar(process.env.NEXT_PUBLIC_SUPABASE_URL));
}

/** Chave pública (segura para o browser; respeita RLS). */
export function getSupabasePublicKey(): string {
  // Acesso literal a process.env.NEXT_PUBLIC_* para o Next inlinear no bundle do client.
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY",
    limpar(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
      limpar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/**
 * Retentar consultas só quando o host pode existir. O supabase-js repete cada GET com falha de rede
 * (1 s + 2 s + 4 s); com o host reservado `.invalid` (RFC 2606, usado no E2E do Dependabot) nada
 * nunca responde, e as repetições só deixavam cada página ~7 s mais lenta (timeouts no E2E).
 */
export function retentarConsultas(url: string): boolean {
  try {
    return !/\.invalid$/i.test(new URL(url).hostname);
  } catch {
    return true;
  }
}
