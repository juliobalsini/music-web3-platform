import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicKey, getSupabaseUrl } from "./env";

/** Cliente Supabase para Client Components (usa apenas a chave pública). */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey());
}
