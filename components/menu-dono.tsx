import { MenuEnvio } from "@/components/envios";
import type { TipoEnvio } from "@/lib/envios/rules";
import { getSessionRole } from "@/lib/session";

/** ⋯ (Editar/Apagar) só para o dono do item; para os demais, nada. O servidor confere de novo ao apagar. */
export async function MenuDono({ tipo, id, titulo, donoId }: { tipo: TipoEnvio; id: string; titulo: string; donoId: string }) {
  const sessao = await getSessionRole().catch(() => null);
  if (!sessao || sessao.userId !== donoId) return null;
  return <MenuEnvio tipo={tipo} id={id} titulo={titulo} depois="/meus-envios" />;
}
