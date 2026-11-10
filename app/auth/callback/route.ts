import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { NEXT_COOKIE, safeNext } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

// Destino do magic link: troca o código/token por sessão (cookies).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next") ?? request.cookies.get(NEXT_COOKIE)?.value, "/");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  try {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type
        ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        : { error: new Error("sem código") };
    if (!error) {
      const resposta = NextResponse.redirect(new URL(next, origin));
      resposta.cookies.delete({ name: NEXT_COOKIE, path: "/auth" });
      return resposta;
    }
  } catch {
    // cai no redirect de erro
  }
  return NextResponse.redirect(new URL("/login?erro=1", origin));
}
