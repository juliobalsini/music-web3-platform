import { ouvintesNoAr } from "@/lib/radio/queries";
import { getSessaoAny } from "@/lib/session";

// Contagem do selo "No ar · N ouvindo" (inclui quem pergunta). Só número: nenhum id sai daqui.
export async function GET() {
  let eu: string | null = null;
  try {
    eu = (await getSessaoAny())?.userId ?? null;
  } catch {
    /* sem sessão: conta como mais um ouvinte */
  }
  return Response.json({ n: await ouvintesNoAr(eu) }, { headers: { "Cache-Control": "no-store" } });
}
