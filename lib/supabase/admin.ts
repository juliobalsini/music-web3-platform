import "server-only";

import { createClient } from "@supabase/supabase-js";

import { limpar } from "../env";
import { getSupabaseUrl, retentarConsultas } from "./env";

/**
 * Cliente administrativo (ignora RLS). SOMENTE no servidor.
 * Aceita a chave nova (SUPABASE_SECRET_KEY) ou a legada (SUPABASE_SERVICE_ROLE_KEY).
 */
export function createAdminClient() {
  const key = limpar(process.env.SUPABASE_SECRET_KEY) ?? limpar(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) {
    throw new Error(
      "Variável de ambiente ausente: SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const url = getSupabaseUrl();
  return createClient(url, key, {
    db: { retry: retentarConsultas(url) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
