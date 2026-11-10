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
