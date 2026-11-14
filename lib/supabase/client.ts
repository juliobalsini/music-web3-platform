import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicKey, getSupabaseUrl, retentarConsultas } from "./env";

/** Cliente Supabase para Client Components (usa apenas a chave pública). */
export function createClient() {
  const url = getSupabaseUrl();
  return createBrowserClient(url, getSupabasePublicKey(), { db: { retry: retentarConsultas(url) } });
}
