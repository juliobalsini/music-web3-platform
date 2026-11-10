import { NextResponse, type NextRequest } from "next/server";

// Alvo do compartilhamento quando o service worker ainda não está ativo: o arquivo não é retido
// (o servidor não recebe áudio pela Vercel); o usuário é levado ao envio com um aviso.
export function POST(request: NextRequest) {
  return NextResponse.redirect(new URL("/enviar?compartilhado=0", request.nextUrl.origin), 303);
}
