import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicKey, getSupabaseUrl, retentarConsultas } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a chave pública + sessão do usuário via cookies, portanto respeita RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = getSupabaseUrl();
  return createServerClient(url, getSupabasePublicKey(), {
    db: { retry: retentarConsultas(url) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component: cookies são somente leitura.
          // A renovação da sessão deve ocorrer em proxy/Route Handler.
        }
      },
    },
  });
}
