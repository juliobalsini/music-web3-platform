import { connection } from "next/server";

// Rota de saúde usada pelo gate para confirmar que a prévia serve o commit do PR.
// Sempre dinâmica e sem acesso ao banco.
export async function GET() {
  await connection();
  return Response.json(
    { ok: true, commit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
