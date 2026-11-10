import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";

// Renova a sessão do Supabase (cookies) a cada navegação de página.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  } catch {
    // Sem variáveis do Supabase (testes/prévias): segue sem sessão.
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|brand).*)"],
};
