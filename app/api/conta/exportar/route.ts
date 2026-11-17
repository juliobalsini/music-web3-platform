import { FONTES_EXPORTACAO, MAX_LINHAS_EXPORTACAO, nomeArquivoExportacao } from "@/lib/conta/exportar";
import { getSessionRole } from "@/lib/session";

const noStore = { "Cache-Control": "no-store" };

// Exportar meus dados: JSON com as linhas da própria conta. Só conta de verdade (getSessionRole);
// leitura com a sessão (RLS), nunca com service_role, e sempre filtrada pela coluna dona.
export async function GET() {
  let s;
  try {
    s = await getSessionRole();
  } catch {
    s = null;
  }
  if (!s) return Response.json({ error: "login necessário" }, { status: 401, headers: noStore });
  const { supabase, userId } = s;
  const { data: auth } = await supabase.auth.getUser();
  const lidas = await Promise.all(
    FONTES_EXPORTACAO.map(async (f) => {
      const { data, error } = await supabase.from(f.tabela).select("*").eq(f.dono, userId).limit(MAX_LINHAS_EXPORTACAO);
      return [f.chave, error ? { erro: "não foi possível ler agora" } : (data ?? [])] as const;
    }),
  );
  const agora = new Date();
  const corpo = {
    geradoEm: agora.toISOString(),
    conta: { id: userId, email: auth.user?.email ?? null, criadaEm: auth.user?.created_at ?? null },
    ...Object.fromEntries(lidas),
  };
  return new Response(JSON.stringify(corpo, null, 2), {
    headers: {
      ...noStore,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivoExportacao(agora)}"`,
    },
  });
}
